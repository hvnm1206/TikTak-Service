const SPREADSHEET_ID = '1xVib9GliMmXHAJgPd9TwjbqMJXUy_pj8cpnEIWnrcsw';
const RAW_SHEET = 'RAW_INPUT';
const CLEAN_SHEET = 'CLEAN_DATA';
const TZ = 'Asia/Ho_Chi_Minh';

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'today').toLowerCase();
    const data = handleRead_(action, e && e.parameter ? e.parameter : {});
    return json_(data);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = String(body.action || 'add').toLowerCase();
    if (action !== 'add') throw new Error('Unsupported action');
    const rawText = String(body.rawText || '').trim();
    if (!rawText) throw new Error('rawText is required');

    const parsed = parseExpense_(rawText);
    if (!parsed.amount) throw new Error('Không đọc được số tiền');

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(RAW_SHEET);
    if (!sh) throw new Error('Không tìm thấy RAW_INPUT');

    const now = new Date();
    const inputId = 'web_' + Utilities.formatDate(now, TZ, 'yyyyMMdd_HHmmss_SSS');
    sh.appendRow([
      now.toISOString(),
      rawText,
      'Hai',
      'web_app',
      inputId,
      'Nhập từ Hai Chi Tiêu web app'
    ]);

    return json_({
      ok: true,
      item: {
        id: inputId,
        inputId: inputId,
        createdAt: now.toISOString(),
        rawText: rawText,
        note: parsed.note,
        amount: parsed.amount,
        status: 'raw'
      }
    });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function handleRead_(action, params) {
  const rows = getMergedRows_();
  const now = new Date();
  const todayKey = dayKey_(now);
  const weekStart = startOfWeek_(now);
  const month = now.getMonth();
  const year = now.getFullYear();

  if (action === 'today') return summary_(rows.filter(r => dayKey_(new Date(r.createdAt)) === todayKey));
  if (action === 'week') return summary_(rows.filter(r => new Date(r.createdAt) >= weekStart));
  if (action === 'month') return summary_(rows.filter(r => { const d = new Date(r.createdAt); return d.getMonth() === month && d.getFullYear() === year; }));
  if (action === 'recent') {
    const limit = Math.max(1, Math.min(200, Number(params.limit || 100)));
    return { ok: true, items: rows.slice(0, limit) };
  }
  if (action === 'search') {
    const q = String(params.q || '').trim().toLowerCase();
    const items = q ? rows.filter(r => ((r.note || '') + ' ' + (r.rawText || '') + ' ' + (r.category || '')).toLowerCase().indexOf(q) >= 0) : [];
    return { ok: true, items: items };
  }
  throw new Error('Unsupported action');
}

function getMergedRows_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const clean = ss.getSheetByName(CLEAN_SHEET);
  const raw = ss.getSheetByName(RAW_SHEET);
  if (!clean || !raw) throw new Error('Thiếu CLEAN_DATA hoặc RAW_INPUT');

  const cleanValues = clean.getDataRange().getValues();
  const rawValues = raw.getDataRange().getValues();
  const cleanHeader = cleanValues.shift() || [];
  const rawHeader = rawValues.shift() || [];
  const ci = indexMap_(cleanHeader);
  const ri = indexMap_(rawHeader);

  const cleanItems = cleanValues
    .filter(r => r.some(v => v !== '' && v !== null))
    .filter(r => String(r[ci['Trang thai']] || '').toUpperCase() === 'OK')
    .map(r => ({
      id: String(r[ci['Input_id']] || ''),
      inputId: String(r[ci['Input_id']] || ''),
      createdAt: normalizeIso_(r[ci['Timestamp']]),
      rawText: String(r[ci['Noi dung chi']] || ''),
      note: String(r[ci['Noi dung chi']] || ''),
      amount: Number(r[ci['So tien']] || 0),
      category: String(r[ci['Nhom chi']] || ''),
      status: 'clean'
    }))
    .filter(x => x.createdAt && x.amount >= 0);

  const cleanIds = {};
  cleanItems.forEach(x => { if (x.inputId) cleanIds[x.inputId] = true; });

  const rawOnly = rawValues
    .filter(r => r.some(v => v !== '' && v !== null))
    .map(r => {
      const inputId = String(r[ri['Input_id']] || '');
      if (inputId && cleanIds[inputId]) return null;
      const rawText = String(r[ri['Noi dung goc']] || '').trim();
      const parsed = parseExpense_(rawText);
      return {
        id: inputId || ('raw_' + Math.random()),
        inputId: inputId,
        createdAt: normalizeIso_(r[ri['Timestamp']]),
        rawText: rawText,
        note: parsed.note,
        amount: parsed.amount,
        category: '',
        status: 'raw'
      };
    })
    .filter(Boolean)
    .filter(x => x.createdAt && x.rawText && x.amount > 0);

  return cleanItems.concat(rawOnly).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function parseExpense_(text) {
  const s = String(text || '').trim();
  const re = /([\d]+(?:[.,]\d{3})*(?:[.,]\d+)?)\s*([kK])?/g;
  let m, last = null;
  while ((m = re.exec(s)) !== null) last = m;
  if (!last) return { note: s, amount: 0 };
  let amount = Number(String(last[1]).replace(/[.,]/g, ''));
  if (last[2]) amount *= 1000;
  const note = (s.slice(0, last.index) + s.slice(last.index + last[0].length)).replace(/\s+/g, ' ').trim() || s;
  return { note: note, amount: isFinite(amount) ? amount : 0 };
}

function summary_(items) {
  const total = items.reduce((s, x) => s + Number(x.amount || 0), 0);
  return { ok: true, total: total, count: items.length, items: items };
}

function indexMap_(headers) {
  const m = {};
  headers.forEach((h, i) => m[String(h).trim()] = i);
  return m;
}

function normalizeIso_(v) {
  if (v instanceof Date) return v.toISOString();
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

function dayKey_(d) {
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
}

function startOfWeek_(d) {
  const x = new Date(d.getTime());
  const day = Number(Utilities.formatDate(x, TZ, 'u'));
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - (day - 1));
  return x;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
