// NMH Bản tin Công nghệ & AI — Worker hỏi đáp giọng nói (app riêng, tách khỏi Ngố).
// Pipeline hằng ngày (GitHub Actions) ghi tin vào D1; Worker chỉ đọc tin, trả lời câu hỏi, đọc giọng.
// Thiết kế cho gói Workers Free (10 ms CPU): không giải mã âm thanh trên Worker, không parse XML trên Worker.
import PAGE from './page.html';

const MODEL = 'gpt-6-luna';
const PRICE = { in: 0.10, cached: 0.01, out: 0.50 };   // USD / 1M token, theo code Ngố; đối chiếu hóa đơn sau 1 tuần
const WEB_SEARCH_CALL_USD = 0.01;
// Chirp 3 HD: miễn phí 1 triệu ký tự/tháng, sau đó 30 USD/1 triệu (cloud.google.com/text-to-speech/pricing, kiểm tra 18/11/2026).
// Hạn mức miễn phí tính theo tài khoản Google Cloud, DÙNG CHUNG với Ngố/Ngáo (cùng khóa ngao-tts) nên Worker không biết tổng thật:
// chỉ đếm ký tự; phí USD chỉ tính phần vượt hạn mức của riêng app này.
const TTS_USD_PER_CHAR = 30 / 1e6;
const TTS_FREE_CHARS = 1e6;
const STYLES = {
  danh_da: 'Đanh đá: nhân vật nhí lanh lợi, hay cà khịa hóm hỉnh, xưng tao gọi người dùng mày. Không tục, không xúc phạm.',
  chem_gio: 'Chém gió: nhân vật nhí nghịch ngợm, dí dỏm và thông minh, xưng tôi gọi người dùng anh.',
  nghiem_tuc: 'Nghiêm túc: trợ lý giọng nói trưởng thành, điềm đạm, lịch sự, xưng tôi gọi người dùng anh, trả lời chính xác và súc tích.',
};
const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const json = (d, s = 200, h = {}) => new Response(JSON.stringify(d), { status: s, headers: { ...HEADERS, ...h } });
const fail = (m, s = 400) => json({ error: m }, s);
const enc = new TextEncoder();
const vnDay = (t = Date.now()) => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);

// ---------- Xác thực Google (cùng cách Ngố V3) ----------
const b64url = b => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const un64 = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)), c => c.charCodeAt(0));
let jwks = null, jwksUntil = 0;
const sha = async raw => [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(raw)))].map(x => x.toString(16).padStart(2, '0')).join('');
const clientId = env => /^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/.test(String(env.GOOGLE_CLIENT_ID || '')) ? env.GOOGLE_CLIENT_ID : '';
// Quản trị viên: ADMIN_EMAILS; nếu chưa đặt thì là email đầu tiên trong ALLOWED_EMAILS (chủ app).
const emailList = v => String(v || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
const isAdmin = (env, email) => (emailList(env.ADMIN_EMAILS).length ? emailList(env.ADMIN_EMAILS) : emailList(env.ALLOWED_EMAILS).slice(0, 1)).includes(String(email || '').toLowerCase());
const allowed = (env, email) => String(env.ALLOWED_EMAILS || '').toLowerCase().split(/[,\s]+/).filter(Boolean).includes(String(email || '').toLowerCase());

export async function verifyGoogle(jwt, client, fetchImpl = fetch) {
  if (typeof jwt !== 'string' || jwt.length > 12000) throw Error('Google token không hợp lệ');
  const p = jwt.split('.'); if (p.length !== 3) throw Error('Google token không hợp lệ');
  const dec = new TextDecoder('utf-8', { fatal: true });
  let head, pl;
  try { head = JSON.parse(dec.decode(un64(p[0]))); pl = JSON.parse(dec.decode(un64(p[1]))); } catch { throw Error('Google token không hợp lệ'); }
  const now = Date.now() / 1000;
  if (head.alg !== 'RS256' || !head.kid || pl.aud !== client || !['accounts.google.com', 'https://accounts.google.com'].includes(pl.iss) ||
      !(pl.exp > now) || pl.exp > now + 7200 || typeof pl.sub !== 'string' || pl.email_verified !== true) throw Error('Google ID token bị từ chối');
  if (!jwks || Date.now() > jwksUntil) {
    const r = await fetchImpl('https://www.googleapis.com/oauth2/v3/certs');
    if (!r.ok) throw Error('Không kiểm tra được chữ ký Google');
    jwks = (await r.json()).keys; jwksUntil = Date.now() + 300000;
  }
  const jwk = (jwks || []).find(k => k.kid === head.kid && k.kty === 'RSA');
  if (!jwk) throw Error('Không tìm thấy khóa ký Google');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key, un64(p[2]), enc.encode(p[0] + '.' + p[1]))) throw Error('Chữ ký Google không hợp lệ');
  return { sub: pl.sub, email: String(pl.email || '').slice(0, 200), name: String(pl.name || '').slice(0, 100) };
}
const cookie = (v, age) => `__Host-nmhnews=${v}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
async function currentUser(req, env) {
  const m = (req.headers.get('cookie') || '').match(/(?:^|;\s*)__Host-nmhnews=([A-Za-z0-9_-]{43})/);
  if (!m) return null;
  const row = await env.DB.prepare('SELECT u.id,u.email,u.name,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?').bind(await sha(m[1])).first();
  if (!row || row.expires_at < Date.now() || !allowed(env, row.email)) return null;
  return row;
}

// ---------- Dữ liệu tin ----------
async function catalog(env, uid) {
  const [src, cat, pref] = await Promise.all([
    env.DB.prepare('SELECT id,name,lang,type,is_default,created_by,last_ok_at,last_error FROM sources WHERE enabled=1 AND admin_disabled=0 AND (is_default=1 OR created_by=?) ORDER BY is_default DESC,name').bind(uid).all(),
    env.DB.prepare("SELECT value FROM settings WHERE key='categories'").first(),
    env.DB.prepare('SELECT sources,categories FROM user_prefs WHERE user_id=?').bind(uid).first(),
  ]);
  const categories = cat ? JSON.parse(cat.value) : [];
  const sources = src.results || [];
  const chosenSources = pref?.sources ? JSON.parse(pref.sources) : sources.filter(s => s.is_default).map(s => s.id);
  const chosenCategories = pref?.categories ? JSON.parse(pref.categories) : categories;
  return { sources, categories, chosenSources, chosenCategories };
}

export async function userArticles(env, uid, hours = 36, limit = 60) {
  const c = await catalog(env, uid);
  if (!c.chosenSources.length || !c.chosenCategories.length) return { ...c, articles: [] };
  const since = Date.now() - hours * 3600e3;
  const sq = c.chosenSources.map(() => '?').join(','), cq = c.chosenCategories.map(() => '?').join(',');
  const rows = await env.DB.prepare(
    `SELECT a.id,a.url,a.title_vi,a.summary_vi,a.category,a.importance,a.published_at,s.name AS source
     FROM articles a JOIN sources s ON s.id=a.source_id
     WHERE a.published_at>=? AND a.dup_of IS NULL AND a.summary_vi IS NOT NULL AND a.source_id IN (${sq}) AND a.category IN (${cq})
     ORDER BY a.importance DESC, a.published_at DESC LIMIT ?`).bind(since, ...c.chosenSources, ...c.chosenCategories, limit).all();
  return { ...c, articles: rows.results || [] };
}

async function addUsage(env, uid, d) {
  await env.DB.prepare(`INSERT INTO usage (day,user_id,questions,input_tokens,cached_tokens,output_tokens,web_searches,tts_chars,est_usd) VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(day,user_id) DO UPDATE SET questions=questions+excluded.questions,input_tokens=input_tokens+excluded.input_tokens,
    cached_tokens=cached_tokens+excluded.cached_tokens,output_tokens=output_tokens+excluded.output_tokens,web_searches=web_searches+excluded.web_searches,
    tts_chars=tts_chars+excluded.tts_chars,est_usd=est_usd+excluded.est_usd`)
    .bind(vnDay(), uid, d.q || 0, d.in || 0, d.cached || 0, d.out || 0, d.web || 0, d.tts || 0, d.usd || 0).run();
}
async function overDailyLimit(env, uid) {
  const r = await env.DB.prepare('SELECT est_usd FROM usage WHERE day=? AND user_id=?').bind(vnDay(), uid).first();
  return (r?.est_usd || 0) >= Number(env.DAILY_USD_LIMIT || 0.3);
}

// ---------- Hỏi đáp ----------
export function buildInstructions(style, articles) {
  const list = articles.map(a => `[${a.id}] (${a.source} · ${a.category} · mức ${a.importance}) ${a.title_vi} — ${a.summary_vi}`).join('\n');
  return [
    'Bạn là trợ lý bản tin Công nghệ & AI, nói chuyện bằng giọng nói tiếng Việt với người dùng (câu trả lời sẽ được đọc thành tiếng).',
    'Phong cách: ' + (STYLES[style] || STYLES.danh_da),
    'Cách nói: tự nhiên như trò chuyện, câu ngắn, không markdown, không gạch đầu dòng, không đọc đường link. Thường 2-5 câu; khi được hỏi "hôm nay có gì" thì điểm 3-5 tin quan trọng nhất rồi hỏi người dùng muốn nghe kỹ tin nào.',
    'Nguồn sự thật chính là BẢN TIN dưới đây. Trả lời dựa trên bản tin, nêu tên nguồn khi cần. Không bịa chi tiết không có trong bản tin.',
    'Chỉ dùng web_search khi câu hỏi nằm ngoài bản tin hoặc cần chi tiết bản tin không có; khi dùng thì nói rõ là thông tin tra thêm trên mạng.',
    'Nếu người dùng hỏi tiếp về một tin, hiểu theo ngữ cảnh hội thoại.',
    '',
    `BẢN TIN (${articles.length} bài, xếp theo mức quan trọng):`,
    list || '(Chưa có bài nào phù hợp với lựa chọn nguồn/chủ đề của người dùng.)',
  ].join('\n');
}

export async function ask(env, user, body, fetchImpl = fetch) {
  const msgs = (Array.isArray(body?.messages) ? body.messages : []).slice(-10)
    .filter(m => ['user', 'assistant'].includes(m?.role) && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!msgs.length || msgs.at(-1).role !== 'user') return fail('Thiếu câu hỏi');
  if (!env.OPENAI_API_KEY) return fail('Chưa cấu hình OPENAI_API_KEY trên Worker', 503);
  if (await overDailyLimit(env, user.id)) return fail('Đã chạm hạn mức chi phí hôm nay', 429);
  const { articles } = await userArticles(env, user.id);
  const style = Object.hasOwn(STYLES, body?.style) ? body.style : 'danh_da';
  const req = {
    model: MODEL, reasoning: { effort: 'low' }, instructions: buildInstructions(style, articles), input: msgs,
    tools: [{ type: 'web_search', search_context_size: 'low' }], max_tool_calls: 1, max_output_tokens: 1200, store: false,
  };
  const r = await fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: 'Bearer ' + env.OPENAI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(req),
    signal: AbortSignal.timeout(45000),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    return fail('OpenAI HTTP ' + r.status + (d?.error?.code ? ' ' + d.error.code : ''), 502);
  }
  const res = await r.json();
  let answer = '', web = 0; const sources = [];
  for (const o of res.output || []) {
    if (o.type === 'web_search_call') web++;
    if (o.type === 'message') for (const c of o.content || []) {
      if (c.type === 'output_text') {
        // Trích dẫn web nằm trong đoạn [start,end) của văn bản: cắt bỏ để không đọc tên miền thành tiếng, giữ link ở danh sách nguồn.
        let t = c.text || '';
        const cites = (c.annotations || []).filter(a => a.type === 'url_citation' && a.url);
        for (const a of cites) sources.push({ url: a.url, title: a.title || a.url });
        for (const a of [...cites].filter(a => Number.isInteger(a.start_index) && a.end_index > a.start_index).sort((x, y) => y.start_index - x.start_index))
          t = t.slice(0, a.start_index) + t.slice(a.end_index);
        answer += t;
      }
    }
  }
  answer = answer.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1').replace(/\(?\[\d+\]\)?/g, '').replace(/[*#_`]+/g, '').replace(/[ \t]{2,}/g, ' ').replace(/ ([.,!?])/g, '$1').trim();
  const u = res.usage || {}, cached = u.input_tokens_details?.cached_tokens || 0;
  const usd = ((u.input_tokens - cached) * PRICE.in + cached * PRICE.cached + u.output_tokens * PRICE.out) / 1e6 + web * WEB_SEARCH_CALL_USD;
  await addUsage(env, user.id, { q: 1, in: u.input_tokens || 0, cached, out: u.output_tokens || 0, web, usd });
  return json({ answer: answer || 'Tôi chưa có câu trả lời, anh hỏi lại giúp tôi nhé.', sources: sources.slice(0, 5), articles: articles.length,
    usage: { input: u.input_tokens, cached, output: u.output_tokens, web, usd: Math.round(usd * 1e6) / 1e6 } });
}

// ---------- Đọc giọng: Google Chirp3-HD Leda (như Ngố). Trả base64 để trình duyệt tự giải mã (tiết kiệm CPU Worker). ----------
export function ttsText(raw) {
  return String(raw || '').replace(/(\d)\s*[*×]\s*(\d)/g, '$1 nhân $2').replace(/[*#_~`|]+/g, ' ').replace(/\s+/g, ' ').trim();
}
async function tts(env, user, body, fetchImpl = fetch) {
  const text = ttsText(body?.text);
  if (!text || text.length > 500) return fail('Văn bản đọc không hợp lệ');
  if (!env.GOOGLE_TTS_KEY) return fail('Chưa cấu hình GOOGLE_TTS_KEY trên Worker', 503);
  const playful = body?.style !== 'nghiem_tuc';
  const r = await fetchImpl('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(env.GOOGLE_TTS_KEY), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ input: { text }, voice: { languageCode: 'vi-VN', name: env.TTS_VOICE || 'vi-VN-Chirp3-HD-Leda' },
      audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 24000, speakingRate: playful ? 0.756 : 1 } }),
  });
  if (!r.ok) { const d = await r.json().catch(() => null); return fail('Google TTS HTTP ' + r.status + ' ' + String(d?.error?.message || '').slice(0, 100), 502); }
  const m = await env.DB.prepare('SELECT COALESCE(SUM(tts_chars),0) n FROM usage WHERE day LIKE ?').bind(vnDay().slice(0, 7) + '%').first();
  const over = Math.max(0, (m?.n || 0) + text.length - TTS_FREE_CHARS) - Math.max(0, (m?.n || 0) - TTS_FREE_CHARS);
  await addUsage(env, user.id, { tts: text.length, usd: over * TTS_USD_PER_CHAR });
  // Chuyển thẳng JSON {audioContent} của Google cho trình duyệt, không parse/stringify ~100 KB base64 trên Worker (tiết kiệm CPU).
  return new Response(r.body, { status: 200, headers: { ...HEADERS, 'x-playback-rate': playful ? '1.455' : '1', 'x-tts-chars': String(text.length) } });
}

// ---------- Nguồn riêng của người dùng ----------
async function addSource(env, user, body, fetchImpl = fetch) {
  let url;
  try { url = new URL(String(body?.url || '').trim()); } catch { return fail('Đường dẫn không hợp lệ'); }
  if (url.protocol !== 'https:') return fail('Chỉ nhận đường dẫn https');
  const name = String(body?.name || url.hostname).trim().slice(0, 60);
  const r = await fetchImpl(url.toString(), { headers: { 'User-Agent': 'NMH-NewsFeed/0.1', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (!r || !r.ok) return fail('Không đọc được nguồn (HTTP ' + (r?.status || 'lỗi mạng') + ')');
  const head = (await r.text()).slice(0, 20000);
  if (!/<(rss|feed)[\s>]/i.test(head) || !/<(item|entry)[\s>]/i.test(head)) return fail('Đường dẫn không phải RSS/Atom có bài viết');
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM sources WHERE created_by=?').bind(user.id).first();
  if ((count?.n || 0) >= Number(env.MAX_CUSTOM_SOURCES || 10)) return fail('Đã đủ số nguồn riêng tối đa');
  const id = 'u-' + (await sha(user.id + url.toString())).slice(0, 12);
  await env.DB.prepare('INSERT INTO sources (id,name,lang,type,urls,is_default,enabled,created_by,created_at) VALUES (?,?,?,?,?,0,1,?,?) ON CONFLICT(id) DO UPDATE SET enabled=1,name=excluded.name')
    .bind(id, name, 'vi', 'rss', JSON.stringify([url.toString()]), user.id, Date.now()).run();
  const c = await catalog(env, user.id);
  if (!c.chosenSources.includes(id)) await savePrefs(env, user.id, [...c.chosenSources, id], c.chosenCategories);
  return json({ ok: true, id, name, note: 'Nguồn sẽ có bài từ lượt cập nhật buổi sáng kế tiếp.' });
}
async function savePrefs(env, uid, sources, categories) {
  await env.DB.prepare('INSERT INTO user_prefs (user_id,sources,categories,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET sources=excluded.sources,categories=excluded.categories,updated_at=excluded.updated_at')
    .bind(uid, JSON.stringify(sources), JSON.stringify(categories), Date.now()).run();
}


// ---------- Quản trị ----------
const VN_DAY_SQL = col => `date(${col}/1000 + 7*3600, 'unixepoch')`;
export async function adminOverview(env) {
  const month = vnDay().slice(0, 7);
  const q = (sql, ...b) => env.DB.prepare(sql).bind(...b);
  const [pipeM, qaM, days, runs, sources, counts, users] = await env.DB.batch([
    q(`SELECT COALESCE(SUM(est_usd),0) usd, COUNT(*) runs, COALESCE(SUM(new_articles),0) articles FROM runs WHERE ${VN_DAY_SQL('started_at')} LIKE ?`, month + '%'),
    q('SELECT COALESCE(SUM(est_usd),0) usd, COALESCE(SUM(questions),0) questions, COALESCE(SUM(web_searches),0) web, COALESCE(SUM(tts_chars),0) tts FROM usage WHERE day LIKE ?', month + '%'),
    q(`SELECT d, SUM(p) pipeline, SUM(a) qa FROM (SELECT ${VN_DAY_SQL('started_at')} d, est_usd p, 0 a FROM runs UNION ALL SELECT day d, 0 p, est_usd a FROM usage) GROUP BY d ORDER BY d DESC LIMIT 14`),
    q('SELECT id,started_at,finished_at,new_articles,model,input_tokens,output_tokens,est_usd,note FROM runs ORDER BY started_at DESC LIMIT 15'),
    q(`SELECT s.id,s.name,s.type,s.is_default,s.enabled,s.admin_disabled,s.last_ok_at,s.last_error,u.email created_by_email,
        (SELECT COUNT(*) FROM articles a WHERE a.source_id=s.id AND a.published_at>=?) n7d,
        (SELECT COUNT(*) FROM articles a WHERE a.source_id=s.id) total
       FROM sources s LEFT JOIN users u ON u.id=s.created_by ORDER BY s.is_default DESC, s.name`, Date.now() - 7 * 86400e3),
    q('SELECT (SELECT COUNT(*) FROM articles) articles, (SELECT COUNT(*) FROM seen_urls) seen_urls, (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM sessions WHERE expires_at>?) sessions, (SELECT COUNT(*) FROM usage) usage_rows, (SELECT MIN(published_at) FROM articles) oldest', Date.now()),
    q('SELECT u.email,u.name,u.created_at, COALESCE(SUM(g.questions),0) questions, COALESCE(SUM(g.est_usd),0) usd FROM users u LEFT JOIN usage g ON g.user_id=u.id AND g.day LIKE ? GROUP BY u.id ORDER BY usd DESC', month + '%'),
  ]);
  const p = pipeM.results[0], a = qaM.results[0];
  return {
    month, target_usd: Number(env.MONTHLY_TARGET_USD || 1),
    cost: { pipeline_usd: p.usd, qa_usd: a.usd, total_usd: p.usd + a.usd, runs: p.runs, new_articles: p.articles, questions: a.questions, web_searches: a.web, tts_chars: a.tts },
    days: days.results, runs: runs.results, sources: sources.results, db: counts.results[0], users: users.results,
    tts_free_chars: TTS_FREE_CHARS,
    config: { allowed_count: emailList(env.ALLOWED_EMAILS).length, daily_limit_usd: Number(env.DAILY_USD_LIMIT || 0.3), schedule: '00:00 giờ Việt Nam (GitHub Actions)', manual_run: !!env.GITHUB_TOKEN },
  };
}
async function adminRunNow(env, fetchImpl = fetch) {
  if (!env.GITHUB_TOKEN) return fail('Chưa bật: cần secret GITHUB_TOKEN (quyền Actions: write cho repo) trên Worker', 503);
  const r = await fetchImpl(`https://api.github.com/repos/${env.GITHUB_REPO || 'hvnm1206/TikTak-Service'}/actions/workflows/news-app-pipeline.yml/dispatches`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'nmh-news', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: 'main' }),
  });
  if (r.status !== 204) return fail('GitHub từ chối (HTTP ' + r.status + ')', 502);
  return json({ ok: true, note: 'Đã yêu cầu chạy. Thường mất 3-5 phút.' });
}

// ---------- Router ----------
export default {
  async fetch(req, env) {
    const u = new URL(req.url), method = req.method;
    if (u.pathname === '/' && method === 'GET') {
      const html = PAGE.replace('__GOOGLE_CLIENT_ID__', clientId(env));
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' } });
    }
    if (u.pathname === '/api/health') return json({ ok: true, d1: !!env.DB, openai: !!env.OPENAI_API_KEY, tts: !!env.GOOGLE_TTS_KEY, google: !!clientId(env), allowlist: String(env.ALLOWED_EMAILS || '').split(/[,\s]+/).filter(Boolean).length });
    if (!u.pathname.startsWith('/api/')) return fail('Không tìm thấy', 404);
    if (method !== 'GET' && req.headers.get('origin') !== u.origin) return fail('Origin không hợp lệ', 403);
    let body = null;
    if (method === 'POST') { const t = await req.text(); if (t.length > 40000) return fail('Dữ liệu quá lớn', 413); try { body = JSON.parse(t || '{}'); } catch { return fail('JSON không hợp lệ'); } }

    if (u.pathname === '/api/auth/google' && method === 'POST') {
      try {
        const p = await verifyGoogle(body?.credential, clientId(env));
        if (!allowed(env, p.email)) return fail('Tài khoản ' + p.email + ' chưa được cấp quyền dùng app', 403);
        await env.DB.prepare('INSERT INTO users (id,email,name,created_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,name=excluded.name').bind(p.sub, p.email, p.name, Date.now()).run();
        const raw = b64url(crypto.getRandomValues(new Uint8Array(32)));
        await env.DB.prepare('INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').bind(await sha(raw), p.sub, Date.now() + 30 * 86400e3, Date.now()).run();
        return json({ ok: true, name: p.name }, 200, { 'set-cookie': cookie(raw, 30 * 86400) });
      } catch (e) { return fail('Đăng nhập không thành công: ' + String(e?.message || e).slice(0, 100), 401); }
    }
    const user = await currentUser(req, env);
    if (u.pathname === '/api/me') return json(user ? { user: { email: user.email, name: user.name, admin: isAdmin(env, user.email) } } : { user: null });
    if (!user) return fail('Cần đăng nhập', 401);
    if (u.pathname === '/api/logout' && method === 'POST') {
      const m = (req.headers.get('cookie') || '').match(/__Host-nmhnews=([A-Za-z0-9_-]{43})/);
      if (m) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha(m[1])).run();
      return json({ ok: true }, 200, { 'set-cookie': cookie('', 0) });
    }
    if (u.pathname === '/api/today' && method === 'GET') {
      const d = await userArticles(env, user.id);
      const run = await env.DB.prepare('SELECT id,finished_at,new_articles FROM runs WHERE finished_at IS NOT NULL ORDER BY started_at DESC LIMIT 1').first();
      const usage = await env.DB.prepare('SELECT * FROM usage WHERE day=? AND user_id=?').bind(vnDay(), user.id).first();
      return json({ ...d, lastRun: run, usageToday: usage });
    }
    if (u.pathname === '/api/prefs' && method === 'POST') {
      const c = await catalog(env, user.id);
      const ids = new Set(c.sources.map(s => s.id)), cats = new Set(c.categories);
      const s = (Array.isArray(body?.sources) ? body.sources : []).filter(x => ids.has(x));
      const k = (Array.isArray(body?.categories) ? body.categories : []).filter(x => cats.has(x));
      await savePrefs(env, user.id, s, k);
      return json({ ok: true, sources: s, categories: k });
    }
    if (u.pathname.startsWith('/api/admin/')) {
      if (!isAdmin(env, user.email)) return fail('Chỉ quản trị viên', 403);
      if (u.pathname === '/api/admin/overview' && method === 'GET') return json(await adminOverview(env));
      if (u.pathname === '/api/admin/source' && method === 'POST') {
        const r = await env.DB.prepare('UPDATE sources SET admin_disabled=? WHERE id=?').bind(body?.disabled ? 1 : 0, String(body?.id || '')).run();
        return r.meta?.changes ? json({ ok: true }) : fail('Không có nguồn này', 404);
      }
      if (u.pathname === '/api/admin/run' && method === 'POST') return adminRunNow(env);
      return fail('Không tìm thấy', 404);
    }
    if (u.pathname === '/api/sources' && method === 'POST') return addSource(env, user, body);
    if (u.pathname === '/api/ask' && method === 'POST') return ask(env, user, body);
    if (u.pathname === '/api/tts' && method === 'POST') return tts(env, user, body);
    return fail('Không tìm thấy', 404);
  },
};
