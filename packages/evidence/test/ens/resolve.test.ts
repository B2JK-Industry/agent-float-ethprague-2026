import { createPublicClient, custom, type EIP1193Parameters, type PublicRpcSchema } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { describe, expect, it, vi } from 'vitest';

import { resolveEnsRecords } from '../../src/ens/resolve.js';
import { UPGRADE_SIREN_RECORD_KEYS } from '../../src/ens/types.js';

type RpcRequest = EIP1193Parameters<PublicRpcSchema>;

function makeClient(getEnsTextHandler: (key: string) => Promise<string | null>) {
  const client = createPublicClient({
    chain: mainnet,
    transport: custom({
      async request(args) {
        const req = args as RpcRequest;
        throw new Error(`unmocked rpc method: ${req.method}`);
      },
    }),
  });
  // Override getEnsText directly to bypass the multi-step ENS resolver under the hood.
  type GetEnsText = (typeof client)['getEnsText'];
  const replacement = (async ({ key }: { key: string }) => getEnsTextHandler(key)) as unknown as GetEnsText;
  Object.defineProperty(client, 'getEnsText', { value: replacement, configurable: true });
  return client;
}

describe('resolveEnsRecords', () => {
  it('returns invalid_name for syntactically broken inputs', async () => {
    for (const bad of ['', '   ', 'no-tld', 'two..dots.eth', '.leading.eth', 'trailing.', 'notld.']) {
      const result = await resolveEnsRecords(bad);
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('invalid_name');
    }
  });

  it('returns unsupported_chain when chainId is unknown and no client is injected', async () => {
    const result = await resolveEnsRecords('vault.demo.upgradesiren.eth', { chainId: 999_999 });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') expect(result.reason).toBe('unsupported_chain');
  });

  it('returns ok with all records present and proper flags when ENS publishes the full set', async () => {
    const recordValues: Record<string, string | null> = {
      [UPGRADE_SIREN_RECORD_KEYS.chainId]: '11155111',
      [UPGRADE_SIREN_RECORD_KEYS.proxy]: '0x1111111111111111111111111111111111111111',
      [UPGRADE_SIREN_RECORD_KEYS.owner]: '0x2222222222222222222222222222222222222222',
      [UPGRADE_SIREN_RECORD_KEYS.schema]: 'ipfs://QmRecordSchema',
      [UPGRADE_SIREN_RECORD_KEYS.upgradeManifest]:
        '{"schema":"siren-upgrade-manifest@1","chainId":11155111}',
    };
    const client = makeClient(async (key) => recordValues[key] ?? null);

    const result = await resolveEnsRecords('vault.demo.upgradesiren.eth', {
      chainId: sepolia.id,
      client,
    });

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.records.chainId).toBe('11155111');
      expect(result.records.proxy).toBe('0x1111111111111111111111111111111111111111');
      expect(result.records.owner).toBe('0x2222222222222222222222222222222222222222');
      expect(result.records.schema).toBe('ipfs://QmRecordSchema');
      expect(result.records.upgradeManifestRaw).toContain('siren-upgrade-manifest@1');
      expect(result.flags).toEqual({
        chainIdPresent: true,
        proxyPresent: true,
        ownerPresent: true,
        schemaPresent: true,
        upgradeManifestPresent: true,
        agentContextPresent: false,
        agentEndpointWebPresent: false,
        agentEndpointMcpPresent: false,
      });
      expect(result.anyUpgradeSirenRecordPresent).toBe(true);
      expect(result.chainId).toBe(sepolia.id);
    }
  });

  it('returns ok with partial records and matching flags when only some records exist', async () => {
    const present = new Set<string>([
      UPGRADE_SIREN_RECORD_KEYS.chainId,
      UPGRADE_SIREN_RECORD_KEYS.proxy,
    ]);
    const client = makeClient(async (key) => (present.has(key) ? '0xabc' : null));

    const result = await resolveEnsRecords('partial.upgradesiren.eth', {
      chainId: sepolia.id,
      client,
    });

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.flags.chainIdPresent).toBe(true);
      expect(result.flags.proxyPresent).toBe(true);
      expect(result.flags.ownerPresent).toBe(false);
      expect(result.flags.schemaPresent).toBe(false);
      expect(result.flags.upgradeManifestPresent).toBe(false);
      expect(result.anyUpgradeSirenRecordPresent).toBe(true);
    }
  });

  it('returns ok with all records null when ENS name has none of the upgrade-siren records', async () => {
    const client = makeClient(async () => null);

    const result = await resolveEnsRecords('plain-name.eth', {
      chainId: mainnet.id,
      client,
    });

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.records.chainId).toBeNull();
      expect(result.records.proxy).toBeNull();
      expect(result.records.owner).toBeNull();
      expect(result.records.schema).toBeNull();
      expect(result.records.upgradeManifestRaw).toBeNull();
      expect(result.anyUpgradeSirenRecordPresent).toBe(false);
    }
  });

  it('returns rpc_error when getEnsText throws for any key', async () => {
    const client = makeClient(async (key) => {
      if (key === UPGRADE_SIREN_RECORD_KEYS.upgradeManifest) {
        throw new Error('rpc transport timeout');
      }
      return null;
    });

    const result = await resolveEnsRecords('vault.demo.upgradesiren.eth', {
      chainId: sepolia.id,
      client,
    });

    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.reason).toBe('rpc_error');
      expect(result.message).toContain('rpc transport timeout');
    }
  });

  it('queries every upgrade-siren and ENSIP-26 key exactly once', async () => {
    const seen: string[] = [];
    const client = makeClient(async (key) => {
      seen.push(key);
      return null;
    });

    await resolveEnsRecords('vault.demo.upgradesiren.eth', {
      chainId: sepolia.id,
      client,
    });

    const expectedKeys = [
      ...Object.values(UPGRADE_SIREN_RECORD_KEYS),
      'agent-context',
      'agent-endpoint[web]',
      'agent-endpoint[mcp]',
    ].sort();
    expect(seen.sort()).toEqual(expectedKeys);
  });

  it('uses the injected client without instantiating a default RPC transport', async () => {
    const seen = vi.fn(async () => null);
    const client = makeClient(seen as unknown as (key: string) => Promise<string | null>);
    await resolveEnsRecords('vault.demo.upgradesiren.eth', {
      chainId: 424242, // unknown chain — but injected client should bypass the resolver
      client,
    });
    expect(seen).toHaveBeenCalledTimes(8);
  });
});
