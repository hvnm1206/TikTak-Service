const SPREADSHEET_ID = '1xVib9GliMmXHAJgPd9TwjbqMJXUy_pj8cpnEIWnrcsw';
const RAW_SHEET = 'RAW_INPUT';
const CLEAN_SHEET = 'CLEAN_DATA';
const TZ = 'Asia/Ho_Chi_Minh';

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = String(params.action || 'today').toLowerCase();
    if (action === 'health' || action === 'ping') return json_(health_());
    return json_(handleRead_(action, params));
  } catch (err) {
    return json_({ ok: false, error: errorMessage_(err) });
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || 'add').toLowerCase();
    if (action === 'add') return json_(addExpense_(body));
    if (action === 'batchadd' || action === 'sync') return json_(batchAdd_(body));
    throw new Error('Unsupported action: ' + action);
  } catch (err) {
    return json_({ ok: false, error: errorMessage_(err) });
  }
}

function health_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const raw = ss.getSheetByName(RAW_SHEET);
  const clean = ss.getSheetByName(CLEAN_SHEET);
  return {
    ok: !!raw && !!clean,
    service: 'Hai Chi Tieu API',
    version: '2.0.0',
    spreadsheetId: SPREADSHEET_ID,
    rawSheet: !!raw,
    cleanSheet: !!clean,
    serverTime: new Date().toISOString(),
    timezone: TZ
  };
}

function addExpense_(body) {
  const rawText = String(body.rawText || '').trim();
  if (!rawText) throw new Error('rawText is required');
  const parsed = parseExpense_(rawText);
  if (!parsed.amount) throw new Error('Không đọc được số tiền');

  const requestedId = String(body.clientId || body.inputId || '').trim();
  const inputId = requestedId || newInputId_('web');
  const existing = findRawByInputId_(inputId);
  if (existing) {
    return { ok: true, duplicate: true, item: rawRowToItem_(existing) };
  }

  const now = new Date();
  const createdAt = normalizeClientDate_(body.createdAt) || now;
  appendRaw_({
    createdAt: createdAt,
    rawText: rawText,
    user: String(body.user || 'Hai'),
    channel: String(body.channel || 'web_app'),
    inputId: inputId,
    note: String(body.systemNote || 'Nhập từ Hai Chi Tiêu web app')
  });

  return {
    ok: true,
    duplicate: false,
    item: {
      id: inputId,
      inputId: inputId,
      createdAt: createdAt.toISOString(),
      rawText: rawText,
      note: parsed.note,
      amount: parsed.amount,
      status: 'raw'
    }
  };
}

function batchAdd_(body) {
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return { ok: true, inserted: 0, duplicates: 0, failed: 0, results: [] };
  if (items.length > 200) throw new Error('Tối đa 200 giao dịch mỗi lần đồng bộ');

  let inserted = 0;
  let duplicates = 0;
  let failed = 0;
  const results = items.map(function(item, index) {
    try {
      const payload = Object.assign({}, item, { action: 'add' });
      if (!payload.clientId && !payload.inputId) payload.clientId = 'local_' + Utilities.getUuid();
      const result = addExpense_(payload);
      if (result.duplicate) duplicates++; else inserted++;
      return { ok: true, index: index, duplicate: !!result.duplicate, item: result.item };
    } catch (err) {
      failed++;
      return { ok: false, index: index, error: errorMessage_(err) };
    }
  });

  return { ok: failed === 0, inserted: inserted, duplicates: duplicates, failed: failed, results: results };
}

function handleRead_(action, params) {
  const rows = getMergedRows_();
  const now = new Date();
  const todayKey = dayKey_(now);
  const weekStart = startOfWeek_(now);
  const month = Number(Utilities.formatDate(now, TZ, 'M'));
  const year = Number(Utilities.formatDate(now, TZ, 'yyyy'));

  if (action === 'today') return summary_(rows.filter(function(r) { return dayKey_(new Date(r.createdAt)) === todayKey; }));
  if (action === 'week') return summary_(rows.filter(function(r) { return new Date(r.createdAt) >= weekStart; }));
  if (action === 'month') return summary_(rows.filter(function(r) {
    const d = new Date(r.createdAt);
    return Number(Utilities.formatDate(d, TZ, 'M')) === month && Number(Utilities.formatDate(d, TZ, 'yyyy')) === year;
  }));
  if (action === 'recent') {
    const limit = Math.max(1, Math.min(500, Number(params.limit || 100)));
    return { ok: true, items: rows.slice(0, limit) };
  }
  if (action === 'search') {
    const q = fold_(params.q || '');
    const items = q ? rows.filter(function(r) {
      return fold_((r.note || '') + ' ' + (r.rawText || '') + ' ' + (r.category || '')).indexOf(q) >= 0;
    }) : [];
    return { ok: true, items: items, count: items.length, total: items.reduce(function(s, x) { return s + Number(x.amount || 0); }, 0) };
  }
  throw new Error('Unsupported action: ' + action);
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
    .filter(nonEmptyRow_)
    .filter(function(r) { return String(value_(r, ci, 'Trang thai') || '').toUpperCase() === 'OK'; })
    .map(function(r) {
      return {
        id: String(value_(r, ci, 'Input_id') || ''),
        inputId: String(value_(r, ci, 'Input_id') || ''),
        createdAt: normalizeIso_(value_(r, ci, 'Timestamp')),
        rawText: String(value_(r, ci, 'Noi dung chi') || ''),
        note: String(value_(r, ci, 'Noi dung chi') || ''),
        amount: Number(value_(r, ci, 'So tien') || 0),
        category: String(value_(r, ci, 'Nhom chi') || ''),
        status: 'clean'
      };
    })
    .filter(function(x) { return x.createdAt && x.amount > 0; });

  const cleanIds = {};
  cleanItems.forEach(function(x) { if (x.inputId) cleanIds[x.inputId] = true; });

  const rawItems = rawValues
    .filter(nonEmptyRow_)
    .map(function(r) {
      const inputId = String(value_(r, ri, 'Input_id') || '');
      if (inputId && cleanIds[inputId]) return null;
      const rawText = String(value_(r, ri, 'Noi dung goc') || '').trim();
      const parsed = parseExpense_(rawText);
      return {
        id: inputId || ('raw_' + Utilities.getUuid()),
        inputId: inputId,
        createdAt: normalizeIso_(value_(r, ri, 'Timestamp')),
        rawText: rawText,
        note: parsed.note,
        amount: parsed.amount,
        category: '',
        status: 'raw'
      };
    })
    .filter(function(x) { return !!x && x.createdAt && x.rawText && x.amount > 0; });

  return cleanItems.concat(rawItems).sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
}

function findRawByInputId_(inputId) {
  if (!inputId) return null;
  const sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(RAW_SHEET);
  if (!sh) throw new Error('Không tìm thấy RAW_INPUT');
  const values = sh.getDataRange().getValues();
  const headers = values.shift() || [];
  const map = indexMap_(headers);
  const idx = map['Input_id'];
  if (idx === undefined) throw new Error('RAW_INPUT thiếu cột Input_id');
  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][idx] || '') === inputId) return { row: values[i], map: map };
  }
  return null;
}

function rawRowToItem_(found) {
  const r = found.row;
  const map = found.map;
  const rawText = String(value_(r, map, 'Noi dung goc') || '');
  const parsed = parseExpense_(rawText);
  const inputId = String(value_(r, map, 'Input_id') || '');
  return {
    id: inputId,
    inputId: inputId,
    createdAt: normalizeIso_(value_(r, map, 'Timestamp')),
    rawText: rawText,
    note: parsed.note,
    amount: parsed.amount,
    status: 'raw'
  };
}

function appendRaw_(item) {
  const sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(RAW_SHEET);
  if (!sh) throw new Error('Không tìm thấy RAW_INPUT');
  sh.appendRow([
    item.createdAt.toISOString(),
    item.rawText,
    item.user,
    item.channel,
    item.inputId,
    item.note
  ]);
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  const text = String(e.postData.contents || '').trim();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch (err) { throw new Error('Body JSON không hợp lệ'); }
}

function parseExpense_(text) {
  const s = String(text || '').trim();
  const re = /([\d]+(?:[.,]\d{3})*(?:[.,]\d+)?)\s*([kK])?/g;
  let m;
  let last = null;
  while ((m = re.exec(s)) !== null) last = m;
  if (!last) return { note: s, amount: 0 };
  let amount = Number(String(last[1]).replace(/[.,]/g, ''));
  if (last[2]) amount *= 1000;
  const note = (s.slice(0, last.index) + s.slice(last.index + last[0].length)).replace(/\s+/g, ' ').trim() || s;
  return { note: note, amount: isFinite(amount) ? amount : 0 };
}

function summary_(items) {
  const total = items.reduce(function(s, x) { return s + Number(x.amount || 0); }, 0);
  return { ok: true, total: total, count: items.length, items: items };
}

function indexMap_(headers) {
  const map = {};
  headers.forEach(function(h, i) { map[String(h).trim()] = i; });
  return map;
}

function value_(row, map, header) {
  const idx = map[header];
  return idx === undefined ? '' : row[idx];
}

function nonEmptyRow_(row) {
  return row.some(function(v) { return v !== '' && v !== null; });
}

function normalizeIso_(v) {
  if (v instanceof Date) return v.toISOString();
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

function normalizeClientDate_(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function newInputId_(prefix) {
  const now = new Date();
  return prefix + '_' + Utilities.formatDate(now, TZ, 'yyyyMMdd_HHmmss_SSS') + '_' + Utilities.getUuid().slice(0, 8);
}

function dayKey_(d) {
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
}

function startOfWeek_(d) {
  const localYmd = Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
  const local = new Date(localYmd + 'T00:00:00+07:00');
  const isoDay = Number(Utilities.formatDate(local, TZ, 'u'));
  local.setDate(local.getDate() - (isoDay - 1));
  return local;
}

function fold_(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function errorMessage_(err) {
  return String(err && err.message ? err.message : err);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
