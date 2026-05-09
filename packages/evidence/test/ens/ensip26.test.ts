import { createPublicClient, custom, type EIP1193Parameters, type PublicRpcSchema } from 'viem';
import { mainnet } from 'viem/chains';
import { describe, expect, it } from 'vitest';

import { resolveEnsRecords } from '../../src/ens/resolve.js';
import {
  ENSIP_26_RECORD_KEYS,
  UPGRADE_SIREN_RECORD_KEYS,
} from '../../src/ens/types.js';

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
  type GetEnsText = (typeof client)['getEnsText'];
  const replacement = (async ({ key }: { key: string }) => getEnsTextHandler(key)) as unknown as GetEnsText;
  Object.defineProperty(client, 'getEnsText', { value: replacement, configurable: true });
  return client;
}

describe('ENSIP-26 record reading', () => {
  it('exports the three ENSIP-26 record keys verbatim', () => {
    expect(ENSIP_26_RECORD_KEYS.agentContext).toBe('agent-context');
    expect(ENSIP_26_RECORD_KEYS.agentEndpointWeb).toBe('agent-endpoint[web]');
    expect(ENSIP_26_RECORD_KEYS.agentEndpointMcp).toBe('agent-endpoint[mcp]');
  });

  it('returns ok with all ENSIP-26 records populated when ENS publishes them', async () => {
    const recordValues: Record<string, string | null> = {
      [ENSIP_26_RECORD_KEYS.agentContext]: 'Upgrade Siren risk report for vault.demo.upgradesiren.eth',
      [ENSIP_26_RECORD_KEYS.agentEndpointWeb]: 'https://upgradesiren.app/r/vault.demo.upgradesiren.eth',
      [ENSIP_26_RECORD_KEYS.agentEndpointMcp]: 'https://mcp.upgradesiren.app/x',
    };
    const client = makeClient(async (key) => recordValues[key] ?? null);

    const result = await resolveEnsRecords('vault.demo.upgradesiren.eth', {
      chainId: mainnet.id,
      client,
    });

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.agentContext).toContain('Upgrade Siren risk report');
      expect(result.agentEndpointWeb).toContain('upgradesiren.app/r/');
      expect(result.agentEndpointMcp).toContain('mcp.upgradesiren.app');
      expect(result.flags.agentContextPresent).toBe(true);
      expect(result.flags.agentEndpointWebPresent).toBe(true);
      expect(result.flags.agentEndpointMcpPresent).toBe(true);
    }
  });

  it('returns ok with all three ENSIP-26 fields null when ENS does not publish them', async () => {
    const client = makeClient(async () => null);
    const result = await resolveEnsRecords('plain-name.eth', {
      chainId: mainnet.id,
      client,
    });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.agentContext).toBeNull();
      expect(result.agentEndpointWeb).toBeNull();
      expect(result.agentEndpointMcp).toBeNull();
      expect(result.flags.agentContextPresent).toBe(false);
      expect(result.flags.agentEndpointWebPresent).toBe(false);
      expect(result.flags.agentEndpointMcpPresent).toBe(false);
    }
  });

  it('does not affect anyUpgradeSirenRecordPresent (ENSIP-26 records are independent)', async () => {
    const client = makeClient(async (key) => {
      // Only ENSIP-26 records present, no upgrade-siren:* records.
      if (key.startsWith('agent-')) return 'whatever';
      return null;
    });
    const result = await resolveEnsRecords('plain-name.eth', {
      chainId: mainnet.id,
      client,
    });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.anyUpgradeSirenRecordPresent).toBe(false);
      expect(result.flags.agentContextPresent).toBe(true);
    }
  });

  it('mixed presence: upgrade-siren records present, ENSIP-26 records absent', async () => {
    const client = makeClient(async (key) =>
      key === UPGRADE_SIREN_RECORD_KEYS.proxy ? '0x1111111111111111111111111111111111111111' : null,
    );
    const result = await resolveEnsRecords('vault.demo.upgradesiren.eth', {
      chainId: mainnet.id,
      client,
    });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.flags.proxyPresent).toBe(true);
      expect(result.flags.agentContextPresent).toBe(false);
      expect(result.anyUpgradeSirenRecordPresent).toBe(true);
    }
  });
});
