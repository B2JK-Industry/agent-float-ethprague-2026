import { createPublicClient, custom, type EIP1193Parameters, type PublicRpcSchema } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { describe, expect, it } from 'vitest';

import {
  EnsResolutionCache,
  resolveEnsRecordsCached,
} from '../../src/ens/cache.js';

type RpcRequest = EIP1193Parameters<PublicRpcSchema>;

function makeStubClient(getEnsTextHandler: (key: string) => Promise<string | null>) {
  const client = createPublicClient({
    chain: mainnet,
    transport: custom({
      async request(args) {
        const req = args as RpcRequest;
        throw new Error(`unmocked rpc method: ${req.method}`);
      },
    }),
  });
  type GetEnsText = (typeof client)['getEnsText'];
  const replacement = (async ({ key }: { key: string }) => getEnsTextHandler(key)) as unknown as GetEnsText;
  Object.defineProperty(client, 'getEnsText', { value: replacement, configurable: true });
  return client;
}

describe('EnsResolutionCache', () => {
  it('keyFor namespaces by chainId and lowercases the name', () => {
    expect(EnsResolutionCache.keyFor('Vault.Demo.Upgradesiren.Eth', sepolia.id)).toBe(
      `${sepolia.id}:vault.demo.upgradesiren.eth`,
    );
  });

  it('returns undefined on a miss', () => {
    const cache = new EnsResolutionCache();
    expect(cache.get('vault.demo.upgradesiren.eth', sepolia.id)).toBeUndefined();
  });

  it('returns the stored value on a hit within TTL', () => {
    let now = 0;
    const cache = new EnsResolutionCache({ ttlMs: 1000, clock: () => now });
    const value = {
      kind: 'ok' as const,
      name: 'vault.eth',
      chainId: sepolia.id,
      records: { chainId: '11155111', proxy: null, owner: null, schema: null, upgradeManifestRaw: null },
      flags: {
        chainIdPresent: true,
        proxyPresent: false,
        ownerPresent: false,
        schemaPresent: false,
        upgradeManifestPresent: false,
        agentContextPresent: false,
        agentEndpointWebPresent: false,
        agentEndpointMcpPresent: false,
      },
      anyUpgradeSirenRecordPresent: true,
      agentContext: null,
      agentEndpointWeb: null,
      agentEndpointMcp: null,
    };
    cache.set('vault.eth', sepolia.id, value);
    now = 500;
    expect(cache.get('vault.eth', sepolia.id)).toBe(value);
  });

  it('expires entries after TTL', () => {
    let now = 0;
    const cache = new EnsResolutionCache({ ttlMs: 1000, clock: () => now });
    const value = {
      kind: 'ok' as const,
      name: 'vault.eth',
      chainId: sepolia.id,
      records: { chainId: null, proxy: null, owner: null, schema: null, upgradeManifestRaw: null },
      flags: {
        chainIdPresent: false,
        proxyPresent: false,
        ownerPresent: false,
        schemaPresent: false,
        upgradeManifestPresent: false,
        agentContextPresent: false,
        agentEndpointWebPresent: false,
        agentEndpointMcpPresent: false,
      },
      anyUpgradeSirenRecordPresent: false,
      agentContext: null,
      agentEndpointWeb: null,
      agentEndpointMcp: null,
    };
    cache.set('vault.eth', sepolia.id, value);
    now = 1000; // exactly at expiry
    expect(cache.get('vault.eth', sepolia.id)).toBeUndefined();
  });

  it('namespaces entries by chainId', () => {
    const cache = new EnsResolutionCache();
    cache.set('vault.eth', mainnet.id, {
      kind: 'error',
      reason: 'rpc_error',
      message: 'mainnet placeholder',
    });
    expect(cache.get('vault.eth', sepolia.id)).toBeUndefined();
  });

  it('respects maxEntries by evicting the oldest entry on overflow', () => {
    const cache = new EnsResolutionCache({ maxEntries: 2 });
    const value = {
      kind: 'error' as const,
      reason: 'rpc_error' as const,
      message: '',
    };
    cache.set('a.eth', sepolia.id, value);
    cache.set('b.eth', sepolia.id, value);
    cache.set('c.eth', sepolia.id, value); // evicts a.eth
    expect(cache.get('a.eth', sepolia.id)).toBeUndefined();
    expect(cache.get('b.eth', sepolia.id)).not.toBeUndefined();
    expect(cache.get('c.eth', sepolia.id)).not.toBeUndefined();
  });

  it('invalidate() removes an entry', () => {
    const cache = new EnsResolutionCache();
    cache.set('vault.eth', sepolia.id, {
      kind: 'error',
      reason: 'rpc_error',
      message: '',
    });
    cache.invalidate('vault.eth', sepolia.id);
    expect(cache.get('vault.eth', sepolia.id)).toBeUndefined();
  });
});

describe('resolveEnsRecordsCached', () => {
  it('hits the network on a miss and caches the result', async () => {
    let calls = 0;
    const client = makeStubClient(async () => {
      calls += 1;
      return null;
    });
    const cache = new EnsResolutionCache();
    const a = await resolveEnsRecordsCached('vault.demo.upgradesiren.eth', {
      chainId: sepolia.id,
      client,
      cache,
    });
    const b = await resolveEnsRecordsCached('vault.demo.upgradesiren.eth', {
      chainId: sepolia.id,
      client,
      cache,
    });
    expect(a.kind).toBe('ok');
    expect(b).toBe(a); // same reference returned from cache
    expect(calls).toBe(8); // first call read 8 records (5 upgrade-siren + 3 ENSIP-26 from US-031); second call short-circuited
  });

  it('does not cache error results', async () => {
    let calls = 0;
    const client = makeStubClient(async () => {
      calls += 1;
      throw new Error('rpc-down');
    });
    const cache = new EnsResolutionCache();
    const a = await resolveEnsRecordsCached('vault.demo.upgradesiren.eth', {
      chainId: sepolia.id,
      client,
      cache,
    });
    expect(a.kind).toBe('error');
    const b = await resolveEnsRecordsCached('vault.demo.upgradesiren.eth', {
      chainId: sepolia.id,
      client,
      cache,
    });
    expect(b.kind).toBe('error');
    expect(calls).toBeGreaterThan(5); // both calls hit the network
  });

  it('different chainIds are treated as distinct cache entries', async () => {
    let calls = 0;
    const client = makeStubClient(async () => {
      calls += 1;
      return null;
    });
    const cache = new EnsResolutionCache();
    await resolveEnsRecordsCached('vault.eth', { chainId: sepolia.id, client, cache });
    await resolveEnsRecordsCached('vault.eth', { chainId: mainnet.id, client, cache });
    expect(calls).toBe(16); // two cold lookups × 8 records (5 upgrade-siren + 3 ENSIP-26 from US-031), no cache hit between chains
  });
});
