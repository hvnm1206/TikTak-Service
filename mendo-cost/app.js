'use strict';

const SHEET_ID = '1plhNZOyy0daZ_hgTYgMgRlvzdqszGKPRm_U-i-SNxiM';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
let DATA = null;
let RAW = null;
let callbackSequence = 0;

const $ = id => document.getElementById(id);
const money = n => Math.round(Number(n || 0)).toLocaleString('vi-VN') + ' đ';
const percent = n => n === null || n === undefined
  ? '—'
  : Number(n).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%';
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[m]);
const norm = s => String(s || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();

function cell(row, index) {
  const value = row && row.c ? row.c[index] : null;
  if (!value) return '';
  return value.v !== null && value.v !== undefined ? value.v : (value.f || '');
}

function displayCell(row, index) {
  const value = row && row.c ? row.c[index] : null;
  if (!value) return '';
  return value.f !== null && value.f !== undefined ? value.f : (value.v ?? '');
}

function numberValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const source = String(value ?? '').trim().replace(/\s/g, '');
  if (!source) return 0;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(source)) {
    return Number(source.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (/^-?\d+(,\d+)$/.test(source)) return Number(source.replace(',', '.')) || 0;
  return Number(source.replace(/,/g, '')) || 0;
}

function dateKeyFromCell(row, index) {
  const formatted = String(displayCell(row, index) || '').trim();
  let match = formatted.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) return match[3] + '-' + pad2(match[2]) + '-' + pad2(match[1]);
  const raw = String(cell(row, index) || '').trim();
  match = raw.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})/);
  if (match) return match[1] + '-' + pad2(Number(match[2]) + 1) + '-' + pad2(match[3]);
  match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? match[1] + '-' + match[2] + '-' + match[3] : '';
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function fetchGviz(sheet, range) {
  return new Promise((resolve, reject) => {
    const callbackName = '__mendoGviz' + (++callbackSequence);
    const script = document.createElement('script');
    const timer = setTimeout(() => finish(new Error('Google Sheets phản hồi quá chậm.')), 30000);
    function finish(error, rows) {
      clearTimeout(timer);
      delete window[callbackName];
      script.remove();
      error ? reject(error) : resolve(rows || []);
    }
    window[callbackName] = response => {
      if (!response || response.status === 'error') {
        const message = response && response.errors && response.errors[0]
          ? response.errors[0].detailed_message || response.errors[0].message
          : 'Không đọc được dữ liệu Google Sheets.';
        finish(new Error(message));
        return;
      }
      finish(null, response.table && response.table.rows);
    };
    script.onerror = () => finish(new Error('Không kết nối được Google Sheets.'));
    const query = new URLSearchParams({
      sheet,
      range,
      headers: '0',
      tqx: 'out:json;responseHandler:' + callbackName,
      _: String(Date.now())
    });
    script.src = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?' + query;
    script.referrerPolicy = 'no-referrer';
    document.head.appendChild(script);
  });
}

function parseCostRows(rows) {
  return rows.map(row => ({
    item: String(cell(row, 0) || '').trim(),
    category: String(cell(row, 1) || '').trim(),
    group_code: String(cell(row, 2) || '').trim(),
    project_name: String(cell(row, 4) || '').trim(),
    quantity: numberValue(cell(row, 5)),
    unit: String(cell(row, 6) || '').trim(),
    unit_price: numberValue(cell(row, 7)),
    amount: numberValue(cell(row, 8)),
    date: dateKeyFromCell(row, 9),
    note: String(cell(row, 10) || '').trim(),
    id: String(cell(row, 11) || '').trim(),
    entered_by: String(cell(row, 12) || '').trim(),
    app_id: String(cell(row, 14) || '').trim(),
    project_code: String(cell(row, 16) || '').trim()
  })).filter(row => row.item || row.amount || row.date || row.project_code);
}

function parseRevenueRows(rows) {
  return rows.map(row => ({
    project_code: String(cell(row, 0) || '').trim(),
    amount: numberValue(cell(row, 3)),
    status: String(cell(row, 5) || '').trim()
  })).filter(row => row.project_code);
}

function parseProjects(rows, revenues) {
  const revenueMap = {};
  revenues.forEach(row => {
    const entry = revenueMap[row.project_code] || { confirmed: 0, estimated: 0, unconfirmed: 0 };
    entry[revenueBucket(row.status)] += row.amount;
    revenueMap[row.project_code] = entry;
  });
  return rows.map(row => {
    const projectCode = String(cell(row, 0) || '').trim();
    const revenue = numberValue(cell(row, 2));
    const totalCost = numberValue(cell(row, 5));
    const profit = numberValue(cell(row, 6));
    const rawMargin = numberValue(cell(row, 7));
    const breakdown = revenueMap[projectCode] || { confirmed: 0, estimated: 0, unconfirmed: 0 };
    return {
      project_code: projectCode,
      project_name: String(cell(row, 1) || '').trim(),
      revenue,
      direct_cost: numberValue(cell(row, 3)),
      allocated_cost: numberValue(cell(row, 4)),
      total_cost: totalCost,
      profit,
      margin_percent: Math.round((Math.abs(rawMargin) <= 1 ? rawMargin * 100 : rawMargin) * 10) / 10,
      sheet_alert: String(cell(row, 8) || '').trim(),
      revenue_basis: revenueBasis(breakdown, revenue),
      revenue_breakdown: breakdown
    };
  }).filter(row => row.project_code);
}

function revenueBucket(status) {
  const value = norm(status).toUpperCase();
  if (value.includes('DU KIEN') || value.includes('KE HOACH') || value.includes('TAM')) return 'estimated';
  if (!value || value.includes('CHUA')) return 'unconfirmed';
  if (value.includes('XAC NHAN') || value.includes('THUC TE') || value.includes('DA THU')) return 'confirmed';
  return 'unconfirmed';
}

function revenueBasis(breakdown, total) {
  if (breakdown.unconfirmed > 0) return 'unconfirmed';
  if (breakdown.estimated > 0) return 'estimated';
  if (breakdown.confirmed > 0) return 'confirmed';
  return total > 0 ? 'unconfirmed' : 'missing';
}

function todayKey() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date()).reduce((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return parts.year + '-' + parts.month + '-' + parts.day;
}

function shiftDateKey(key, days) {
  const date = new Date(key + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfWeekKey(key) {
  const date = new Date(key + 'T00:00:00Z');
  const day = date.getUTCDay();
  return shiftDateKey(key, -(day === 0 ? 6 : day - 1));
}

function summarizeCosts(rows, fromDate, toDate) {
  const items = rows.filter(row => row.date && row.date >= fromDate && row.date <= toDate)
    .sort((a, b) => b.date.localeCompare(a.date));
  return {
    source: 'COST_INPUT',
    basis: 'actual_recorded',
    from_date: fromDate,
    to_date: toDate,
    count: items.length,
    total_cost: Math.round(items.reduce((sum, row) => sum + row.amount, 0)),
    items,
    missing_project_code_count: items.filter(row => !row.project_code).length,
    missing_group_code_count: items.filter(row => !row.group_code).length
  };
}

function inspectQuality(rows) {
  const seenIds = new Set();
  const seenAppIds = new Set();
  const issues = [];
  rows.forEach(row => {
    const rowIssues = [];
    if (!row.project_code) rowIssues.push('MISSING_PROJECT_CODE');
    if (!row.group_code) rowIssues.push('MISSING_GROUP_CODE');
    if (!row.category) rowIssues.push('MISSING_CATEGORY');
    if (!row.project_name) rowIssues.push('MISSING_PROJECT_NAME');
    if (!row.date) rowIssues.push('MISSING_DATE');
    if (!(row.amount > 0)) rowIssues.push('INVALID_AMOUNT');
    if (row.id && seenIds.has(row.id)) rowIssues.push('DUPLICATE_ID');
    if (row.app_id && seenAppIds.has(row.app_id)) rowIssues.push('DUPLICATE_APP_ID');
    if (row.id) seenIds.add(row.id);
    if (row.app_id) seenAppIds.add(row.app_id);
    if (rowIssues.length) issues.push({ row, issues: rowIssues });
  });
  return { checked_count: rows.length, issue_count: issues.length, issues: issues.slice(0, 200) };
}

function maxBy(rows, key) {
  return rows.length ? rows.reduce((a, b) => numberValue(b[key]) > numberValue(a[key]) ? b : a) : null;
}

function minBy(rows, key) {
  return rows.length ? rows.reduce((a, b) => numberValue(b[key]) < numberValue(a[key]) ? b : a) : null;
}

function buildDashboard(raw, options) {
  const today = todayKey();
  const monthStart = today.slice(0, 8) + '01';
  const weekStart = startOfWeekKey(today);
  let fromDate = /^\d{4}-\d{2}-\d{2}$/.test(String(options.from_date || '')) ? options.from_date : monthStart;
  let toDate = /^\d{4}-\d{2}-\d{2}$/.test(String(options.to_date || '')) ? options.to_date : today;
  if (fromDate > toDate) [fromDate, toDate] = [toDate, fromDate];
  const threshold = Math.max(0, Math.min(100, numberValue(options.low_margin_percent || 15)));
  const selected = summarizeCosts(raw.costs, fromDate, toDate);
  const totals = raw.projects.reduce((sum, project) => {
    sum.revenue += project.revenue;
    sum.total_cost += project.total_cost;
    return sum;
  }, { revenue: 0, total_cost: 0 });
  totals.profit = totals.revenue - totals.total_cost;
  totals.margin_percent = totals.revenue ? Math.round(1000 * totals.profit / totals.revenue) / 10 : null;
  const loss = raw.projects.filter(project => project.revenue > 0 && project.profit < 0);
  const low = raw.projects.filter(project => project.revenue > 0 && project.profit >= 0 && project.margin_percent < threshold);
  const missing = raw.projects.filter(project => project.revenue <= 0);
  const positiveCosts = raw.projects.filter(project => project.total_cost > 0);
  return {
    ok: true,
    readonly: true,
    generated_at: new Date().toLocaleString('vi-VN', { timeZone: TIMEZONE }),
    period: { today, week_start: weekStart, month_start: monthStart, from_date: fromDate, to_date: toDate },
    cost: {
      today: summarizeCosts(raw.costs, today, today),
      week: summarizeCosts(raw.costs, weekStart, today),
      month: summarizeCosts(raw.costs, monthStart, today),
      selected
    },
    portfolio: {
      totals,
      risk: { threshold_percent: threshold, loss_projects: loss, low_margin_projects: low, missing_revenue_projects: missing },
      highest_cost: maxBy(raw.projects, 'total_cost'),
      lowest_cost_positive: minBy(positiveCosts, 'total_cost'),
      highest_profit: maxBy(raw.projects, 'profit'),
      lowest_profit: minBy(raw.projects, 'profit'),
      projects: raw.projects
    },
    quality: inspectQuality(selected.items)
  };
}

function openTab(id, button) {
  document.querySelectorAll('.panel').forEach(panel => panel.classList.toggle('active', panel.id === id));
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab === button));
}

function showLoading(enabled) {
  $('loading').classList.toggle('show', Boolean(enabled));
}

function showError(error) {
  showLoading(false);
  const status = $('status');
  status.className = 'status show error';
  status.textContent = 'Không truy xuất được dữ liệu: ' + (error && error.message ? error.message : error);
}

function reload() {
  load({
    from_date: $('fromDate').value,
    to_date: $('toDate').value,
    low_margin_percent: $('margin').value
  });
}

async function load(options) {
  showLoading(true);
  $('status').className = 'status';
  try {
    const [costRows, revenueRows, projectRows] = await Promise.all([
      fetchGviz('COST_INPUT', 'A2:Q'),
      fetchGviz('REVENUE_INPUT', 'A3:G'),
      fetchGviz('PROJECT_SUMMARY', 'A3:I')
    ]);
    const revenues = parseRevenueRows(revenueRows);
    RAW = {
      costs: parseCostRows(costRows),
      projects: parseProjects(projectRows, revenues)
    };
    render(buildDashboard(RAW, options || {}));
  } catch (error) {
    showError(error);
  }
}

function render(data) {
  DATA = data;
  showLoading(false);
  if (!data || !data.ok) return showError('Phản hồi không hợp lệ.');
  const periodData = data.period || {};
  const costs = data.cost || {};
  const portfolio = data.portfolio || {};
  const totals = portfolio.totals || {};
  if (!$('fromDate').value) $('fromDate').value = periodData.from_date || '';
  if (!$('toDate').value) $('toDate').value = periodData.to_date || '';
  $('todayCost').textContent = money(costs.today.total_cost);
  $('todayMeta').textContent = (costs.today.count || 0) + ' mục';
  $('weekCost').textContent = money(costs.week.total_cost);
  $('weekMeta').textContent = (costs.week.count || 0) + ' mục · từ ' + formatDate(periodData.week_start);
  $('monthCost').textContent = money(costs.month.total_cost);
  $('monthMeta').textContent = (costs.month.count || 0) + ' mục · từ ' + formatDate(periodData.month_start);
  $('selectedCost').textContent = money(costs.selected.total_cost);
  $('selectedMeta').textContent = (costs.selected.count || 0) + ' mục · ' + formatDate(periodData.from_date) + '–' + formatDate(periodData.to_date);
  $('revenue').textContent = money(totals.revenue);
  $('portfolioCost').textContent = money(totals.total_cost);
  $('profit').textContent = money(totals.profit);
  $('marginValue').textContent = percent(totals.margin_percent);
  $('profit').className = 'kpiValue ' + (Number(totals.profit) < 0 ? 'negative' : 'positive');
  $('marginValue').className = 'kpiValue ' + (Number(totals.margin_percent) < Number(portfolio.risk && portfolio.risk.threshold_percent || 15) ? 'negative' : 'positive');
  renderExtremes(portfolio);
  renderCosts(costs.selected.items || []);
  renderProjects();
  renderAlerts();
  $('footer').textContent = 'Dữ liệu chỉ đọc · Cập nhật lúc ' + (data.generated_at || '');
}

function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return value || '';
  const parts = value.split('-');
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

function projectLine(title, project, key) {
  if (!project) return '<div class="empty">Chưa có dữ liệu</div>';
  return '<div class="alert"><span class="dot"></span><div><div class="alertTitle">' + esc(title) + ': ' + esc(project.project_code) + ' · ' + esc(project.project_name) + '</div><div class="alertMeta">Chi phí ' + money(project.total_cost) + ' · Lợi nhuận ' + money(project.profit) + ' · Biên ' + percent(project.margin_percent) + '</div></div><b class="num">' + money(project[key]) + '</b></div>';
}

function renderExtremes(portfolio) {
  $('highest').innerHTML = projectLine('Chi phí', portfolio.highest_cost, 'total_cost') + projectLine('Lợi nhuận', portfolio.highest_profit, 'profit');
  $('lowest').innerHTML = projectLine('Chi phí dương', portfolio.lowest_cost_positive, 'total_cost') + projectLine('Lợi nhuận', portfolio.lowest_profit, 'profit');
}

function renderCosts(rows) {
  $('costCount').textContent = rows.length + ' mục';
  $('costRows').innerHTML = rows.length ? rows.map(row => '<tr><td>' + esc(formatDate(row.date)) + '</td><td><span class="strong">' + esc(row.item) + '</span><div class="muted">' + esc(row.category) + '</div></td><td>' + esc(row.project_code || '—') + '</td><td>' + esc(row.project_name || '—') + '</td><td>' + esc(row.group_code || '—') + '</td><td>' + esc(row.entered_by || '—') + '</td><td class="num strong">' + money(row.amount) + '</td></tr>').join('') : '<tr><td colspan="7" class="empty">Không có chi phí trong kỳ</td></tr>';
}

function riskOf(project, threshold) {
  if (Number(project.revenue) <= 0) return { label: 'Chưa có doanh thu', cls: 'unknown' };
  if (Number(project.profit) < 0) return { label: 'Đang lỗ', cls: 'loss' };
  if (Number(project.margin_percent) < threshold) return { label: 'Biên thấp', cls: 'low' };
  return { label: 'Bình thường', cls: 'good' };
}

function renderProjects() {
  if (!DATA) return;
  const threshold = Number(DATA.portfolio.risk && DATA.portfolio.risk.threshold_percent || 15);
  const query = norm($('search').value);
  const rows = (DATA.portfolio.projects || []).filter(project => !query || norm(project.project_code + ' ' + project.project_name).includes(query));
  $('projectCount').textContent = rows.length + ' dự án';
  $('projectRows').innerHTML = rows.length ? rows.map(project => {
    const risk = riskOf(project, threshold);
    return '<tr><td class="strong">' + esc(project.project_code) + '</td><td>' + esc(project.project_name) + '</td><td>' + esc(project.revenue_basis || '—') + '</td><td class="num">' + money(project.revenue) + '</td><td class="num">' + money(project.total_cost) + '</td><td class="num strong ' + (Number(project.profit) < 0 ? 'negative' : 'positive') + '">' + money(project.profit) + '</td><td class="num">' + percent(project.margin_percent) + '</td><td><span class="badge ' + risk.cls + '">' + risk.label + '</span></td></tr>';
  }).join('') : '<tr><td colspan="8" class="empty">Không tìm thấy dự án</td></tr>';
}

function renderAlerts() {
  const portfolio = DATA.portfolio || {};
  const risk = portfolio.risk || {};
  const losses = risk.loss_projects || [];
  const lowMargins = risk.low_margin_projects || [];
  const missingRevenue = risk.missing_revenue_projects || [];
  const all = losses.concat(lowMargins, missingRevenue);
  $('riskCount').textContent = all.length + ' cảnh báo';
  $('riskRows').innerHTML = all.length ? all.map(project => {
    const itemRisk = riskOf(project, Number(risk.threshold_percent || 15));
    return '<div class="alert"><span class="dot ' + (itemRisk.cls === 'loss' ? 'red' : itemRisk.cls === 'unknown' ? 'gray' : '') + '"></span><div><div class="alertTitle">' + esc(project.project_code) + ' · ' + esc(project.project_name) + '</div><div class="alertMeta">Doanh thu ' + money(project.revenue) + ' · Chi phí ' + money(project.total_cost) + ' · Lợi nhuận ' + money(project.profit) + ' · Biên ' + percent(project.margin_percent) + '</div></div><span class="badge ' + itemRisk.cls + '">' + itemRisk.label + '</span></div>';
  }).join('') : '<div class="empty">Không có dự án rủi ro theo ngưỡng đã chọn</div>';
  const issues = DATA.quality && DATA.quality.issues || [];
  $('qualityCount').textContent = issues.length + ' mục';
  $('qualityRows').innerHTML = issues.length ? issues.map(issue => '<div class="alert"><span class="dot"></span><div><div class="alertTitle">' + esc(issue.row.item || 'Dòng chi phí chưa đủ dữ liệu') + '</div><div class="alertMeta">' + esc((issue.issues || []).join(' · ')) + ' · ' + esc(formatDate(issue.row.date)) + ' · ' + money(issue.row.amount) + '</div></div><span class="badge low">Rà soát</span></div>').join('') : '<div class="empty">Không phát hiện lỗi dữ liệu trong kỳ</div>';
}

load({});
