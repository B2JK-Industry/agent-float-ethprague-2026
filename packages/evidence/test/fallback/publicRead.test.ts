import { createPublicClient, custom, type EIP1193Parameters, type PublicRpcSchema } from 'viem';
import { sepolia } from 'viem/chains';
import { describe, expect, it, vi } from 'vitest';

import { runPublicReadFallback } from '../../src/fallback/publicRead.js';
import type { FetchLike } from '../../src/sourcify/types.js';

type RpcRequest = EIP1193Parameters<PublicRpcSchema>;

const ADDRESS: `0x${string}` = '0x1111111111111111111111111111111111111111';
const IMPL: `0x${string}` = '0x222222222222222222222222222222222222BEEF';
const PADDED_IMPL = `0x000000000000000000000000${IMPL.slice(2).toLowerCase()}` as const;
const ZERO_SLOT =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

interface ClientStub {
  ensAddressFor?: Map<string, `0x${string}`>;
  storageReturn?: `0x${string}` | (() => Promise<`0x${string}`>);
  storageThrows?: boolean;
  ensAddressThrows?: boolean;
}

function makeClient(stub: ClientStub) {
  const client = createPublicClient({
    chain: sepolia,
    transport: custom({
      async request(args) {
        const req = args as RpcRequest;
        if (req.method === 'eth_getStorageAt') {
          if (stub.storageThrows) throw new Error('rpc-down');
          if (typeof stub.storageReturn === 'function') return await stub.storageReturn();
          return stub.storageReturn ?? ZERO_SLOT;
        }
        throw new Error(`unmocked rpc method: ${req.method}`);
      },
    }),
  });
  // Override getEnsAddress so we don't have to mock the universal resolver chain.
  type GetEnsAddress = (typeof client)['getEnsAddress'];
  const replacement = (async ({ name }: { name: string }) => {
    if (stub.ensAddressThrows) throw new Error('ens-rpc-down');
    return stub.ensAddressFor?.get(name) ?? null;
  }) as unknown as GetEnsAddress;
  Object.defineProperty(client, 'getEnsAddress', { value: replacement, configurable: true });
  return client;
}

function makeFetch(handlers: {
  status: (chainId: number, address: string) => Promise<Response>;
  metadata: (chainId: number, address: string) => Promise<Response>;
}): FetchLike {
  return vi.fn(async (url: string) => {
    const m = url.match(/\/contract\/(\d+)\/(0x[a-fA-F0-9]+)\?fields=(\w+)/);
    if (!m) return new Response('bad url', { status: 400 });
    const chainId = Number(m[1]);
    const address = m[2] ?? '';
    const fields = m[3];
    if (fields === 'runtimeMatch') return handlers.status(chainId, address);
    if (fields === 'all') return handlers.metadata(chainId, address);
    return new Response('unknown fields', { status: 400 });
  }) as unknown as FetchLike;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('runPublicReadFallback', () => {
  it('rejects empty / blank input as invalid_input', async () => {
    const r = await runPublicReadFallback('   ');
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.reason).toBe('invalid_input');
  });

  it('rejects garbage that is neither address nor ENS-shaped name', async () => {
    const r = await runPublicReadFallback('not-an-address-or-name', {
      chainId: sepolia.id,
      client: makeClient({}),
    });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.reason).toBe('invalid_input');
  });

  it('rejects unsupported chain id without an injected client', async () => {
    const r = await runPublicReadFallback(ADDRESS, { chainId: 424242 });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.reason).toBe('unsupported_chain');
  });

  it('handles a raw address: reads EIP-1967 + Sourcify status + metadata', async () => {
    const client = makeClient({ storageReturn: PADDED_IMPL });
    const fetchImpl = makeFetch({
      status: async () => jsonResponse({ match: 'exact_match' }),
      metadata: async () => jsonResponse({ match: 'exact_match', abi: [], compilerSettings: {}, sources: {}, storageLayout: null }),
    });
    const r = await runPublicReadFallback(ADDRESS, { chainId: sepolia.id, client, fetchImpl });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.mode).toBe('public-read');
      expect(r.confidence).toBe('public-read');
      expect(r.inputKind).toBe('address');
      expect(r.proxyAddress.toLowerCase()).toBe(ADDRESS.toLowerCase());
      expect(r.currentImplementation?.toLowerCase()).toBe(IMPL.toLowerCase());
      expect(r.sourcifyStatus).toBe('exact_match');
      expect(r.sourcifyMetadata?.match).toBe('exact_match');
    }
  });

  it('handles an ENS name resolving to an addr record', async () => {
    const client = makeClient({
      ensAddressFor: new Map([['vault.demo.upgradesiren.eth', ADDRESS]]),
      storageReturn: PADDED_IMPL,
    });
    const fetchImpl = makeFetch({
      status: async () => jsonResponse({ match: 'match' }),
      metadata: async () => jsonResponse({ match: 'match' }),
    });
    const r = await runPublicReadFallback('vault.demo.upgradesiren.eth', {
      chainId: sepolia.id,
      client,
      fetchImpl,
    });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.inputKind).toBe('ens_name');
      expect(r.inputName).toBe('vault.demo.upgradesiren.eth');
      expect(r.proxyAddress.toLowerCase()).toBe(ADDRESS.toLowerCase());
      expect(r.sourcifyStatus).toBe('match');
    }
  });

  it('returns ens_not_resolved when ENS name has no addr record', async () => {
    const client = makeClient({ ensAddressFor: new Map() });
    const r = await runPublicReadFallback('ghost.eth', { chainId: sepolia.id, client });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.reason).toBe('ens_not_resolved');
  });

  it('returns rpc_error when getEnsAddress throws', async () => {
    const client = makeClient({ ensAddressThrows: true });
    const r = await runPublicReadFallback('vault.demo.upgradesiren.eth', { chainId: sepolia.id, client });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.reason).toBe('rpc_error');
      expect(r.message).toContain('getEnsAddress');
    }
  });

  it('returns rpc_error when EIP-1967 read throws', async () => {
    const client = makeClient({ storageThrows: true });
    const r = await runPublicReadFallback(ADDRESS, { chainId: sepolia.id, client });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.reason).toBe('rpc_error');
  });

  it('returns ok with currentImplementation: null when slot is zero (not an EIP-1967 proxy)', async () => {
    const client = makeClient({ storageReturn: ZERO_SLOT });
    // No fetch should be attempted; we can confirm by passing a fetch that throws
    const fetchImpl = makeFetch({
      status: async () => {
        throw new Error('should not be called');
      },
      metadata: async () => {
        throw new Error('should not be called');
      },
    });
    const r = await runPublicReadFallback(ADDRESS, { chainId: sepolia.id, client, fetchImpl });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.currentImplementation).toBeNull();
      expect(r.sourcifyStatus).toBeNull();
      expect(r.sourcifyMetadata).toBeNull();
      expect(r.notes.some((n) => n.includes('slot is zero'))).toBe(true);
    }
  });

  it('records sourcify error reasons in notes but still returns ok', async () => {
    const client = makeClient({ storageReturn: PADDED_IMPL });
    const fetchImpl = makeFetch({
      status: async () => new Response('rate limit', { status: 429 }),
      metadata: async () => new Response('boom', { status: 502 }),
    });
    const r = await runPublicReadFallback(ADDRESS, { chainId: sepolia.id, client, fetchImpl });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.sourcifyStatus).toBeNull();
      expect(r.sourcifyMetadata).toBeNull();
      expect(r.notes.find((n) => n.includes('rate_limited'))).toBeTruthy();
      expect(r.notes.find((n) => n.includes('server_error'))).toBeTruthy();
    }
  });

  it('never returns confidence: operator-signed', async () => {
    const client = makeClient({ storageReturn: PADDED_IMPL });
    const fetchImpl = makeFetch({
      status: async () => jsonResponse({ match: 'exact_match' }),
      metadata: async () => jsonResponse({ match: 'exact_match' }),
    });
    const r = await runPublicReadFallback(ADDRESS, { chainId: sepolia.id, client, fetchImpl });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      // Type-level check: confidence union is fixed, but assert at runtime too
      expect(r.confidence).not.toBe('operator-signed');
      expect(r.confidence).toBe('public-read');
    }
  });
});
