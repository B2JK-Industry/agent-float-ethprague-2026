import { describe, expect, it, vi } from 'vitest';

import {
  FOURBYTE_BASE_URL,
  lookup4byteSelectors,
  type FetchLike,
} from '../../src/sourcify/fourbyte.js';

const SEL_TRANSFER: `0x${string}` = '0xa9059cbb'; // transfer(address,uint256)
const SEL_SWEEP: `0x${string}` = '0x01681a62'; // sweep(address) — fixture
const SEL_UNKNOWN: `0x${string}` = '0xdeadbeef';

function makeFetch(handlers: Record<string, () => Promise<Response>>): FetchLike {
  return vi.fn(async (url: string) => {
    const m = url.match(/hex_signature=(0x[a-fA-F0-9]{8})/);
    const sel = m?.[1] ?? '';
    const handler = handlers[sel];
    if (!handler) throw new Error(`unmocked selector: ${sel}`);
    return handler();
  }) as unknown as FetchLike;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('lookup4byteSelectors', () => {
  it('builds the v1 signatures URL', async () => {
    let observed: string | undefined;
    const fetchImpl = vi.fn(async (url: string) => {
      observed = url;
      return jsonResponse({ results: [] });
    }) as unknown as FetchLike;
    await lookup4byteSelectors([SEL_TRANSFER], { fetchImpl });
    expect(observed).toBe(`${FOURBYTE_BASE_URL}/signatures/?hex_signature=${SEL_TRANSFER}`);
  });

  it('parses a single match', async () => {
    const fetchImpl = makeFetch({
      [SEL_TRANSFER]: async () =>
        jsonResponse({
          results: [{ text_signature: 'transfer(address,uint256)' }],
        }),
    });
    const r = await lookup4byteSelectors([SEL_TRANSFER], { fetchImpl });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      const lookup = r.results.get(SEL_TRANSFER);
      expect(lookup?.candidates[0]?.name).toBe('transfer');
      expect(lookup?.candidates[0]?.risky).toBe(false);
      expect(lookup?.anyRisky).toBe(false);
    }
  });

  it('flags risky names from the closed list (US-026)', async () => {
    const fetchImpl = makeFetch({
      [SEL_SWEEP]: async () =>
        jsonResponse({
          results: [{ text_signature: 'sweep(address)' }],
        }),
    });
    const r = await lookup4byteSelectors([SEL_SWEEP], { fetchImpl });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      const lookup = r.results.get(SEL_SWEEP);
      expect(lookup?.candidates[0]?.risky).toBe(true);
      expect(lookup?.anyRisky).toBe(true);
    }
  });

  it('handles multi-candidate responses', async () => {
    const fetchImpl = makeFetch({
      [SEL_TRANSFER]: async () =>
        jsonResponse({
          results: [
            { text_signature: 'transfer(address,uint256)' },
            { text_signature: 'TRANSFER(address,uint256)' },
          ],
        }),
    });
    const r = await lookup4byteSelectors([SEL_TRANSFER], { fetchImpl });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.results.get(SEL_TRANSFER)?.candidates.length).toBe(2);
    }
  });

  it('returns empty candidates on HTTP 404 (selector unknown)', async () => {
    const fetchImpl = makeFetch({
      [SEL_UNKNOWN]: async () => new Response('not found', { status: 404 }),
    });
    const r = await lookup4byteSelectors([SEL_UNKNOWN], { fetchImpl });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      const lookup = r.results.get(SEL_UNKNOWN);
      expect(lookup?.candidates).toEqual([]);
      expect(lookup?.anyRisky).toBe(false);
    }
  });

  it('maps HTTP 429 to rate_limited error', async () => {
    const fetchImpl = makeFetch({
      [SEL_TRANSFER]: async () => new Response('', { status: 429 }),
    });
    const r = await lookup4byteSelectors([SEL_TRANSFER], { fetchImpl });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.error.reason).toBe('rate_limited');
  });

  it('maps HTTP 5xx to server_error', async () => {
    const fetchImpl = makeFetch({
      [SEL_TRANSFER]: async () => new Response('', { status: 503 }),
    });
    const r = await lookup4byteSelectors([SEL_TRANSFER], { fetchImpl });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.error.reason).toBe('server_error');
      expect(r.error.httpStatus).toBe(503);
    }
  });

  it('maps malformed JSON to malformed_response', async () => {
    const fetchImpl = makeFetch({
      [SEL_TRANSFER]: async () =>
        new Response('garbage', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    });
    const r = await lookup4byteSelectors([SEL_TRANSFER], { fetchImpl });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.error.reason).toBe('malformed_response');
  });

  it('rejects malformed selector inputs without making any network call', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return jsonResponse({});
    }) as unknown as FetchLike;
    const r = await lookup4byteSelectors(['0xabc' as `0x${string}`], { fetchImpl });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.error.reason).toBe('malformed_response');
    expect(calls).toBe(0);
  });

  it('drops entries with non-string text_signature instead of failing the whole batch', async () => {
    const fetchImpl = makeFetch({
      [SEL_TRANSFER]: async () =>
        jsonResponse({
          results: [
            { text_signature: 'transfer(address,uint256)' },
            { text_signature: null },
            { other: 'shape' },
          ],
        }),
    });
    const r = await lookup4byteSelectors([SEL_TRANSFER], { fetchImpl });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.results.get(SEL_TRANSFER)?.candidates.length).toBe(1);
    }
  });

  it('looks up multiple selectors in parallel', async () => {
    const fetchImpl = makeFetch({
      [SEL_TRANSFER]: async () => jsonResponse({ results: [{ text_signature: 'transfer(address,uint256)' }] }),
      [SEL_SWEEP]: async () => jsonResponse({ results: [{ text_signature: 'sweep(address)' }] }),
    });
    const r = await lookup4byteSelectors([SEL_TRANSFER, SEL_SWEEP], { fetchImpl });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.results.size).toBe(2);
      expect(r.results.get(SEL_TRANSFER)?.anyRisky).toBe(false);
      expect(r.results.get(SEL_SWEEP)?.anyRisky).toBe(true);
    }
  });
});
