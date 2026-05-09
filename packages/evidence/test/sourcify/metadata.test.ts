import { describe, expect, it, vi } from 'vitest';

import { fetchSourcifyMetadata } from '../../src/sourcify/metadata.js';
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

const verifiedBody = {
  match: 'exact_match',
  abi: [
    { type: 'function', name: 'totalAssets', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  ],
  compilerSettings: { optimizer: { enabled: true, runs: 200 } },
  sources: {
    'src/Vault.sol': { content: 'pragma solidity ^0.8.24;' },
  },
  storageLayout: {
    storage: [
      { slot: '0', offset: 0, type: 't_uint256', label: 'totalAssets', contract: 'Vault' },
      { slot: '1', offset: 0, type: 't_address', label: 'admin' },
    ],
    types: {
      t_uint256: { encoding: 'inplace', label: 'uint256', numberOfBytes: '32' },
    },
  },
};

describe('fetchSourcifyMetadata', () => {
  it('builds the v2 URL with fields=all', async () => {
    let observedUrl: string | undefined;
    const fetchImpl = makeFetch(async (url) => {
      observedUrl = url;
      return jsonResponse(verifiedBody);
    });
    await fetchSourcifyMetadata(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(observedUrl).toBe(`${SOURCIFY_BASE_URL}/contract/${CHAIN_ID}/${ADDRESS}?fields=all`);
  });

  it('parses the full Sourcify response into SourcifyMetadata', async () => {
    const fetchImpl = makeFetch(async () => jsonResponse(verifiedBody));
    const result = await fetchSourcifyMetadata(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value.match).toBe('exact_match');
      expect(result.value.abi?.length).toBe(1);
      expect(result.value.compilerSettings).toEqual({ optimizer: { enabled: true, runs: 200 } });
      expect(result.value.sources?.['src/Vault.sol']?.content).toContain('pragma solidity');
      expect(result.value.storageLayout?.storage[0]?.label).toBe('totalAssets');
      expect(result.value.storageLayout?.storage[1]?.label).toBe('admin');
    }
  });

  it('returns success with storageLayout=null when the field is missing (older contracts)', async () => {
    const body = { ...verifiedBody, storageLayout: null };
    const fetchImpl = makeFetch(async () => jsonResponse(body));
    const result = await fetchSourcifyMetadata(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value.storageLayout).toBeNull();
      expect(result.value.match).toBe('exact_match');
    }
  });

  it('returns success with abi=null when ABI is missing', async () => {
    const body = { ...verifiedBody, abi: null };
    const fetchImpl = makeFetch(async () => jsonResponse(body));
    const result = await fetchSourcifyMetadata(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.value.abi).toBeNull();
  });

  it('drops malformed source entries instead of failing the whole response', async () => {
    const body = {
      ...verifiedBody,
      sources: {
        'src/Vault.sol': { content: 'ok' },
        'src/Bad.sol': { notContent: 'x' },
        'src/Bad2.sol': null,
      },
    };
    const fetchImpl = makeFetch(async () => jsonResponse(body));
    const result = await fetchSourcifyMetadata(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(Object.keys(result.value.sources ?? {})).toEqual(['src/Vault.sol']);
    }
  });

  it('maps HTTP 404 to match=not_found with all metadata fields null', async () => {
    const fetchImpl = makeFetch(async () => new Response('Not Found', { status: 404 }));
    const result = await fetchSourcifyMetadata(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value.match).toBe('not_found');
      expect(result.value.abi).toBeNull();
      expect(result.value.compilerSettings).toBeNull();
      expect(result.value.sources).toBeNull();
      expect(result.value.storageLayout).toBeNull();
    }
  });

  it('maps HTTP 429 to rate_limited', async () => {
    const fetchImpl = makeFetch(async () => new Response('', { status: 429 }));
    const result = await fetchSourcifyMetadata(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') expect(result.error.reason).toBe('rate_limited');
  });

  it('maps HTTP 5xx to server_error', async () => {
    const fetchImpl = makeFetch(async () => new Response('', { status: 502 }));
    const result = await fetchSourcifyMetadata(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.reason).toBe('server_error');
      expect(result.error.httpStatus).toBe(502);
    }
  });

  it('maps malformed JSON to malformed_response', async () => {
    const fetchImpl = makeFetch(
      async () =>
        new Response('garbage', { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const result = await fetchSourcifyMetadata(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') expect(result.error.reason).toBe('malformed_response');
  });

  it('maps unknown match string to malformed_response', async () => {
    const fetchImpl = makeFetch(async () => jsonResponse({ ...verifiedBody, match: 'sometimes' }));
    const result = await fetchSourcifyMetadata(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') expect(result.error.reason).toBe('malformed_response');
  });

  it('maps fetch throw to network_error', async () => {
    const fetchImpl = makeFetch(async () => {
      throw new Error('connection refused');
    });
    const result = await fetchSourcifyMetadata(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.reason).toBe('network_error');
      expect(result.error.message).toContain('connection refused');
    }
  });
});
