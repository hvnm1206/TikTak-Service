// NMH Voice GPT V1 — independent web-search adapter (not mounted in production).
// Never expose BRAVE_SEARCH_API_KEY to the browser or commit it to source control.
const ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';
export class WebSearchError extends Error {
  constructor(code, message) { super(message); this.name = 'WebSearchError'; this.code = code; }
}

export async function searchWeb(query, { apiKey, fetchImpl = fetch, timeoutMs = 8000, maxResults = 5 } = {}) {
  if (typeof query !== 'string' || !query.trim() || query.length > 300 || query.trim().split(/\s+/).length > 50) {
    throw new WebSearchError('INVALID_QUERY', 'Câu hỏi tìm kiếm phải có 1–300 ký tự, tối đa 50 từ.');
  }
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new WebSearchError('NOT_CONFIGURED', 'Chưa cấu hình Brave Search API key.');
  }
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 5) {
    throw new WebSearchError('INVALID_LIMIT', 'Giới hạn kết quả phải từ 1 đến 5.');
  }
  const url = new URL(ENDPOINT);
  url.searchParams.set('q', query.trim());
  url.searchParams.set('count', String(maxResults));
  url.searchParams.set('country', 'VN');
  url.searchParams.set('search_lang', 'vi');
  url.searchParams.set('safesearch', 'moderate');
  url.searchParams.set('text_decorations', 'false');
  url.searchParams.set('result_filter', 'web');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), Math.min(15000, Math.max(1000, timeoutMs)));
  let response;
  try {
    response = await fetchImpl(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey },
      signal: ctl.signal,
    });
  } catch (e) {
    throw new WebSearchError(e?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR', 'Không truy cập được dịch vụ tìm kiếm.');
  } finally {
    clearTimeout(timer);
  }
  if (response.status === 401 || response.status === 403) throw new WebSearchError('UNAUTHORIZED', 'Brave Search API key không hợp lệ hoặc không đủ quyền.');
  if (response.status === 429) throw new WebSearchError('RATE_LIMIT', 'Đã chạm giới hạn tra cứu.');
  if (!response.ok) throw new WebSearchError('UPSTREAM_ERROR', `Dịch vụ tìm kiếm lỗi HTTP ${response.status}.`);
  let data;
  try { data = await response.json(); } catch { throw new WebSearchError('BAD_RESPONSE', 'Kết quả tìm kiếm không phải JSON hợp lệ.'); }
  if (!data || !Array.isArray(data.web?.results)) throw new WebSearchError('BAD_RESPONSE', 'Dữ liệu tìm kiếm sai định dạng.');
  const unique = new Set();
  const results = [];
  for (const item of data.web.results) {
    if (results.length >= maxResults) break;
    if (typeof item?.url !== 'string') continue;
    let link;
    try { link = new URL(item.url); } catch { continue; }
    if (link.protocol !== 'https:' || link.username || link.password) continue;
    link.hash = '';
    const canonical = link.toString();
    if (unique.has(canonical)) continue;
    unique.add(canonical);
    results.push({
      title: String(item.title || '').slice(0, 180),
      url: canonical,
      snippet: String(item.description || '').replace(/\s+/g, ' ').slice(0, 700),
      source: 'Brave Search',
    });
  }
  return { query: query.trim(), results, count: results.length, searched: true };
}
