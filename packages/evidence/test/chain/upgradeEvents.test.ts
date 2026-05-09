import { createPublicClient, custom, encodeEventTopics, type EIP1193Parameters, type PublicRpcSchema } from 'viem';
import { sepolia } from 'viem/chains';
import { describe, expect, it } from 'vitest';

import {
  UPGRADED_EVENT,
  readUpgradeEvents,
} from '../../src/chain/upgradeEvents.js';

type RpcRequest = EIP1193Parameters<PublicRpcSchema>;

const PROXY: `0x${string}` = '0x1111111111111111111111111111111111111111';
const IMPL_A: `0x${string}` = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const IMPL_B: `0x${string}` = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const IMPL_C: `0x${string}` = '0xcccccccccccccccccccccccccccccccccccccccc';

interface FakeLog {
  blockNumber: bigint;
  logIndex: number;
  transactionHash: `0x${string}`;
  newImplementation: `0x${string}`;
}

function buildLog(opts: FakeLog) {
  const topics = encodeEventTopics({
    abi: [UPGRADED_EVENT],
    eventName: 'Upgraded',
    args: { implementation: opts.newImplementation },
  });
  return {
    address: PROXY,
    topics,
    data: '0x' as const,
    blockNumber: `0x${opts.blockNumber.toString(16)}` as `0x${string}`,
    transactionHash: opts.transactionHash,
    logIndex: `0x${opts.logIndex.toString(16)}` as `0x${string}`,
    blockHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
    transactionIndex: '0x0' as `0x${string}`,
    removed: false,
  };
}

interface MockClientConfig {
  latestBlock?: bigint;
  logsByRange?: Array<{ from: bigint; to: bigint; logs: FakeLog[] }>;
  throwOnRange?: boolean;
  throwOnBlockNumber?: boolean;
}

function makeMockClient(cfg: MockClientConfig) {
  const calls: Array<{ method: string; from?: bigint; to?: bigint }> = [];

  const client = createPublicClient({
    chain: sepolia,
    transport: custom({
      async request(args) {
        const req = args as RpcRequest;
        if (req.method === 'eth_blockNumber') {
          calls.push({ method: req.method });
          if (cfg.throwOnBlockNumber) throw new Error('rpc-down');
          const latest = cfg.latestBlock ?? 1000n;
          return `0x${latest.toString(16)}` as `0x${string}`;
        }
        if (req.method === 'eth_getLogs') {
          if (cfg.throwOnRange) throw new Error('range too wide');
          const params = req.params as readonly [{ fromBlock: `0x${string}`; toBlock: `0x${string}` }];
          const fromBlock = BigInt(params[0].fromBlock);
          const toBlock = BigInt(params[0].toBlock);
          calls.push({ method: req.method, from: fromBlock, to: toBlock });
          const matchingLogs: FakeLog[] = [];
          for (const range of cfg.logsByRange ?? []) {
            for (const log of range.logs) {
              if (log.blockNumber >= fromBlock && log.blockNumber <= toBlock) {
                matchingLogs.push(log);
              }
            }
          }
          return matchingLogs.map(buildLog);
        }
        throw new Error(`unmocked: ${req.method}`);
      },
    }),
  });

  return { client, calls };
}

describe('UPGRADED_EVENT signature', () => {
  it('parses to event Upgraded(address indexed implementation)', () => {
    expect(UPGRADED_EVENT.type).toBe('event');
    if (UPGRADED_EVENT.type === 'event') {
      expect(UPGRADED_EVENT.name).toBe('Upgraded');
      expect(UPGRADED_EVENT.inputs[0]?.name).toBe('implementation');
      expect(UPGRADED_EVENT.inputs[0]?.type).toBe('address');
      expect(UPGRADED_EVENT.inputs[0]?.indexed).toBe(true);
    }
  });
});

describe('readUpgradeEvents', () => {
  it('returns an empty array when the proxy has no Upgraded events', async () => {
    const { client } = makeMockClient({ latestBlock: 100n, logsByRange: [] });
    const result = await readUpgradeEvents(sepolia.id, PROXY, { client });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.events).toEqual([]);
      expect(result.fromBlock).toBe(0n);
      expect(result.toBlock).toBe(100n);
    }
  });

  it('returns events sorted ascending by block number', async () => {
    const logs: FakeLog[] = [
      { blockNumber: 50n, logIndex: 0, transactionHash: ('0x' + 'aa'.repeat(32)) as `0x${string}`, newImplementation: IMPL_B },
      { blockNumber: 10n, logIndex: 0, transactionHash: ('0x' + 'bb'.repeat(32)) as `0x${string}`, newImplementation: IMPL_A },
      { blockNumber: 200n, logIndex: 1, transactionHash: ('0x' + 'cc'.repeat(32)) as `0x${string}`, newImplementation: IMPL_C },
    ];
    const { client } = makeMockClient({
      latestBlock: 1000n,
      logsByRange: [{ from: 0n, to: 1000n, logs }],
    });
    const result = await readUpgradeEvents(sepolia.id, PROXY, { client });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.events.map((e) => e.blockNumber)).toEqual([10n, 50n, 200n]);
      expect(result.events.map((e) => e.newImplementation.toLowerCase())).toEqual([
        IMPL_A.toLowerCase(),
        IMPL_B.toLowerCase(),
        IMPL_C.toLowerCase(),
      ]);
    }
  });

  it('paginates across chunks when the range exceeds chunkSize', async () => {
    const logs: FakeLog[] = [
      { blockNumber: 5n, logIndex: 0, transactionHash: ('0x' + '11'.repeat(32)) as `0x${string}`, newImplementation: IMPL_A },
      { blockNumber: 1500n, logIndex: 0, transactionHash: ('0x' + '22'.repeat(32)) as `0x${string}`, newImplementation: IMPL_B },
      { blockNumber: 2500n, logIndex: 0, transactionHash: ('0x' + '33'.repeat(32)) as `0x${string}`, newImplementation: IMPL_C },
    ];
    const { client, calls } = makeMockClient({
      latestBlock: 3000n,
      logsByRange: [{ from: 0n, to: 3000n, logs }],
    });
    const result = await readUpgradeEvents(sepolia.id, PROXY, { client, chunkSize: 1000n });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.chunksFetched).toBe(4);
      expect(result.events.map((e) => e.blockNumber)).toEqual([5n, 1500n, 2500n]);
    }
    const getLogsCalls = calls.filter((c) => c.method === 'eth_getLogs');
    expect(getLogsCalls.length).toBe(4);
    expect(getLogsCalls[0]?.from).toBe(0n);
    expect(getLogsCalls[0]?.to).toBe(999n);
    expect(getLogsCalls[3]?.from).toBe(3000n);
    expect(getLogsCalls[3]?.to).toBe(3000n);
  });

  it('respects an explicit toBlock instead of querying the latest block', async () => {
    const logs: FakeLog[] = [
      { blockNumber: 50n, logIndex: 0, transactionHash: ('0x' + '44'.repeat(32)) as `0x${string}`, newImplementation: IMPL_A },
    ];
    const { client, calls } = makeMockClient({
      latestBlock: 99999n,
      logsByRange: [{ from: 0n, to: 99999n, logs }],
    });
    const result = await readUpgradeEvents(sepolia.id, PROXY, {
      client,
      fromBlock: 0n,
      toBlock: 100n,
    });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.toBlock).toBe(100n);
      expect(result.events.length).toBe(1);
    }
    expect(calls.find((c) => c.method === 'eth_blockNumber')).toBeUndefined();
  });

  it('returns rpc_error when getBlockNumber throws', async () => {
    const { client } = makeMockClient({ throwOnBlockNumber: true });
    const result = await readUpgradeEvents(sepolia.id, PROXY, { client });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.reason).toBe('rpc_error');
      expect(result.message).toContain('getBlockNumber');
    }
  });

  it('returns rpc_error when getLogs throws', async () => {
    const { client } = makeMockClient({ latestBlock: 100n, throwOnRange: true });
    const result = await readUpgradeEvents(sepolia.id, PROXY, { client });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.reason).toBe('rpc_error');
      expect(result.message).toContain('getLogs');
    }
  });

  it('returns unsupported_chain for an unknown chainId without an injected client', async () => {
    const result = await readUpgradeEvents(424242, PROXY);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.reason).toBe('unsupported_chain');
    }
  });
});
