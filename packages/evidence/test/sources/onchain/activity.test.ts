import { createPublicClient, custom, type EIP1193Parameters, type PublicClient, type PublicRpcSchema } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { describe, expect, it } from 'vitest';

import { fetchOnchainActivity } from '../../../src/sources/onchain/activity.js';

type RpcRequest = EIP1193Parameters<PublicRpcSchema>;

const ADDR = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;

interface MockOptions {
  readonly latestBlock?: bigint;
  // Map block number → nonce. Block keys may be omitted; default 0.
  readonly nonceByBlock?: ReadonlyMap<bigint, number>;
  readonly nonceAtLatest?: number;
  // Throw on the i-th getTransactionCount call (0-indexed). Used to test
  // partial-degrade paths.
  readonly throwOnNthNonce?: number;
  readonly throwOnGetBlockNumber?: boolean;
  readonly throwOnGetBlock?: boolean;
  // Map block number → timestamp seconds.
  readonly tsByBlock?: ReadonlyMap<bigint, bigint>;
}

interface MockTracker {
  nonceCalls: number;
  blockNumberCalls: number;
  getBlockCalls: number;
  // Last block argument seen by getTransactionCount.
  lastNonceBlock: bigint | null;
}

function makeClient(opts: MockOptions): { client: PublicClient; tracker: MockTracker } {
  const tracker: MockTracker = {
    nonceCalls: 0,
    blockNumberCalls: 0,
    getBlockCalls: 0,
    lastNonceBlock: null,
  };

  const client = createPublicClient({
    chain: mainnet,
    transport: custom({
      async request(args) {
        const req = args as RpcRequest;
        throw new Error(`unmocked rpc method: ${req.method}`);
      },
    }),
  }) as PublicClient;

  type GetBlockNumber = (typeof client)['getBlockNumber'];
  const replGbn = (async () => {
    tracker.blockNumberCalls += 1;
    if (opts.throwOnGetBlockNumber) throw new Error('rpc down');
    return opts.latestBlock ?? 100n;
  }) as unknown as GetBlockNumber;
  Object.defineProperty(client, 'getBlockNumber', { value: replGbn, configurable: true });

  type GetTransactionCount = (typeof client)['getTransactionCount'];
  const replGtc = (async ({ blockNumber }: { blockNumber: bigint }) => {
    const callIndex = tracker.nonceCalls;
    tracker.nonceCalls += 1;
    tracker.lastNonceBlock = blockNumber;
    if (opts.throwOnNthNonce === callIndex) throw new Error(`rpc fail @ call ${callIndex}`);
    if (blockNumber === (opts.latestBlock ?? 100n) && opts.nonceAtLatest !== undefined) {
      return opts.nonceAtLatest;
    }
    return opts.nonceByBlock?.get(blockNumber) ?? 0;
  }) as unknown as GetTransactionCount;
  Object.defineProperty(client, 'getTransactionCount', { value: replGtc, configurable: true });

  type GetBlock = (typeof client)['getBlock'];
  const replGb = (async ({ blockNumber }: { blockNumber: bigint }) => {
    tracker.getBlockCalls += 1;
    if (opts.throwOnGetBlock) throw new Error('block fetch down');
    const ts = opts.tsByBlock?.get(blockNumber) ?? 1700000000n + blockNumber;
    return { number: blockNumber, timestamp: ts } as { number: bigint; timestamp: bigint };
  }) as unknown as GetBlock;
  Object.defineProperty(client, 'getBlock', { value: replGb, configurable: true });

  return { client, tracker };
}

describe('fetchOnchainActivity', () => {
  describe('input validation', () => {
    it('returns unsupported_chain when chainId is unknown and no client is injected', async () => {
      const result = await fetchOnchainActivity(999_999, ADDR);
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('unsupported_chain');
    });

    it('returns rpc_error when fromBlock > latestBlock', async () => {
      const { client } = makeClient({ latestBlock: 50n });
      const result = await fetchOnchainActivity(mainnet.id, ADDR, {
        client,
        fromBlock: 1000n,
      });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.reason).toBe('rpc_error');
        expect(result.message).toContain('fromBlock');
      }
    });
  });

  describe('zero-activity addresses', () => {
    it('returns nonce=0 with firstTxBlock null when address never sent a tx', async () => {
      const { client } = makeClient({ latestBlock: 100n, nonceAtLatest: 0 });
      const result = await fetchOnchainActivity(mainnet.id, ADDR, { client });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.nonce).toBe(0);
        expect(result.value.firstTxBlock).toBeNull();
        expect(result.value.firstTxTimestamp).toBeNull();
        expect(result.value.latestBlock).toBe(100n);
      }
    });

    it('does NOT do binary search when nonce at latest is zero', async () => {
      const { client, tracker } = makeClient({ latestBlock: 100n, nonceAtLatest: 0 });
      await fetchOnchainActivity(mainnet.id, ADDR, { client });
      // 1 call: nonce@latest only
      expect(tracker.nonceCalls).toBe(1);
      expect(tracker.getBlockCalls).toBe(0);
    });
  });

  describe('binary search', () => {
    it('finds firstTxBlock at midpoint when half the chain has activity', async () => {
      // Address first sends a tx at block 60. nonce(B<60) = 0, nonce(B>=60) > 0.
      const nonceByBlock = new Map<bigint, number>();
      for (let b = 60n; b <= 100n; b++) nonceByBlock.set(b, 1);
      const { client } = makeClient({ latestBlock: 100n, nonceAtLatest: 1, nonceByBlock });
      const result = await fetchOnchainActivity(mainnet.id, ADDR, { client });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.nonce).toBe(1);
        expect(result.value.firstTxBlock).toBe(60n);
      }
    });

    it('returns fromBlock when nonce at fromBlock is already non-zero (skip search)', async () => {
      const nonceByBlock = new Map<bigint, number>();
      for (let b = 0n; b <= 100n; b++) nonceByBlock.set(b, 5);
      const { client, tracker } = makeClient({ latestBlock: 100n, nonceAtLatest: 5, nonceByBlock });
      const result = await fetchOnchainActivity(mainnet.id, ADDR, { client });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') expect(result.value.firstTxBlock).toBe(0n);
      // Calls: nonce@latest, nonce@fromBlock. No binary-search recursion.
      expect(tracker.nonceCalls).toBe(2);
    });

    it('honours fromBlock as lower bound', async () => {
      // Real first tx is at block 30, but we ask the search to start at 50.
      // Search must report block 50 (the lower bound) as the answer.
      const nonceByBlock = new Map<bigint, number>();
      for (let b = 30n; b <= 100n; b++) nonceByBlock.set(b, 1);
      const { client } = makeClient({ latestBlock: 100n, nonceAtLatest: 1, nonceByBlock });
      const result = await fetchOnchainActivity(mainnet.id, ADDR, {
        client,
        fromBlock: 50n,
      });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') expect(result.value.firstTxBlock).toBe(50n);
    });

    it('finds firstTxBlock = latestBlock when only the very last block has activity', async () => {
      const nonceByBlock = new Map<bigint, number>([[100n, 1]]);
      const { client } = makeClient({ latestBlock: 100n, nonceAtLatest: 1, nonceByBlock });
      const result = await fetchOnchainActivity(mainnet.id, ADDR, { client });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') expect(result.value.firstTxBlock).toBe(100n);
    });

    it('uses log2-shaped call count (not linear in block range)', async () => {
      const nonceByBlock = new Map<bigint, number>();
      for (let b = 500n; b <= 1000n; b++) nonceByBlock.set(b, 1);
      const { client, tracker } = makeClient({ latestBlock: 1000n, nonceAtLatest: 1, nonceByBlock });
      await fetchOnchainActivity(mainnet.id, ADDR, { client });
      // ceil(log2(1001)) = 10 search steps + nonce@latest + nonce@fromBlock
      // (≤ 13 total). Must be far below the 1001 a linear scan would do.
      expect(tracker.nonceCalls).toBeLessThan(20);
    });
  });

  describe('firstTxTimestamp', () => {
    it('reads timestamp via getBlock(firstTxBlock)', async () => {
      const nonceByBlock = new Map<bigint, number>([[42n, 1], [43n, 1], [100n, 1]]);
      for (let b = 42n; b <= 100n; b++) nonceByBlock.set(b, 1);
      const tsByBlock = new Map<bigint, bigint>([[42n, 1700001234n]]);
      const { client } = makeClient({
        latestBlock: 100n,
        nonceAtLatest: 1,
        nonceByBlock,
        tsByBlock,
      });
      const result = await fetchOnchainActivity(mainnet.id, ADDR, { client });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.firstTxBlock).toBe(42n);
        expect(result.value.firstTxTimestamp).toBe(1700001234);
      }
    });

    it('degrades to null timestamp when getBlock throws (firstTxBlock still surfaced)', async () => {
      const nonceByBlock = new Map<bigint, number>();
      for (let b = 50n; b <= 100n; b++) nonceByBlock.set(b, 1);
      const { client } = makeClient({
        latestBlock: 100n,
        nonceAtLatest: 1,
        nonceByBlock,
        throwOnGetBlock: true,
      });
      const result = await fetchOnchainActivity(mainnet.id, ADDR, { client });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.firstTxBlock).toBe(50n);
        expect(result.value.firstTxTimestamp).toBeNull();
      }
    });
  });

  describe('error and degraded paths', () => {
    it('returns rpc_error when getBlockNumber throws', async () => {
      const { client } = makeClient({ throwOnGetBlockNumber: true });
      const result = await fetchOnchainActivity(mainnet.id, ADDR, { client });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.reason).toBe('rpc_error');
        expect(result.message).toContain('getBlockNumber');
      }
    });

    it('returns rpc_error when nonce@latest throws', async () => {
      const { client } = makeClient({ latestBlock: 100n, throwOnNthNonce: 0 });
      const result = await fetchOnchainActivity(mainnet.id, ADDR, { client });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.reason).toBe('rpc_error');
        expect(result.message).toContain('getTransactionCount(latest)');
      }
    });

    it('returns ok with firstTxBlock=null when binary search throws mid-flight', async () => {
      const nonceByBlock = new Map<bigint, number>();
      for (let b = 50n; b <= 100n; b++) nonceByBlock.set(b, 1);
      // Throw on the 3rd nonce call: 0 = nonce@latest (succeeds), 1 = nonce@fromBlock (succeeds), 2 = first binary-search probe (throws).
      const { client } = makeClient({
        latestBlock: 100n,
        nonceAtLatest: 1,
        nonceByBlock,
        throwOnNthNonce: 2,
      });
      const result = await fetchOnchainActivity(mainnet.id, ADDR, { client });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.nonce).toBe(1);
        expect(result.value.firstTxBlock).toBeNull();
        expect(result.value.firstTxTimestamp).toBeNull();
      }
    });
  });

  describe('chain selection', () => {
    it('accepts sepolia chainId without an injected client', async () => {
      // Should not return unsupported_chain. We expect rpc_error from a real
      // network call timing out or similar; just assert it does NOT short
      // out at chain validation.
      const result = await fetchOnchainActivity(sepolia.id, ADDR, { rpcUrl: 'http://127.0.0.1:0' });
      if (result.kind === 'error') {
        expect(result.reason).not.toBe('unsupported_chain');
      }
    });
  });
});
