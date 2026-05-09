import { describe, expect, it, vi } from 'vitest';

import { fetchSourcifyStatus } from '../../src/sourcify/status.js';
import { SOURCIFY_BASE_URL, type FetchLike } from '../../src/sourcify/types.js';

const CHAIN_ID = 11155111;
const ADDRESS: `0x${string}` = '0x1111111111111111111111111111111111111111';

function makeFetch(handler: (url: string, init?: RequestInit) => Promise<Response>): FetchLike {
  return vi.fn(handler) as unknown as FetchLike;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('fetchSourcifyStatus', () => {
  it('builds the v2 URL with fields=match and parses exact_match', async () => {
    let observedUrl: string | undefined;
    const fetchImpl = makeFetch(async (url) => {
      observedUrl = url;
      return jsonResponse({ match: 'exact_match' });
    });

    const result = await fetchSourcifyStatus(CHAIN_ID, ADDRESS, { fetchImpl });

    expect(observedUrl).toBe(`${SOURCIFY_BASE_URL}/contract/${CHAIN_ID}/${ADDRESS}?fields=match`);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value.match).toBe('exact_match');
      expect(result.value.address).toBe(ADDRESS);
      expect(result.value.chainId).toBe(CHAIN_ID);
    }
  });

  it('parses the partial-match response', async () => {
    const fetchImpl = makeFetch(async () => jsonResponse({ match: 'match' }));
    const result = await fetchSourcifyStatus(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.value.match).toBe('match');
  });

  it('treats 200 OK with match: null as not_found (Sourcify variant)', async () => {
    const fetchImpl = makeFetch(async () => jsonResponse({ match: null }));
    const result = await fetchSourcifyStatus(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.value.match).toBe('not_found');
  });

  it('maps HTTP 404 to match: not_found (success, not error)', async () => {
    const fetchImpl = makeFetch(async () => new Response('Not Found', { status: 404 }));
    const result = await fetchSourcifyStatus(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.value.match).toBe('not_found');
  });

  it('maps HTTP 429 to rate_limited error', async () => {
    const fetchImpl = makeFetch(async () => new Response('Too Many', { status: 429 }));
    const result = await fetchSourcifyStatus(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.reason).toBe('rate_limited');
      expect(result.error.httpStatus).toBe(429);
    }
  });

  it('maps HTTP 500 to server_error', async () => {
    const fetchImpl = makeFetch(async () => new Response('Boom', { status: 503 }));
    const result = await fetchSourcifyStatus(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.reason).toBe('server_error');
      expect(result.error.httpStatus).toBe(503);
    }
  });

  it('maps malformed JSON body to malformed_response', async () => {
    const fetchImpl = makeFetch(
      async () =>
        new Response('not-json', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const result = await fetchSourcifyStatus(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') expect(result.error.reason).toBe('malformed_response');
  });

  it('maps unknown match values to malformed_response', async () => {
    const fetchImpl = makeFetch(async () => jsonResponse({ match: 'not_a_real_value' }));
    const result = await fetchSourcifyStatus(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') expect(result.error.reason).toBe('malformed_response');
  });

  it('maps fetch throw (DNS, offline) to network_error', async () => {
    const fetchImpl = makeFetch(async () => {
      throw new Error('dns lookup failed');
    });
    const result = await fetchSourcifyStatus(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.reason).toBe('network_error');
      expect(result.error.message).toContain('dns lookup failed');
    }
  });

  it('uses an overridden baseUrl when provided', async () => {
    let observedUrl: string | undefined;
    const fetchImpl = makeFetch(async (url) => {
      observedUrl = url;
      return jsonResponse({ match: 'exact_match' });
    });
    await fetchSourcifyStatus(CHAIN_ID, ADDRESS, {
      fetchImpl,
      baseUrl: 'https://custom.example.com/server/v2',
    });
    expect(observedUrl).toBe(
      `https://custom.example.com/server/v2/contract/${CHAIN_ID}/${ADDRESS}?fields=match`,
    );
  });
});
