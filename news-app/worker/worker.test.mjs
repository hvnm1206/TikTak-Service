// Kiểm thử Worker bản tin với D1 giả lập trên SQLite thật (node:sqlite) — chạy: node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(here, 'page.html'), 'utf8');
const src = readFileSync(join(here, 'worker.js'), 'utf8').replace("import PAGE from './page.html';", 'const PAGE = ' + JSON.stringify(page) + ';');
const tmp = mkdtempSync(join(tmpdir(), 'nmhnews-'));
writeFileSync(join(tmp, 'worker.mjs'), src);
const mod = await import(join(tmp, 'worker.mjs'));
const worker = mod.default;

class D1 {
  constructor() { this.db = new DatabaseSync(':memory:'); this.db.exec(readFileSync(join(here, '..', 'migrations', '0001_init.sql'), 'utf8')); }
  prepare(sql) {
    const db = this.db; let args = [];
    const st = { bind: (...a) => { args = a.map(x => x === undefined ? null : x); return st; },
      first: async () => db.prepare(sql).get(...args) ?? null,
      all: async () => ({ results: db.prepare(sql).all(...args) }),
      run: async () => db.prepare(sql).run(...args) };
    return st;
  }
}
const ORIGIN = 'https://nmh-news.example.workers.dev';
const TOKEN = 'A'.repeat(43);
const H = (cookie = true, extra = {}) => ({ ...(cookie ? { cookie: '__Host-nmhnews=' + TOKEN } : {}), origin: ORIGIN, ...extra });
const get = (env, path, cookie = true) => worker.fetch(new Request(ORIGIN + path, { headers: H(cookie) }), env);
const post = (env, path, body, headers = H()) => worker.fetch(new Request(ORIGIN + path, { method: 'POST', headers, body: JSON.stringify(body) }), env);

function setup(extraEnv = {}) {
  const DB = new D1(), now = Date.now(), d = DB.db;
  d.prepare("INSERT INTO settings VALUES ('categories',?,?)").run(JSON.stringify(['Mô hình & nghiên cứu AI', 'Sản phẩm & ứng dụng', 'Khác']), now);
  for (const [id, name] of [['techcrunch', 'TechCrunch'], ['genk', 'Genk']]) d.prepare('INSERT INTO sources (id,name,urls,is_default,created_at) VALUES (?,?,?,1,?)').run(id, name, '[]', now);
  const art = (url, s, cat, imp, ageH, dup = null) => d.prepare('INSERT INTO articles (url,source_id,title_orig,published_at,fetched_at,title_vi,summary_vi,category,importance,dup_of) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(url, s, 'orig', now - ageH * 3600e3, now, 'Tiêu đề ' + url, 'Tóm tắt ' + url, cat, imp, dup);
  art('a1', 'techcrunch', 'Mô hình & nghiên cứu AI', 5, 2);
  art('a2', 'genk', 'Sản phẩm & ứng dụng', 2, 3);
  art('a3', 'genk', 'Khác', 1, 1);
  art('old', 'techcrunch', 'Khác', 5, 80);
  art('dup', 'techcrunch', 'Mô hình & nghiên cứu AI', 4, 2, 1);
  d.prepare('INSERT INTO users VALUES (?,?,?,?)').run('u1', 'anh@nmh.vn', 'Hải', now);
  d.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(createHash('sha256').update(TOKEN).digest('hex'), 'u1', now + 86400e3, now);
  return { DB, ALLOWED_EMAILS: 'anh@nmh.vn', GOOGLE_CLIENT_ID: '123-abc.apps.googleusercontent.com', OPENAI_API_KEY: 'sk-test', GOOGLE_TTS_KEY: 'g-test', ...extraEnv };
}

test('trang chủ có Google Client ID, script hợp lệ', async () => {
  const r = await get(setup(), '/', false);
  const html = await r.text();
  assert.equal(r.status, 200);
  assert.ok(html.includes('123-abc.apps.googleusercontent.com'));
  const js = html.match(/<script>([\s\S]*)<\/script>/)[1];
  assert.doesNotThrow(() => new Function(js));
  assert.ok(!html.includes('sk-'), 'không lộ khóa');
});

test('chưa đăng nhập thì không truy cập API', async () => {
  const env = setup();
  assert.deepEqual(await (await get(env, '/api/me', false)).json(), { user: null });
  assert.equal((await get(env, '/api/today', false)).status, 401);
  assert.equal((await post(env, '/api/ask', { messages: [{ role: 'user', content: 'x' }] }, H(false))).status, 401);
});

test('email bị gỡ khỏi danh sách được phép thì phiên mất hiệu lực', async () => {
  const env = setup({ ALLOWED_EMAILS: 'nguoi-khac@nmh.vn' });
  assert.equal((await get(env, '/api/today')).status, 401);
});

test('POST khác origin bị chặn', async () => {
  const r = await post(setup(), '/api/prefs', {}, { cookie: '__Host-nmhnews=' + TOKEN, origin: 'https://evil.example' });
  assert.equal(r.status, 403);
});

test('bản tin: mặc định mọi nguồn/chủ đề, bỏ bài cũ và bài trùng, xếp theo mức quan trọng', async () => {
  const d = await (await get(setup(), '/api/today')).json();
  assert.deepEqual(d.articles.map(a => a.url), ['a1', 'a2', 'a3']);
});

test('lưu lựa chọn nguồn/chủ đề rồi lọc đúng; bỏ giá trị lạ', async () => {
  const env = setup();
  const s = await (await post(env, '/api/prefs', { sources: ['genk', 'hacker'], categories: ['Sản phẩm & ứng dụng', 'Lạ'] })).json();
  assert.deepEqual(s, { ok: true, sources: ['genk'], categories: ['Sản phẩm & ứng dụng'] });
  const d = await (await get(env, '/api/today')).json();
  assert.deepEqual(d.articles.map(a => a.url), ['a2']);
});

test('hỏi đáp: dùng bản tin làm ngữ cảnh, ghi chi phí, có hạn mức ngày', async () => {
  const env = setup({ DAILY_USD_LIMIT: '0.0004' });
  let sent;
  globalThis.fetch = async (url, init) => { sent = { url, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: '**Hôm nay** có tin [1] về AI.', annotations: [] }] }],
      usage: { input_tokens: 4000, output_tokens: 300, input_tokens_details: { cached_tokens: 1000 } } }), { status: 200 }); };
  const r = await post(env, '/api/ask', { messages: [{ role: 'user', content: 'Hôm nay có gì?' }], style: 'chem_gio' });
  const d = await r.json();
  assert.equal(r.status, 200);
  assert.equal(d.answer, 'Hôm nay có tin về AI.');
  assert.ok(sent.url.endsWith('/v1/responses'));
  assert.ok(sent.body.instructions.includes('Tiêu đề a1') && !sent.body.instructions.includes('Tiêu đề old') && !sent.body.instructions.includes('Tiêu đề dup'));
  assert.ok(sent.body.instructions.includes('Chém gió'));
  assert.equal(sent.body.max_tool_calls, 1);
  const expected = ((3000 * 0.10 + 1000 * 0.01 + 300 * 0.50) / 1e6);
  assert.ok(Math.abs(d.usage.usd - expected) < 1e-9);
  const again = await post(env, '/api/ask', { messages: [{ role: 'user', content: 'Nữa?' }] });
  assert.equal(again.status, 429, 'vượt hạn mức ngày');
});

test('đọc giọng: Leda, trả base64 nguyên vẹn, giọng nhí phát nhanh 1.455', async () => {
  const env = setup();
  let body;
  globalThis.fetch = async (url, init) => { body = JSON.parse(init.body); return new Response(JSON.stringify({ audioContent: 'SUQzBAAAAAAA' }), { status: 200 }); };
  const d = await (await post(env, '/api/tts', { text: 'Xin chào **anh**', style: 'danh_da' })).json();
  assert.equal(body.voice.name, 'vi-VN-Chirp3-HD-Leda');
  assert.equal(body.input.text, 'Xin chào anh');
  assert.equal(body.audioConfig.speakingRate, 0.756);
  assert.deepEqual(d, { audio: 'SUQzBAAAAAAA', playbackRate: 1.455, chars: 12 });
  const n = await (await post(env, '/api/tts', { text: 'Chào', style: 'nghiem_tuc' })).json();
  assert.equal(n.playbackRate, 1);
});

test('thêm nguồn RSS riêng: kiểm tra là RSS thật, tự thêm vào lựa chọn', async () => {
  const env = setup();
  globalThis.fetch = async () => new Response('<html>not a feed</html>', { status: 200 });
  assert.equal((await post(env, '/api/sources', { url: 'https://x.vn/page' })).status, 400);
  globalThis.fetch = async () => new Response('<?xml version="1.0"?><rss><channel><item><title>t</title></item></channel></rss>', { status: 200 });
  const d = await (await post(env, '/api/sources', { url: 'https://x.vn/rss', name: 'X' })).json();
  assert.equal(d.ok, true);
  const t = await (await get(env, '/api/today')).json();
  assert.ok(t.chosenSources.includes(d.id) && t.sources.some(s => s.id === d.id && s.created_by === 'u1'));
  assert.equal((await post(env, '/api/sources', { url: 'http://x.vn/rss' })).status, 400, 'chỉ https');
});

test('Google token giả bị từ chối', async () => {
  const r = await post(setup(), '/api/auth/google', { credential: 'a.b.c' }, H(false));
  assert.equal(r.status, 401);
});
