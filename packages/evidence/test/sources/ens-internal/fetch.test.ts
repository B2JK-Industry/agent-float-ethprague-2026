import { describe, expect, it, vi } from 'vitest';

import { NetworkUnavailable } from '../../../src/network/retry.js';
import { ENS_SUBGRAPH_ID } from '../../../src/sources/ens-internal/types.js';
import { fetchEnsInternalSignals } from '../../../src/sources/ens-internal/fetch.js';

const NAME = 'someagent.eth';
const KEY = 'graph-pat-test-key';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function makeFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  return vi.fn(async (input: string, init?: RequestInit) => handler(input, init));
}

const happyDomain = {
  id: '0x...',
  name: NAME,
  createdAt: '1700000000',
  subdomainCount: '7',
  resolver: {
    id: '0xres',
    texts: ['url', 'description', 'avatar', 'agent-bench:bench_manifest', 'agent-context'],
    events: [{ blockNumber: '19500000' }],
  },
};

describe('fetchEnsInternalSignals', () => {
  describe('input validation', () => {
    it('returns missing_api_key when apiKey is empty string', async () => {
      const result = await fetchEnsInternalSignals(NAME, { apiKey: '' });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('missing_api_key');
    });

    it('returns invalid_name for syntactically broken inputs', async () => {
      for (const bad of ['', 'no-tld', 'two..dots.eth', '.leading.eth']) {
        const result = await fetchEnsInternalSignals(bad, { apiKey: KEY });
        expect(result.kind).toBe('error');
        if (result.kind === 'error') expect(result.reason).toBe('invalid_name');
      }
    });
  });

  describe('URL construction', () => {
    it('targets the Graph Network gateway URL with the given API key + ENS subgraph id', async () => {
      let captured = '';
      const fetchImpl = makeFetch((url) => {
        captured = url;
        return jsonResponse(200, { data: { domains: [] } });
      });
      await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(captured).toBe(
        `https://gateway.thegraph.com/api/${KEY}/subgraphs/id/${ENS_SUBGRAPH_ID}`,
      );
    });

    it('respects subgraphId override', async () => {
      let captured = '';
      const fetchImpl = makeFetch((url) => {
        captured = url;
        return jsonResponse(200, { data: { domains: [] } });
      });
      await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl, subgraphId: 'CUSTOM_ID' });
      expect(captured.endsWith('/subgraphs/id/CUSTOM_ID')).toBe(true);
    });

    it('respects gatewayBaseUrl override', async () => {
      let captured = '';
      const fetchImpl = makeFetch((url) => {
        captured = url;
        return jsonResponse(200, { data: { domains: [] } });
      });
      await fetchEnsInternalSignals(NAME, {
        apiKey: KEY,
        fetchImpl,
        gatewayBaseUrl: 'https://example.test',
      });
      expect(captured.startsWith('https://example.test/api/')).toBe(true);
    });

    it('sends a POST with GraphQL query body and JSON content-type', async () => {
      let capturedInit: RequestInit | undefined;
      const fetchImpl = makeFetch((_url, init) => {
        capturedInit = init;
        return jsonResponse(200, { data: { domains: [] } });
      });
      await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(capturedInit?.method).toBe('POST');
      const headers = capturedInit?.headers as Record<string, string> | undefined;
      expect(headers?.['content-type']).toBe('application/json');
      const body = JSON.parse(String(capturedInit?.body)) as Record<string, unknown>;
      expect(typeof body['query']).toBe('string');
      expect((body['variables'] as Record<string, unknown>)['name']).toBe(NAME);
    });
  });

  describe('happy path parsing', () => {
    it('returns parsed signals when the subgraph returns one domain row', async () => {
      const fetchImpl = makeFetch(() => jsonResponse(200, { data: { domains: [happyDomain] } }));
      const result = await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind !== 'ok') return;
      expect(result.value.name).toBe(NAME);
      expect(result.value.registrationDate).toBe(1700000000);
      expect(result.value.subnameCount).toBe(7);
      expect(result.value.textRecordCount).toBe(5);
      expect(result.value.lastRecordUpdateBlock).toBe(19500000n);
    });

    it('returns empty-but-shaped signals when subgraph has no row for the name', async () => {
      const fetchImpl = makeFetch(() => jsonResponse(200, { data: { domains: [] } }));
      const result = await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.registrationDate).toBeNull();
        expect(result.value.subnameCount).toBe(0);
        expect(result.value.textRecordCount).toBe(0);
        expect(result.value.lastRecordUpdateBlock).toBeNull();
      }
    });

    it('treats domain row with null resolver as zero text records / no last-update', async () => {
      const fetchImpl = makeFetch(() =>
        jsonResponse(200, {
          data: {
            domains: [{ createdAt: '1700000000', subdomainCount: '0', resolver: null }],
          },
        }),
      );
      const result = await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.textRecordCount).toBe(0);
        expect(result.value.lastRecordUpdateBlock).toBeNull();
      }
    });

    // audit-round-7 P1 #6 regression: the GraphQL query previously
    // filtered with `where: { event: "TextChanged" }` — a predicate the
    // ENS subgraph schema doesn't support. With the broken filter
    // ignored, non-TextChanged events at the head of the events list
    // would set `lastRecordUpdateBlock` to a block that wasn't actually
    // a record update. Fix: drop the broken filter, ask for `__typename`,
    // skip non-TextChanged in code.
    it('skips non-TextChanged events and picks the first TextChanged blockNumber (audit-round-7 P1 #6)', async () => {
      const fetchImpl = makeFetch(() =>
        jsonResponse(200, {
          data: {
            domains: [
              {
                createdAt: '1700000000',
                subdomainCount: '0',
                resolver: {
                  texts: ['url'],
                  // Real subgraph response: mixed event types ordered
                  // desc by blockNumber. The most-recent two are
                  // AddrChanged + ContenthashChanged; only the third
                  // is TextChanged. The parser must skip the first two.
                  events: [
                    { __typename: 'AddrChanged', blockNumber: '20000000' },
                    { __typename: 'ContenthashChanged', blockNumber: '19_900_000' },
                    { __typename: 'TextChanged', blockNumber: '19500000' },
                    { __typename: 'TextChanged', blockNumber: '19000000' },
                  ],
                },
              },
            ],
          },
        }),
      );
      const result = await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        // Must NOT be 20_000_000n (AddrChanged) or 19_900_000n (ContenthashChanged).
        expect(result.value.lastRecordUpdateBlock).toBe(19_500_000n);
      }
    });

    it('returns null when the events head window contains no TextChanged (audit-round-7 P1 #6)', async () => {
      const fetchImpl = makeFetch(() =>
        jsonResponse(200, {
          data: {
            domains: [
              {
                createdAt: '1700000000',
                subdomainCount: '0',
                resolver: {
                  texts: [],
                  events: [
                    { __typename: 'AddrChanged', blockNumber: '20000000' },
                    { __typename: 'ContenthashChanged', blockNumber: '19900000' },
                  ],
                },
              },
            ],
          },
        }),
      );
      const result = await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.lastRecordUpdateBlock).toBeNull();
      }
    });

    it('treats resolver without events as null lastRecordUpdateBlock', async () => {
      const fetchImpl = makeFetch(() =>
        jsonResponse(200, {
          data: {
            domains: [
              {
                createdAt: '1700000000',
                subdomainCount: '0',
                resolver: { texts: ['url'], events: [] },
              },
            ],
          },
        }),
      );
      const result = await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') expect(result.value.lastRecordUpdateBlock).toBeNull();
    });

    it('parses createdAt as numeric (not just string)', async () => {
      const fetchImpl = makeFetch(() =>
        jsonResponse(200, {
          data: { domains: [{ createdAt: 1700000123, subdomainCount: 4, resolver: null }] },
        }),
      );
      const result = await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.registrationDate).toBe(1700000123);
        expect(result.value.subnameCount).toBe(4);
      }
    });
  });

  describe('error paths', () => {
    it('returns rate_limited on HTTP 429', async () => {
      const fetchImpl = makeFetch(() => jsonResponse(429, {}));
      const result = await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.reason).toBe('rate_limited');
        expect(result.httpStatus).toBe(429);
      }
    });

    it('returns server_error on HTTP 5xx', async () => {
      const fetchImpl = makeFetch(() => jsonResponse(503, {}));
      const result = await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('server_error');
    });

    it('returns server_error on unexpected non-2xx (e.g. 401 unauthorized API key)', async () => {
      const fetchImpl = makeFetch(() => jsonResponse(401, { error: 'unauthorized' }));
      const result = await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('server_error');
    });

    it('returns network_error when fetch throws', async () => {
      const fetchImpl = vi.fn(async () => {
        throw new TypeError('connection refused');
      });
      const result = await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('network_error');
    });

    it('returns network_error when retry layer surfaces NetworkUnavailable', async () => {
      const fetchImpl = vi.fn(async () => {
        throw new NetworkUnavailable(3, new Error('econnreset'));
      });
      const result = await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('network_error');
    });

    it('returns malformed_response when body is not JSON', async () => {
      const fetchImpl = vi.fn(
        async () =>
          new Response('<html>not json</html>', {
            status: 200,
            headers: { 'content-type': 'text/html' },
          }),
      );
      const result = await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('malformed_response');
    });

    it('returns malformed_response when body lacks data block', async () => {
      const fetchImpl = makeFetch(() => jsonResponse(200, { something: 'else' }));
      const result = await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('malformed_response');
    });

    it('returns malformed_response when data.domains is not an array', async () => {
      const fetchImpl = makeFetch(() => jsonResponse(200, { data: { domains: 'wrong' } }));
      const result = await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('malformed_response');
    });

    it('returns graphql_error when response has errors[] block', async () => {
      const fetchImpl = makeFetch(() =>
        jsonResponse(200, { errors: [{ message: 'Subgraph indexing error' }] }),
      );
      const result = await fetchEnsInternalSignals(NAME, { apiKey: KEY, fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.reason).toBe('graphql_error');
        expect(result.message).toContain('Subgraph indexing error');
      }
    });
  });
});
