import {
  createPublicClient,
  custom,
  type Address as ViemAddress,
  type EIP1193Parameters,
  type PublicClient,
  type PublicRpcSchema,
} from 'viem';
import { mainnet } from 'viem/chains';
import { describe, expect, it, vi } from 'vitest';

import {
  AGENT_BENCH_MANIFEST_SCHEMA_V1,
  AGENT_BENCH_RECORD_KEYS,
  type SubjectManifest,
} from '@upgrade-siren/shared';

import { orchestrateSubject } from '../../src/bench/orchestrator.js';

type RpcRequest = EIP1193Parameters<PublicRpcSchema>;

const NAME = 'someagent.eth';
const PRIMARY = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const SOURCIFY_ADDR = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;

const fullManifest: SubjectManifest = {
  schema: AGENT_BENCH_MANIFEST_SCHEMA_V1,
  kind: 'ai-agent',
  sources: {
    sourcify: [{ chainId: 11155111, address: SOURCIFY_ADDR, label: 'Vault' }],
    github: { owner: 'vbuterin', verified: false, verificationGist: null },
    onchain: { primaryAddress: PRIMARY, claimedFirstTxHash: null },
    ensInternal: { rootName: NAME },
  },
  version: 1,
  previousManifestHash: null,
};

interface MockClientOptions {
  readonly recordValues: ReadonlyMap<string, string | null>;
  readonly latestBlock?: bigint;
  readonly nonceAtLatest?: number;
  readonly throwOnGetBlockNumber?: boolean;
}

function makeClient(opts: MockClientOptions): PublicClient {
  const client = createPublicClient({
    chain: mainnet,
    transport: custom({
      async request(args) {
        const req = args as RpcRequest;
        throw new Error(`unmocked rpc method: ${req.method}`);
      },
    }),
  }) as PublicClient;

  type GetEnsText = (typeof client)['getEnsText'];
  const replEnsText = (async ({ key }: { key: string }) =>
    opts.recordValues.get(key) ?? null) as unknown as GetEnsText;
  Object.defineProperty(client, 'getEnsText', { value: replEnsText, configurable: true });

  type GetEnsAddress = (typeof client)['getEnsAddress'];
  const replEnsAddress = (async () => null) as unknown as GetEnsAddress;
  Object.defineProperty(client, 'getEnsAddress', { value: replEnsAddress, configurable: true });

  type GetBlockNumber = (typeof client)['getBlockNumber'];
  const replGbn = (async () => {
    if (opts.throwOnGetBlockNumber) throw new Error('rpc down');
    return opts.latestBlock ?? 100n;
  }) as unknown as GetBlockNumber;
  Object.defineProperty(client, 'getBlockNumber', { value: replGbn, configurable: true });

  type GetTransactionCount = (typeof client)['getTransactionCount'];
  const replGtc = (async () => opts.nonceAtLatest ?? 0) as unknown as GetTransactionCount;
  Object.defineProperty(client, 'getTransactionCount', { value: replGtc, configurable: true });

  type GetBlock = (typeof client)['getBlock'];
  const replGb = (async ({ blockNumber }: { blockNumber: bigint }) =>
    ({ number: blockNumber, timestamp: 1700000000n + blockNumber } as unknown)) as unknown as GetBlock;
  Object.defineProperty(client, 'getBlock', { value: replGb, configurable: true });

  return client;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('orchestrateSubject', () => {
  describe('manifest mode', () => {
    it('assembles MultiSourceEvidence from a fully-populated manifest', async () => {
      const records = new Map<string, string | null>([
        [AGENT_BENCH_RECORD_KEYS.benchManifest, JSON.stringify(fullManifest)],
        [AGENT_BENCH_RECORD_KEYS.owner, PRIMARY],
      ]);
      const client = makeClient({ recordValues: records, nonceAtLatest: 0 });

      const fetchImpl = vi.fn(async (url: string) => {
        if (url.includes('/v2/contract/all-chains/')) return jsonResponse(200, []);
        if (url.includes('/v2/contract/')) {
          // Both fetchSourcifyDeep + fetchSourcifyMetadata hit /v2/contract/{chainId}/{address}.
          // Differentiate by ?fields= query.
          if (url.includes('fields=all')) {
            return jsonResponse(200, {
              match: 'exact_match',
              abi: [],
              compilerSettings: {},
              sources: { 'src/V.sol': { content: 'contract V is Ownable {}', license: 'MIT' } },
              storageLayout: { storage: [] },
            });
          }
          return jsonResponse(200, {
            match: 'exact_match',
            creationMatch: 'exact_match',
            runtimeMatch: 'exact_match',
            compilation: {
              compiler: 'solc',
              compilerVersion: '0.8.24+commit.abcdef0a',
              language: 'Solidity',
              optimizer: { enabled: true, runs: 200 },
            },
            metadata: { sources: { 'src/V.sol': { license: 'MIT' } } },
          });
        }
        if (url.includes('api.github.com/users/')) return jsonResponse(200, { login: 'vbuterin', public_repos: 5, followers: 12345 });
        if (url.includes('gateway.thegraph.com/')) return jsonResponse(200, { data: { domains: [] } });
        return jsonResponse(404, {});
      });

      const result = await orchestrateSubject(NAME, {
        client,
        sourcifyDeepOptions: { fetchImpl },
        metadataOptions: { fetchImpl },
        crossChainOptions: { fetchImpl },
        githubPat: 'ghp_test',
        githubOptions: { fetchImpl, pat: 'ghp_test' },
        graphApiKey: 'graph-test',
        ensInternalOptions: { apiKey: 'graph-test', fetchImpl },
      });

      expect(result.subject.mode).toBe('manifest');
      expect(result.subject.kind).toBe('ai-agent');
      expect(result.subject.primaryAddress).toBe(PRIMARY);
      expect(result.subject.manifest).toEqual(fullManifest);

      expect(result.sourcify).toHaveLength(1);
      expect(result.sourcify[0]?.kind).toBe('ok');

      // GitHub source attempted (PAT present + manifest claim).
      expect(result.github.kind).toBe('ok');

      // ENS-internal attempted (apiKey present).
      expect(result.ensInternal.kind).toBe('ok');

      // On-chain: defaults to mainnet + sepolia + manifest's sourcify chainId 11155111.
      // 11155111 is already in defaults so dedupe → 2 chains.
      expect(result.onchain.length).toBe(2);

      // No top-level failures expected.
      expect(result.failures).toEqual([]);
    });

    it('marks github as absent when PAT is omitted (does not register as failure)', async () => {
      const records = new Map<string, string | null>([
        [AGENT_BENCH_RECORD_KEYS.benchManifest, JSON.stringify(fullManifest)],
      ]);
      const client = makeClient({ recordValues: records });
      const fetchImpl = vi.fn(async () => jsonResponse(200, {}));
      const result = await orchestrateSubject(NAME, {
        client,
        sourcifyDeepOptions: { fetchImpl },
        metadataOptions: { fetchImpl },
        crossChainOptions: { fetchImpl },
        ensInternalOptions: { apiKey: 'k', fetchImpl },
        graphApiKey: 'k',
      });
      expect(result.github.kind).toBe('absent');
      expect(result.failures.find((f) => f.source === 'github')).toBeUndefined();
    });

    it('marks ens-internal absent when apiKey is omitted', async () => {
      const records = new Map<string, string | null>([
        [AGENT_BENCH_RECORD_KEYS.benchManifest, JSON.stringify(fullManifest)],
      ]);
      const client = makeClient({ recordValues: records });
      const fetchImpl = vi.fn(async () => jsonResponse(200, {}));
      const result = await orchestrateSubject(NAME, {
        client,
        sourcifyDeepOptions: { fetchImpl },
        metadataOptions: { fetchImpl },
        crossChainOptions: { fetchImpl },
      });
      expect(result.ensInternal.kind).toBe('absent');
      expect(result.failures.find((f) => f.source === 'ens-internal')).toBeUndefined();
    });

    it('records per-source failure without aborting other sources', async () => {
      const records = new Map<string, string | null>([
        [AGENT_BENCH_RECORD_KEYS.benchManifest, JSON.stringify(fullManifest)],
      ]);
      const client = makeClient({ recordValues: records });
      const fetchImpl = vi.fn(async (url: string) => {
        if (url.includes('/v2/contract/all-chains/')) return jsonResponse(200, []);
        if (url.includes('/v2/contract/')) return jsonResponse(503, {});
        if (url.includes('api.github.com/users/')) return jsonResponse(200, { login: 'vbuterin' });
        if (url.includes('gateway.thegraph.com/')) return jsonResponse(200, { data: { domains: [] } });
        return jsonResponse(404, {});
      });
      const result = await orchestrateSubject(NAME, {
        client,
        sourcifyDeepOptions: { fetchImpl },
        metadataOptions: { fetchImpl },
        crossChainOptions: { fetchImpl },
        githubPat: 'ghp_test',
        githubOptions: { fetchImpl, pat: 'ghp_test' },
        graphApiKey: 'k',
        ensInternalOptions: { apiKey: 'k', fetchImpl },
      });
      // Sourcify entry surfaces error; orchestrator does not throw.
      expect(result.sourcify[0]?.kind).toBe('error');
      // GitHub still attempted and succeeded.
      expect(result.github.kind).toBe('ok');
      // Failures array carries the sourcify error.
      expect(result.failures.find((f) => f.source === 'sourcify')).toBeDefined();
    });
  });

  describe('public-read mode', () => {
    it('falls back to inferSubjectFromPublicRead when manifest is absent', async () => {
      const records = new Map<string, string | null>(); // no records → no_manifest
      const client = createPublicClient({
        chain: mainnet,
        transport: custom({
          async request(args) {
            throw new Error(`unmocked rpc: ${(args as RpcRequest).method}`);
          },
        }),
      }) as PublicClient;
      type GetEnsText = (typeof client)['getEnsText'];
      Object.defineProperty(client, 'getEnsText', {
        value: (async () => null) as unknown as GetEnsText,
        configurable: true,
      });
      type GetEnsAddress = (typeof client)['getEnsAddress'];
      Object.defineProperty(client, 'getEnsAddress', {
        value: (async () => PRIMARY as unknown as ViemAddress) as unknown as GetEnsAddress,
        configurable: true,
      });
      type GetBlockNumber = (typeof client)['getBlockNumber'];
      Object.defineProperty(client, 'getBlockNumber', {
        value: (async () => 100n) as unknown as GetBlockNumber,
        configurable: true,
      });
      type GetTransactionCount = (typeof client)['getTransactionCount'];
      Object.defineProperty(client, 'getTransactionCount', {
        value: (async () => 0) as unknown as GetTransactionCount,
        configurable: true,
      });

      const fetchImpl = vi.fn(async (url: string) => {
        if (url.includes('/v2/contract/all-chains/')) {
          return jsonResponse(200, [
            { chainId: 1, address: SOURCIFY_ADDR, match: 'exact_match' },
          ]);
        }
        if (url.includes('/v2/contract/')) {
          return jsonResponse(200, {
            match: 'exact_match',
            creationMatch: 'exact_match',
            runtimeMatch: 'exact_match',
            metadata: { sources: { 'src/V.sol': { license: 'MIT' } } },
          });
        }
        return jsonResponse(404, {});
      });

      const result = await orchestrateSubject(NAME, {
        client,
        publicReadOptions: { client, sourcifyOptions: { fetchImpl } },
        sourcifyDeepOptions: { fetchImpl },
        metadataOptions: { fetchImpl },
        crossChainOptions: { fetchImpl },
      });

      expect(result.subject.mode).toBe('public-read');
      expect(result.subject.kind).toBeNull();
      expect(result.subject.primaryAddress).toBe(PRIMARY);
      expect(result.subject.manifest).toBeNull();
      expect(result.sourcify).toHaveLength(1);
      expect(result.github.kind).toBe('absent');
    });
  });

  describe('subject resolution failure', () => {
    it('surfaces invalid_name without throwing', async () => {
      const result = await orchestrateSubject('not-an-ens-name');
      expect(result.failures.find((f) => f.source === 'subject-resolve')).toBeDefined();
      expect(result.subject.manifest).toBeNull();
      expect(result.sourcify).toEqual([]);
      expect(result.github.kind).toBe('absent');
      expect(result.ensInternal.kind).toBe('absent');
    });
  });

  describe('chain dedupe', () => {
    it('does not duplicate chain fetches when manifest declares default chains', async () => {
      const m: SubjectManifest = {
        ...fullManifest,
        sources: {
          ...fullManifest.sources,
          sourcify: [
            { chainId: 1, address: SOURCIFY_ADDR, label: 'mainnet' },
            { chainId: 11155111, address: SOURCIFY_ADDR, label: 'sepolia' },
          ],
        },
      };
      const records = new Map<string, string | null>([
        [AGENT_BENCH_RECORD_KEYS.benchManifest, JSON.stringify(m)],
      ]);
      const client = makeClient({ recordValues: records });
      const fetchImpl = vi.fn(async () => jsonResponse(200, {}));
      const result = await orchestrateSubject(NAME, {
        client,
        sourcifyDeepOptions: { fetchImpl },
        metadataOptions: { fetchImpl },
        crossChainOptions: { fetchImpl },
      });
      // Defaults [1, 11155111] + manifest [1, 11155111] → dedupe to 2.
      expect(result.onchain).toHaveLength(2);
    });
  });
});
