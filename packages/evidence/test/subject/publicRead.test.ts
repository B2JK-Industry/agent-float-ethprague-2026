import {
  createPublicClient,
  custom,
  type Address as ViemAddress,
  type EIP1193Parameters,
  type PublicClient,
  type PublicRpcSchema,
} from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { describe, expect, it, vi } from 'vitest';

import { inferSubjectFromPublicRead } from '../../src/subject/publicRead.js';

type RpcRequest = EIP1193Parameters<PublicRpcSchema>;

const NAME = 'someagent.eth';
const ZERO = '0x0000000000000000000000000000000000000000';
const ADDR = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as ViemAddress;

function makeClient(
  addrFor: (name: string) => Promise<ViemAddress | null>,
  textFor: (key: string) => Promise<string | null> = async () => null,
): PublicClient {
  const client = createPublicClient({
    chain: mainnet,
    transport: custom({
      async request(args) {
        const req = args as RpcRequest;
        throw new Error(`unmocked rpc method: ${req.method}`);
      },
    }),
  }) as PublicClient;
  type GetEnsAddress = (typeof client)['getEnsAddress'];
  const repl = (async ({ name }: { name: string }) => addrFor(name)) as unknown as GetEnsAddress;
  Object.defineProperty(client, 'getEnsAddress', { value: repl, configurable: true });
  // C-13: public-read fallback now reads ENS text records in parallel
  // with addr(). Mock getEnsText so the test stays fast and hermetic;
  // by default returns null for every key (no inferred sources).
  type GetEnsText = (typeof client)['getEnsText'];
  const replText = (async ({ key }: { key: string }) => textFor(key)) as unknown as GetEnsText;
  Object.defineProperty(client, 'getEnsText', { value: replText, configurable: true });
  return client;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const sourcifyAllChainsBody = [
  { chainId: 1, address: '0x1111111111111111111111111111111111111111', match: 'exact_match' },
  { chainId: 11155111, address: '0x2222222222222222222222222222222222222222', match: 'match' },
];

describe('inferSubjectFromPublicRead', () => {
  describe('input validation', () => {
    it('returns invalid_name for syntactically broken inputs', async () => {
      for (const bad of ['', 'no-tld', 'two..dots.eth']) {
        const result = await inferSubjectFromPublicRead(bad);
        expect(result.kind).toBe('error');
        if (result.kind === 'error') expect(result.reason).toBe('invalid_name');
      }
    });

    it('returns unsupported_chain when chainId is unknown and no client is injected', async () => {
      const result = await inferSubjectFromPublicRead(NAME, { chainId: 999_999 });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('unsupported_chain');
    });
  });

  describe('happy path with primaryAddress', () => {
    it('returns inferred sources from ENS addr() + Sourcify all-chains', async () => {
      const client = makeClient(async () => ADDR);
      const sourcifyFetch = vi.fn(async () => jsonResponse(200, sourcifyAllChainsBody));
      const result = await inferSubjectFromPublicRead(NAME, {
        client,
        sourcifyOptions: { fetchImpl: sourcifyFetch },
      });
      expect(result.kind).toBe('ok');
      if (result.kind !== 'ok') return;
      expect(result.value.name).toBe(NAME);
      expect(result.value.primaryAddress).toBe(ADDR);
      expect(result.value.sources.onchain).toEqual({
        primaryAddress: ADDR,
        claimedFirstTxHash: null,
      });
      expect(result.value.sources.sourcify).toHaveLength(2);
      expect(result.value.sources.sourcify[0]).toEqual({
        chainId: 1,
        address: '0x1111111111111111111111111111111111111111',
        label: 'Discovered (chain 1)',
      });
    });

    // audit-round-7 P1 #8 regression: previously `promoteEntries` did
    // not filter by `match` level — `not_found` entries from the
    // Sourcify all-chains response were promoted as if they were
    // verified Sourcify rows. The orchestrator then ran a deep fetch
    // against an unverified address and surfaced an error in evidence,
    // confusing the score engine and the Sourcify drawer's pill count.
    // Fix: only `exact_match` and `match` entries are promoted.
    it('filters Sourcify all-chains rows to verified match levels (audit-round-7 P1 #8)', async () => {
      const client = makeClient(async () => ADDR);
      const mixedBody = [
        { chainId: 1, address: '0x1111111111111111111111111111111111111111', match: 'exact_match' },
        // Should be DROPPED — not_found means Sourcify saw the address
        // but had no verified source.
        { chainId: 137, address: '0x9999999999999999999999999999999999999999', match: 'not_found' },
        { chainId: 11155111, address: '0x2222222222222222222222222222222222222222', match: 'match' },
      ];
      const sourcifyFetch = vi.fn(async () => jsonResponse(200, mixedBody));
      const result = await inferSubjectFromPublicRead(NAME, {
        client,
        sourcifyOptions: { fetchImpl: sourcifyFetch },
      });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        // 2 promoted (exact_match + match), 1 dropped (not_found).
        expect(result.value.sources.sourcify).toHaveLength(2);
        // Discriminating: the polygon not_found entry must NOT appear.
        const promotedAddrs = result.value.sources.sourcify.map((e) => e.address);
        expect(promotedAddrs).not.toContain('0x9999999999999999999999999999999999999999');
      }
    });

    it('passes the addr through unchanged when the all-chains list is empty', async () => {
      const client = makeClient(async () => ADDR);
      const sourcifyFetch = vi.fn(async () => jsonResponse(200, []));
      const result = await inferSubjectFromPublicRead(NAME, {
        client,
        sourcifyOptions: { fetchImpl: sourcifyFetch },
      });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.primaryAddress).toBe(ADDR);
        expect(result.value.sources.sourcify).toEqual([]);
      }
    });
  });

  describe('subject without addr()', () => {
    it('returns ok with primaryAddress=null when ENS addr() returns null', async () => {
      const client = makeClient(async () => null);
      const sourcifyFetch = vi.fn(async () => jsonResponse(200, []));
      const result = await inferSubjectFromPublicRead(NAME, {
        client,
        sourcifyOptions: { fetchImpl: sourcifyFetch },
      });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.primaryAddress).toBeNull();
        expect(result.value.sources.onchain).toBeNull();
        expect(result.value.sources.sourcify).toEqual([]);
      }
      // Sourcify should NOT be hit when no primary address is known.
      expect(sourcifyFetch).not.toHaveBeenCalled();
    });

    it('treats zero address as no addr() (not a real contract reference)', async () => {
      const client = makeClient(async () => ZERO as ViemAddress);
      const sourcifyFetch = vi.fn(async () => jsonResponse(200, []));
      const result = await inferSubjectFromPublicRead(NAME, {
        client,
        sourcifyOptions: { fetchImpl: sourcifyFetch },
      });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') expect(result.value.primaryAddress).toBeNull();
      expect(sourcifyFetch).not.toHaveBeenCalled();
    });
  });

  // C-13 (audit-round-8) — DEMO-BLOCKER fix: public-read fallback must
  // read standard ENS text records (com.github, description, url,
  // com.twitter, com.discord, org.telegram) IN PARALLEL with addr() so
  // every non-curated ENS subject with a `com.github` value produces
  // a non-zero score. Memorable line "type any ENS name, see 0-100
  // benchmark" depends on this firing for vitalik.eth, letadlo.eth,
  // agent-*.eth — any name a judge might type during the demo.
  describe('C-13 ENS text-record inference', () => {
    it('synthesises an inferred GitHub source from com.github', async () => {
      const client = makeClient(async () => ADDR, async (key) => {
        if (key === 'com.github') return 'Artemstar';
        if (key === 'description') return 'Emerging Web3 PM, Prague.';
        return null;
      });
      const sourcifyFetch = vi.fn(async () => jsonResponse(200, []));
      const result = await inferSubjectFromPublicRead(NAME, {
        client,
        sourcifyOptions: { fetchImpl: sourcifyFetch },
      });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.sources.github).toEqual({
          owner: 'Artemstar',
          verified: false,
          verificationGist: null,
        });
        // Texts surfaced for drawer evidence display.
        expect(result.value.inferredTexts['com.github']).toBe('Artemstar');
        expect(result.value.inferredTexts['description']).toBe('Emerging Web3 PM, Prague.');
      }
    });

    it('returns github=null when com.github is absent (existing behaviour preserved)', async () => {
      const client = makeClient(async () => ADDR, async () => null);
      const sourcifyFetch = vi.fn(async () => jsonResponse(200, []));
      const result = await inferSubjectFromPublicRead(NAME, {
        client,
        sourcifyOptions: { fetchImpl: sourcifyFetch },
      });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.sources.github).toBeNull();
        expect(result.value.inferredTexts).toEqual({});
      }
    });

    it('treats empty-string com.github as missing', async () => {
      const client = makeClient(async () => ADDR, async (key) => {
        if (key === 'com.github') return '';
        return null;
      });
      const sourcifyFetch = vi.fn(async () => jsonResponse(200, []));
      const result = await inferSubjectFromPublicRead(NAME, {
        client,
        sourcifyOptions: { fetchImpl: sourcifyFetch },
      });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.sources.github).toBeNull();
        expect(result.value.inferredTexts['com.github']).toBeUndefined();
      }
    });

    it('drops malformed com.github values (regex-gated)', async () => {
      // A com.github value that's not a valid GitHub username/org must
      // NOT drive a fetch against api.github.com. Examples: spaces,
      // path traversal, leading/trailing hyphen.
      const cases = ['user with space', '../etc/passwd', '-leading-hyphen', 'trailing-hyphen-'];
      for (const bad of cases) {
        const client = makeClient(async () => ADDR, async (key) =>
          key === 'com.github' ? bad : null,
        );
        const sourcifyFetch = vi.fn(async () => jsonResponse(200, []));
        const result = await inferSubjectFromPublicRead(NAME, {
          client,
          sourcifyOptions: { fetchImpl: sourcifyFetch },
        });
        expect(result.kind).toBe('ok');
        if (result.kind === 'ok') {
          expect(result.value.sources.github).toBeNull();
          // Raw value still surfaced in inferredTexts so the drawer can
          // show "ENS announced X = Y" honestly even when we drop it.
          expect(result.value.inferredTexts['com.github']).toBe(bad);
        }
      }
    });

    it('does NOT fail entire resolution when com.github read errors (graceful degrade)', async () => {
      const client = makeClient(async () => ADDR, async (key) => {
        if (key === 'com.github') throw new Error('text record read failed');
        return null;
      });
      const sourcifyFetch = vi.fn(async () => jsonResponse(200, []));
      const result = await inferSubjectFromPublicRead(NAME, {
        client,
        sourcifyOptions: { fetchImpl: sourcifyFetch },
      });
      // Resolution still succeeds — the GitHub source just falls back
      // to absent. Critical: addr() success must not be poisoned by a
      // text-record RPC error.
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.primaryAddress).toBe(ADDR);
        expect(result.value.sources.github).toBeNull();
      }
    });
  });

  describe('error paths', () => {
    it('returns rpc_error when getEnsAddress throws', async () => {
      const client = makeClient(async () => {
        throw new Error('rpc down');
      });
      const result = await inferSubjectFromPublicRead(NAME, { client });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.reason).toBe('rpc_error');
        expect(result.message).toContain('rpc down');
      }
    });

    it('returns sourcify_error when all-chains fetch fails', async () => {
      const client = makeClient(async () => ADDR);
      const sourcifyFetch = vi.fn(async () => jsonResponse(503, {}));
      const result = await inferSubjectFromPublicRead(NAME, {
        client,
        sourcifyOptions: { fetchImpl: sourcifyFetch },
      });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('sourcify_error');
    });

    it('returns sourcify_error when all-chains fetch returns malformed JSON', async () => {
      const client = makeClient(async () => ADDR);
      const sourcifyFetch = vi.fn(
        async () =>
          new Response('<html>nope</html>', {
            status: 200,
            headers: { 'content-type': 'text/html' },
          }),
      );
      const result = await inferSubjectFromPublicRead(NAME, {
        client,
        sourcifyOptions: { fetchImpl: sourcifyFetch },
      });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('sourcify_error');
    });
  });

  describe('chain selection', () => {
    it('defaults to mainnet when no chainId is provided', async () => {
      const client = makeClient(async () => null);
      const sourcifyFetch = vi.fn(async () => jsonResponse(200, []));
      const result = await inferSubjectFromPublicRead(NAME, {
        client,
        sourcifyOptions: { fetchImpl: sourcifyFetch },
      });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') expect(result.value.chainId).toBe(mainnet.id);
    });

    it('accepts sepolia explicit chainId', async () => {
      const client = makeClient(async () => null);
      const sourcifyFetch = vi.fn(async () => jsonResponse(200, []));
      const result = await inferSubjectFromPublicRead(NAME, {
        client,
        chainId: sepolia.id,
        sourcifyOptions: { fetchImpl: sourcifyFetch },
      });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') expect(result.value.chainId).toBe(sepolia.id);
    });
  });
});
