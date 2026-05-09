import { describe, expect, it, vi } from 'vitest';

import { NetworkUnavailable } from '../../src/network/retry.js';
import { fetchSourcifyAllChains } from '../../src/sourcify/allChains.js';

const ADDR = '0x1111111111111111111111111111111111111111' as const;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('fetchSourcifyAllChains', () => {
  it('targets the all-chains endpoint with the canonical base URL', async () => {
    let captured = '';
    const fetchImpl = vi.fn(async (url: string) => {
      captured = url;
      return jsonResponse(200, []);
    });
    await fetchSourcifyAllChains(ADDR, { fetchImpl });
    expect(captured).toBe(`https://sourcify.dev/server/v2/contract/all-chains/${ADDR}`);
  });

  it('respects baseUrl override', async () => {
    let captured = '';
    const fetchImpl = vi.fn(async (url: string) => {
      captured = url;
      return jsonResponse(200, []);
    });
    await fetchSourcifyAllChains(ADDR, { fetchImpl, baseUrl: 'https://example.test/v2' });
    expect(captured.startsWith('https://example.test/v2/contract/all-chains/')).toBe(true);
  });

  it('returns parsed entries from a top-level array body', async () => {
    const body = [
      { chainId: 1, address: '0x2222222222222222222222222222222222222222', match: 'exact_match', creationMatch: 'exact_match', runtimeMatch: 'exact_match' },
      { chainId: 11155111, address: '0x3333333333333333333333333333333333333333', match: 'match', creationMatch: 'match', runtimeMatch: null },
    ];
    const fetchImpl = vi.fn(async () => jsonResponse(200, body));
    const result = await fetchSourcifyAllChains(ADDR, { fetchImpl });
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    expect(result.value).toHaveLength(2);
    expect(result.value[0]).toEqual({
      chainId: 1,
      address: '0x2222222222222222222222222222222222222222',
      match: 'exact_match',
      creationMatch: 'exact_match',
      runtimeMatch: 'exact_match',
    });
    expect(result.value[1]?.runtimeMatch).toBeNull();
  });

  it('also accepts { results: [...] } wrapped responses', async () => {
    const body = {
      results: [{ chainId: 1, address: '0x2222222222222222222222222222222222222222', match: 'exact_match' }],
    };
    const fetchImpl = vi.fn(async () => jsonResponse(200, body));
    const result = await fetchSourcifyAllChains(ADDR, { fetchImpl });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.value).toHaveLength(1);
  });

  it('parses string chainId values (e.g. "1") in addition to numbers', async () => {
    const body = [{ chainId: '1', address: '0x2222222222222222222222222222222222222222', match: 'exact_match' }];
    const fetchImpl = vi.fn(async () => jsonResponse(200, body));
    const result = await fetchSourcifyAllChains(ADDR, { fetchImpl });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.value[0]?.chainId).toBe(1);
  });

  it('skips malformed entries (bad address / bad chainId / unknown match)', async () => {
    const body = [
      { chainId: 1, address: '0x2222222222222222222222222222222222222222', match: 'exact_match' },
      { chainId: 0, address: '0x3333333333333333333333333333333333333333', match: 'exact_match' }, // chainId<=0
      { chainId: 1, address: '0xshort', match: 'exact_match' }, // bad address
      { chainId: 1, address: '0x4444444444444444444444444444444444444444', match: 'partial' }, // unknown match
    ];
    const fetchImpl = vi.fn(async () => jsonResponse(200, body));
    const result = await fetchSourcifyAllChains(ADDR, { fetchImpl });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.value).toHaveLength(1);
  });

  it('returns empty list on HTTP 404 (no Sourcify presence on any chain)', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(404, { error: 'Not Found' }));
    const result = await fetchSourcifyAllChains(ADDR, { fetchImpl });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.value).toEqual([]);
  });

  it('returns rate_limited on HTTP 429', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(429, {}));
    const result = await fetchSourcifyAllChains(ADDR, { fetchImpl });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') expect(result.error.reason).toBe('rate_limited');
  });

  it('returns server_error on HTTP 5xx', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(503, {}));
    const result = await fetchSourcifyAllChains(ADDR, { fetchImpl });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') expect(result.error.reason).toBe('server_error');
  });

  it('returns network_error on fetch throw', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('connection refused');
    });
    const result = await fetchSourcifyAllChains(ADDR, { fetchImpl });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') expect(result.error.reason).toBe('network_error');
  });

  it('returns network_error on NetworkUnavailable surface', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new NetworkUnavailable(3, new Error('econnreset'));
    });
    const result = await fetchSourcifyAllChains(ADDR, { fetchImpl });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') expect(result.error.reason).toBe('network_error');
  });

  it('returns malformed_response when body is not array or { results }', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { wrong: 'shape' }));
    const result = await fetchSourcifyAllChains(ADDR, { fetchImpl });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') expect(result.error.reason).toBe('malformed_response');
  });

  it('returns malformed_response when body is not JSON', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response('<html>nope</html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
    );
    const result = await fetchSourcifyAllChains(ADDR, { fetchImpl });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') expect(result.error.reason).toBe('malformed_response');
  });
});
