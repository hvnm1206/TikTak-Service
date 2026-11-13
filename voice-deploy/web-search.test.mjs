import test from 'node:test';
import assert from 'node:assert/strict';
import { searchWeb, WebSearchError } from './web-search.mjs';
const apiKey = 'fake-test-token';
const make = (results = []) => async (url, options) => {
  assert.equal(new URL(url).hostname, 'api.search.brave.com');
  assert.equal(options.headers['X-Subscription-Token'], apiKey);
  assert.equal(new URL(url).searchParams.get('country'), 'VN');
  assert.equal(new URL(url).searchParams.get('search_lang'), 'vi');
  return { ok: true, status: 200, json: async () => ({ web: { results } }) };
};
const reject = async (fn, code) => assert.rejects(fn, e => e instanceof WebSearchError && e.code === code);
test('search Vietnamese, return sources with safe URLs and deduplicate', async () => {
  const r = await searchWeb('giá nhôm hôm nay', { apiKey, fetchImpl: make([
    { title: 'A', url: 'https://example.org/a', description: 'Thông tin' },
    { title: 'duplicate', url: 'https://example.org/a#fragment', description: 'Lặp' },
    { title: 'http', url: 'http://not-secure.org/', description: 'Bỏ' },
    { title: 'B', url: 'https://example.net/b', description: 'Giá' },
  ]) });
  assert.equal(r.count, 2);
  assert.equal(r.results[0].url, 'https://example.org/a');
  assert.equal(r.results[0].source, 'Brave Search');
});
test('no key fails without network call', async () => {
  await reject(() => searchWeb('test', { fetchImpl: () => { throw Error('should not run'); } }), 'NOT_CONFIGURED');
});
test('empty and excessive queries rejected', async () => {
  await reject(() => searchWeb('   ', { apiKey }), 'INVALID_QUERY');
  await reject(() => searchWeb('x'.repeat(301), { apiKey }), 'INVALID_QUERY');
});
test('invalid result limits rejected', async () => reject(() => searchWeb('test', { apiKey, maxResults: 20 }), 'INVALID_LIMIT'));
test('upstream 401, 429, 503 mapped to explicit errors', async () => {
  for (const [status, code] of [[401, 'UNAUTHORIZED'], [429, 'RATE_LIMIT'], [503, 'UPSTREAM_ERROR']]) {
    await reject(() => searchWeb('test', { apiKey, fetchImpl: async () => ({ ok: false, status }) }), code);
  }
});
test('malformed JSON and missing web results rejected', async () => {
  await reject(() => searchWeb('test', { apiKey, fetchImpl: async () => ({ ok: true, json: async () => { throw Error('bad'); } }) }), 'BAD_RESPONSE');
  await reject(() => searchWeb('test', { apiKey, fetchImpl: async () => ({ ok: true, json: async () => ({ web: {} }) }) }), 'BAD_RESPONSE');
});
test('network errors and abort errors mapped without leaking secrets', async () => {
  await reject(() => searchWeb('test', { apiKey, fetchImpl: async () => { throw Error('token is secret'); } }), 'NETWORK_ERROR');
  await reject(() => searchWeb('test', { apiKey, fetchImpl: async () => { const e = Error('abort'); e.name = 'AbortError'; throw e; } }), 'TIMEOUT');
});
test('empty results valid and snippets truncated', async () => {
  const r = await searchWeb('test', { apiKey, fetchImpl: make([{ title: 'X', url: 'https://a.org', description: 'a'.repeat(900) }]) });
  assert.equal(r.results[0].snippet.length, 700);
  assert.equal((await searchWeb('test', { apiKey, fetchImpl: make([]) })).count, 0);
});
