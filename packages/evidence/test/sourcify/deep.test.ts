import { describe, expect, it, vi } from 'vitest';

import { NetworkUnavailable } from '../../src/network/retry.js';
import {
  SOURCIFY_DEEP_FIELDS,
  fetchSourcifyDeep,
} from '../../src/sourcify/deep.js';

const ADDR = '0x1111111111111111111111111111111111111111' as const;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function makeFetch(handler: (url: string) => Response | Promise<Response>) {
  return vi.fn(async (input: string) => handler(input));
}

const happyBody = {
  match: 'exact_match',
  creationMatch: 'exact_match',
  runtimeMatch: 'match',
  compilation: {
    compiler: 'solc',
    compilerVersion: '0.8.24+commit.abcdef0a',
    language: 'Solidity',
    evmVersion: 'paris',
    optimizer: { enabled: true, runs: 200 },
    name: 'VaultV1',
    fullyQualifiedName: 'src/VaultV1.sol:VaultV1',
  },
  signatures: {
    function: {
      '0xa9059cbb': 'transfer(address,uint256)',
      '0x70a08231': 'balanceOf(address)',
    },
    event: {
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': 'Transfer(address,address,uint256)',
    },
  },
  metadata: {
    sources: {
      'src/VaultV1.sol': { license: 'MIT' },
      'src/lib/Math.sol': { license: 'GPL-3.0' },
      'src/lib/NoLicense.sol': {},
    },
  },
  userdoc: { kind: 'user', methods: { 'transfer(address,uint256)': { notice: 'Move tokens' } } },
  devdoc: { kind: 'dev', methods: { 'transfer(address,uint256)': { details: 'Inherits from ERC20' } } },
  proxyResolution: {
    isProxy: true,
    proxyType: 'EIP1967Proxy',
    implementations: [
      { address: '0x2222222222222222222222222222222222222222', name: 'VaultV1' },
      { address: '0x3333333333333333333333333333333333333333' },
    ],
  },
};

describe('fetchSourcifyDeep', () => {
  describe('URL construction', () => {
    it('builds URL with default deep fields CSV', async () => {
      let captured = '';
      const fetchImpl = makeFetch((url) => {
        captured = url;
        return jsonResponse(200, { match: 'exact_match' });
      });
      const result = await fetchSourcifyDeep(11155111, ADDR, { fetchImpl });
      expect(result.kind).toBe('ok');
      expect(captured).toBe(
        `https://sourcify.dev/server/v2/contract/11155111/${ADDR}?fields=${SOURCIFY_DEEP_FIELDS.join(',')}`,
      );
    });

    it('respects a custom field selector list', async () => {
      let captured = '';
      const fetchImpl = makeFetch((url) => {
        captured = url;
        return jsonResponse(200, { match: 'exact_match' });
      });
      await fetchSourcifyDeep(1, ADDR, {
        fetchImpl,
        fields: ['runtimeMatch', 'compilation'],
      });
      expect(captured).toContain('?fields=runtimeMatch,compilation');
    });

    it('uses the provided baseUrl override', async () => {
      let captured = '';
      const fetchImpl = makeFetch((url) => {
        captured = url;
        return jsonResponse(200, { match: 'exact_match' });
      });
      await fetchSourcifyDeep(1, ADDR, { fetchImpl, baseUrl: 'https://example.test/api/v2' });
      expect(captured.startsWith('https://example.test/api/v2/contract/1/')).toBe(true);
    });

    it('does NOT include match in the field selector (Sourcify v2 rejects fields=match)', () => {
      // Reads as a smoke check on the canonical list. fetchSourcifyStatus has
      // the same workaround note — keeping it locked here too.
      expect(SOURCIFY_DEEP_FIELDS as ReadonlyArray<string>).not.toContain('match');
    });
  });

  describe('happy path parsing', () => {
    it('returns fully parsed deep response', async () => {
      const fetchImpl = makeFetch(() => jsonResponse(200, happyBody));
      const result = await fetchSourcifyDeep(11155111, ADDR, { fetchImpl });

      expect(result.kind).toBe('ok');
      if (result.kind !== 'ok') return;
      const v = result.value;

      expect(v.match).toBe('exact_match');
      expect(v.creationMatch).toBe('exact_match');
      expect(v.runtimeMatch).toBe('match');

      expect(v.compilation).toEqual({
        compiler: 'solc',
        compilerVersion: '0.8.24+commit.abcdef0a',
        language: 'Solidity',
        evmVersion: 'paris',
        optimizerEnabled: true,
        optimizerRuns: 200,
        contractName: 'VaultV1',
        fullyQualifiedName: 'src/VaultV1.sol:VaultV1',
      });

      expect(v.functionSignatures).toEqual([
        { selector: '0xa9059cbb', signature: 'transfer(address,uint256)' },
        { selector: '0x70a08231', signature: 'balanceOf(address)' },
      ]);
      expect(v.eventSignatures).toEqual([
        { topicHash: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', signature: 'Transfer(address,address,uint256)' },
      ]);

      // License extraction skips entries missing a `license` string.
      expect(v.licenses).toEqual([
        { path: 'src/VaultV1.sol', license: 'MIT' },
        { path: 'src/lib/Math.sol', license: 'GPL-3.0' },
      ]);

      expect(v.userdoc).toEqual(happyBody.userdoc);
      expect(v.devdoc).toEqual(happyBody.devdoc);

      expect(v.proxyResolution).toEqual({
        isProxy: true,
        proxyType: 'EIP1967Proxy',
        implementations: [
          { address: '0x2222222222222222222222222222222222222222', name: 'VaultV1' },
          { address: '0x3333333333333333333333333333333333333333', name: null },
        ],
      });
    });

    it('returns null subfields when corresponding sections are absent', async () => {
      const fetchImpl = makeFetch(() => jsonResponse(200, { match: 'exact_match' }));
      const result = await fetchSourcifyDeep(1, ADDR, { fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind !== 'ok') return;
      expect(result.value.compilation).toBeNull();
      expect(result.value.functionSignatures).toBeNull();
      expect(result.value.eventSignatures).toBeNull();
      expect(result.value.licenses).toBeNull();
      expect(result.value.userdoc).toBeNull();
      expect(result.value.devdoc).toBeNull();
      expect(result.value.proxyResolution).toBeNull();
    });

    it('skips proxy implementation entries with malformed addresses', async () => {
      const body = {
        match: 'exact_match',
        proxyResolution: {
          isProxy: true,
          proxyType: 'EIP1967Proxy',
          implementations: [
            { address: '0x2222222222222222222222222222222222222222' },
            { address: 'not-an-address' },
            { name: 'no-address-field' },
          ],
        },
      };
      const fetchImpl = makeFetch(() => jsonResponse(200, body));
      const result = await fetchSourcifyDeep(1, ADDR, { fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind !== 'ok') return;
      expect(result.value.proxyResolution?.implementations).toEqual([
        { address: '0x2222222222222222222222222222222222222222', name: null },
      ]);
    });
  });

  describe('match-level handling', () => {
    it('returns not_found shape on HTTP 404', async () => {
      const fetchImpl = makeFetch(() => jsonResponse(404, { error: 'Not Found' }));
      const result = await fetchSourcifyDeep(1, ADDR, { fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.match).toBe('not_found');
        expect(result.value.creationMatch).toBeNull();
      }
    });

    it('treats null/missing top-level match as not_found', async () => {
      const fetchImpl = makeFetch(() => jsonResponse(200, { match: null }));
      const result = await fetchSourcifyDeep(1, ADDR, { fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') expect(result.value.match).toBe('not_found');
    });

    it('rejects unknown top-level match string as malformed_response', async () => {
      const fetchImpl = makeFetch(() => jsonResponse(200, { match: 'partial_match_v3' }));
      const result = await fetchSourcifyDeep(1, ADDR, { fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.error.reason).toBe('malformed_response');
    });
  });

  describe('error paths', () => {
    it('returns rate_limited on HTTP 429', async () => {
      const fetchImpl = makeFetch(() => jsonResponse(429, { error: 'rate limited' }));
      const result = await fetchSourcifyDeep(1, ADDR, { fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.error.reason).toBe('rate_limited');
        expect(result.error.httpStatus).toBe(429);
      }
    });

    it('returns server_error on HTTP 500', async () => {
      const fetchImpl = makeFetch(() => jsonResponse(503, { error: 'down' }));
      const result = await fetchSourcifyDeep(1, ADDR, { fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.error.reason).toBe('server_error');
        expect(result.error.httpStatus).toBe(503);
      }
    });

    it('returns server_error on unexpected non-2xx (e.g. 400 from a bad selector)', async () => {
      const fetchImpl = makeFetch(() => jsonResponse(400, { error: 'bad selector' }));
      const result = await fetchSourcifyDeep(1, ADDR, { fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.error.reason).toBe('server_error');
        expect(result.error.httpStatus).toBe(400);
      }
    });

    it('returns network_error when fetch throws', async () => {
      const fetchImpl = vi.fn(async () => {
        throw new TypeError('connection refused');
      });
      const result = await fetchSourcifyDeep(1, ADDR, { fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.error.reason).toBe('network_error');
    });

    it('returns network_error when retry layer surfaces NetworkUnavailable', async () => {
      const fetchImpl = vi.fn(async () => {
        throw new NetworkUnavailable(3, new Error('econnreset'));
      });
      const result = await fetchSourcifyDeep(1, ADDR, { fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.error.reason).toBe('network_error');
    });

    it('returns malformed_response when body is not JSON', async () => {
      const fetchImpl = vi.fn(async () =>
        new Response('<html>not json</html>', { status: 200, headers: { 'content-type': 'text/html' } }),
      );
      const result = await fetchSourcifyDeep(1, ADDR, { fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.error.reason).toBe('malformed_response');
    });

    it('returns malformed_response when body is a JSON primitive', async () => {
      const fetchImpl = vi.fn(async () =>
        new Response(JSON.stringify(null), { status: 200, headers: { 'content-type': 'application/json' } }),
      );
      const result = await fetchSourcifyDeep(1, ADDR, { fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.error.reason).toBe('malformed_response');
    });
  });
});
