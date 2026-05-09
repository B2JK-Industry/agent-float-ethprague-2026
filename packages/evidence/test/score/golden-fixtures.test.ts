// H-5: deterministic-fixture integration test for the score engine.
// Per QA review 2026-05-09 — judges should re-derive any (seniority,
// relevance, score_100, tier) tuple by hand from these fixtures +
// weights.ts + the math in EPIC §10.

import { describe, expect, it } from 'vitest';

import type {
  GithubP0Signals,
  GithubRepoP0,
  MultiSourceEvidence,
  SourcifyEntryEvidence,
  SubjectIdentity,
} from '../../src/index.js';
import { computeScore } from '../../src/index.js';

// Anchor "now" to a fixed unix-second so recency math is reproducible.
// 2026-05-09 00:00 UTC = 1778198400.
const NOW_SECONDS = 1778198400;

const ADDR_V = '0x1111111111111111111111111111111111111111' as const;
const ADDR_PRIMARY = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;

function manifestSubject(name: string): SubjectIdentity {
  return {
    name,
    chainId: 1,
    mode: 'manifest',
    primaryAddress: ADDR_PRIMARY,
    kind: 'ai-agent',
    manifest: null, // not consulted by score engine in fixtures
  };
}

function publicReadSubject(name: string): SubjectIdentity {
  return {
    name,
    chainId: 1,
    mode: 'public-read',
    primaryAddress: ADDR_PRIMARY,
    kind: null,
    manifest: null,
  };
}

function sourcifyEntryVerified(): SourcifyEntryEvidence {
  return {
    kind: 'ok',
    chainId: 1,
    address: ADDR_V,
    label: 'Vault',
    deep: {
      chainId: 1,
      address: ADDR_V,
      match: 'exact_match',
      creationMatch: 'exact_match',
      runtimeMatch: 'exact_match',
      compilation: null,
      // Pass anti-gaming complexity gate: ≥2 function signatures.
      functionSignatures: [
        { selector: '0xa9059cbb', signature: 'transfer(address,uint256)' },
        { selector: '0x70a08231', signature: 'balanceOf(address)' },
        { selector: '0x18160ddd', signature: 'totalSupply()' },
      ],
      eventSignatures: null,
      licenses: null,
      userdoc: null,
      devdoc: null,
      proxyResolution: null,
    },
    patterns: [],
    licenseCompiler: { licenses: [], dominantLicense: null, compiler: null },
  };
}

function makeRepo(name: string, opts: {
  pushedAtSecondsAgo: number;
  hasTestDir: boolean;
  hasReadme: boolean;
  hasLicense: boolean;
}): GithubRepoP0 {
  const pushedAt = new Date((NOW_SECONDS - opts.pushedAtSecondsAgo) * 1000).toISOString();
  return {
    name,
    fullName: `subject/${name}`,
    createdAt: '2024-01-01T00:00:00.000Z',
    pushedAt,
    archived: false,
    defaultBranch: 'main',
    license: opts.hasLicense ? 'MIT' : null,
    topics: [],
    hasTestDir: opts.hasTestDir,
    hasSubstantialReadme: opts.hasReadme,
    readmeBytes: opts.hasReadme ? 4096 : null,
    hasLicense: opts.hasLicense,
    fetchStatus: 'ok',
  };
}

function githubFull(): GithubP0Signals {
  return {
    owner: 'subject',
    user: { login: 'subject', createdAt: '2018-01-01T00:00:00.000Z', publicRepos: 30, followers: 1234 },
    repos: [
      makeRepo('one', { pushedAtSecondsAgo: 86400, hasTestDir: true, hasReadme: true, hasLicense: true }),
      makeRepo('two', { pushedAtSecondsAgo: 86400 * 30, hasTestDir: true, hasReadme: true, hasLicense: true }),
      makeRepo('three', { pushedAtSecondsAgo: 86400 * 60, hasTestDir: true, hasReadme: true, hasLicense: true }),
    ],
  };
}

describe('Score engine — golden fixtures (H-5 deterministic re-derivation)', () => {
  describe('Fixture 1: v1 P0-only ideal subject (claimed GitHub + every P0 component maxed)', () => {
    // Inputs:
    //   compileSuccess: 1.0 (1 of 1 verified Sourcify entry, complexity gate passed)
    //   testPresence:   1.0 (all 3 repos have test dir)
    //   repoHygiene:    1.0 (all 3 repos have README>200 + LICENSE)
    //   ciPassRate:     null (P1)
    //   bugHygiene:     null (P1)
    //   releaseCadence: null (P1)
    //   sourcifyRecency: 1.0 (≥1 verified entry)
    //   githubRecency:  1.0 (all 3 repos pushed within 90 days)
    //   onchainRecency: 1.0 (nonce 1500 across chains, clamped to 1.0)
    //   ensRecency:     1.0 (TextChanged at nowBlock)
    //
    // Hand math:
    //   seniority = 0.25*1.0*1.0 + 0.15*1.0*0.6 + 0.15*1.0*0.6 = 0.25 + 0.09 + 0.09 = 0.43
    //   relevance = 0.30*1.0*1.0 + 0.30*1.0*0.6 + 0.25*1.0*1.0 + 0.15*1.0*1.0
    //             = 0.30 + 0.18 + 0.25 + 0.15 = 0.88
    //   score_raw = 0.5*0.43 + 0.5*0.88 = 0.215 + 0.44 = 0.655
    //   score_100 = round(65.5) = 66 (rounded to even by JS Math.round? No, JS rounds half away from zero. 0.655 * 100 = 65.5; round → 66)
    //   tier      = B (≥60, <75)
    const fixture: MultiSourceEvidence = {
      subject: manifestSubject('ideal.eth'),
      sourcify: [sourcifyEntryVerified()],
      github: { kind: 'ok', value: githubFull() },
      onchain: [
        { kind: 'ok', chainId: 1, value: { chainId: 1, address: ADDR_PRIMARY, nonce: 800, firstTxBlock: 18_000_000n, firstTxTimestamp: 1700000000, latestBlock: 19_000_000n } },
        { kind: 'ok', chainId: 11155111, value: { chainId: 11155111, address: ADDR_PRIMARY, nonce: 700, firstTxBlock: 5_000_000n, firstTxTimestamp: 1700000000, latestBlock: 6_000_000n } },
      ],
      ensInternal: {
        kind: 'ok',
        value: {
          name: 'ideal.eth',
          registrationDate: NOW_SECONDS - 86400 * 30,
          subnameCount: 5,
          textRecordCount: 4,
          // Anchor matches the mainnet on-chain entry's latestBlock so
          // ensRecency lands at 1.0 under the audit-round-7 P0 #2 fix
          // (real on-chain anchor instead of nowSeconds/12 fabrication).
          lastRecordUpdateBlock: 19_000_000n,
        },
      },
      crossChain: null,
      failures: [],
    };

    const result = computeScore(fixture, { nowSeconds: NOW_SECONDS });

    it('seniority axis = 0.43 (verified compileSuccess + 2 unverified P0 GitHub components)', () => {
      expect(result.seniority).toBeCloseTo(0.43, 6);
    });

    it('relevance axis = 0.88 (all 4 components at 1.0, 1 unverified)', () => {
      expect(result.relevance).toBeCloseTo(0.88, 6);
    });

    it('score_100 = 66 (= round((0.5×0.43 + 0.5×0.88) × 100))', () => {
      expect(result.score_100).toBe(66);
    });

    it('tier = S (after 2026-05-10 axis rebalance: P0-only ideal hits raw 0.79 ≥ S=65)', () => {
      // Pre-rebalance: tier=B (in [60,75)) under S=90 threshold.
      // Post-rebalance: S threshold dropped to 65; 79 ≥ 65 → S.
      expect(result.tier).toBe('S');
    });

    it('ceilingApplied = none (manifest mode)', () => {
      expect(result.ceilingApplied).toBe('none');
    });

    it('renders P1 components as null with status=null_p1 in breakdown', () => {
      const cipass = result.breakdown.seniority.components.find((c) => c.id === 'ciPassRate');
      expect(cipass?.value).toBeNull();
      expect(cipass?.status).toBe('null_p1');
      expect(cipass?.contribution).toBe(0);
    });

    it('every unverified component renders trustFactor=0.6 explicitly (GATE-30 visibility)', () => {
      const unverified = [
        ...result.breakdown.seniority.components,
        ...result.breakdown.relevance.components,
      ].filter((c) => c.trust === 'unverified');
      for (const c of unverified) {
        expect(c.trustFactor).toBe(0.6);
      }
    });
  });

  describe('Fixture 2: no GitHub data (only Sourcify + on-chain + ENS)', () => {
    // Inputs:
    //   compileSuccess: 1.0 (1 verified Sourcify entry)
    //   testPresence:   null (GitHub absent → no_data)
    //   repoHygiene:    null
    //   sourcifyRecency: 1.0
    //   githubRecency:  null
    //   onchainRecency: 1.0
    //   ensRecency:     1.0
    //
    // Hand math:
    //   seniority = 0.25*1.0*1.0 = 0.25
    //   relevance = 0.30 + 0 + 0.25 + 0.15 = 0.70
    //   score_raw = 0.5*0.25 + 0.5*0.70 = 0.125 + 0.35 = 0.475
    //   score_100 = 48 (= round(47.5) → 48 in JS because Math.round of .5 rounds away from zero for positive)
    //   tier      = C (≥45, <60)
    const fixture: MultiSourceEvidence = {
      subject: manifestSubject('no-github.eth'),
      sourcify: [sourcifyEntryVerified()],
      github: { kind: 'absent' },
      onchain: [
        { kind: 'ok', chainId: 1, value: { chainId: 1, address: ADDR_PRIMARY, nonce: 1500, firstTxBlock: 18_000_000n, firstTxTimestamp: 1700000000, latestBlock: 19_000_000n } },
      ],
      ensInternal: {
        kind: 'ok',
        value: {
          name: 'no-github.eth',
          registrationDate: NOW_SECONDS - 86400 * 30,
          subnameCount: 5,
          textRecordCount: 4,
          lastRecordUpdateBlock: BigInt(Math.floor(NOW_SECONDS / 12)),
        },
      },
      crossChain: null,
      failures: [],
    };

    const result = computeScore(fixture, { nowSeconds: NOW_SECONDS });

    it('seniority axis = 0.25 (only verified compileSuccess contributes)', () => {
      expect(result.seniority).toBeCloseTo(0.25, 6);
    });

    it('relevance axis = 0.70 (githubRecency null; other 3 verified components at 1.0)', () => {
      expect(result.relevance).toBeCloseTo(0.7, 6);
    });

    it('score_100 = 48', () => {
      expect(result.score_100).toBe(48);
    });

    it('tier = B (after 2026-05-10 axis rebalance: 48 ≥ B=35)', () => {
      // Pre-rebalance: tier=C under B=60 threshold.
      // Post-rebalance: B threshold dropped to 35; 48 ≥ 35 → B.
      expect(result.tier).toBe('B');
    });
  });

  describe('Fixture 3: U-tier (single source, fewer than 2 non-zero sources)', () => {
    // Only Sourcify has signal. nonZeroSourceCount = 1 → tier forced to U
    // regardless of axis math.
    const fixture: MultiSourceEvidence = {
      subject: manifestSubject('only-sourcify.eth'),
      sourcify: [sourcifyEntryVerified()],
      github: { kind: 'absent' },
      onchain: [
        // nonce=0 + firstTxBlock=null → does NOT count as non-zero source.
        { kind: 'ok', chainId: 1, value: { chainId: 1, address: ADDR_PRIMARY, nonce: 0, firstTxBlock: null, firstTxTimestamp: null, latestBlock: 19_000_000n } },
      ],
      ensInternal: { kind: 'absent' },
      crossChain: null,
      failures: [],
    };

    const result = computeScore(fixture, { nowSeconds: NOW_SECONDS });

    it('tier = U (only 1 non-zero source)', () => {
      expect(result.tier).toBe('U');
      expect(result.meta.nonZeroSourceCount).toBe(1);
    });

    it('ceilingApplied = unrated', () => {
      expect(result.ceilingApplied).toBe('unrated');
    });

    it('seniority + score_100 still computed honestly underneath the U label', () => {
      // Hand math:
      //   seniority = 0.25 * 1.0 * 1.0                       = 0.25
      //   relevance = 0.30 * 1.0 * 1.0 + 0.25 * 0 * 1.0      = 0.30
      //               (sourcifyRecency 1.0 verified, onchain nonce 0 → 0,
      //                githubRecency / ensRecency null)
      //   score_raw = 0.5 * 0.25 + 0.5 * 0.30 = 0.275
      //   score_100 = round(27.5) = 28
      expect(result.seniority).toBeCloseTo(0.25, 6);
      expect(result.relevance).toBeCloseTo(0.3, 6);
      expect(result.score_100).toBe(28);
    });
  });

  describe('Fixture 4: public-read mode (tier ceiling enforcement structurally)', () => {
    // Numerically identical to Fixture 2 (which lands tier C in manifest
    // mode); switching to public-read mode does NOT lift tier above A.
    // The ceiling is mathematically untestable in v1 without US-114b
    // enrichments — see the assert-by-construction proof in
    // engine.spec around the applyTierCeiling helper. Here we lock the
    // breakdown shape: ceilingApplied still reads `public_read_a` only
    // when tier WOULD have been S/A.
    const fixture: MultiSourceEvidence = {
      subject: publicReadSubject('public-read.eth'),
      sourcify: [sourcifyEntryVerified()],
      github: { kind: 'absent' },
      onchain: [
        { kind: 'ok', chainId: 1, value: { chainId: 1, address: ADDR_PRIMARY, nonce: 1500, firstTxBlock: 18_000_000n, firstTxTimestamp: 1700000000, latestBlock: 19_000_000n } },
      ],
      ensInternal: {
        kind: 'ok',
        value: {
          name: 'public-read.eth',
          registrationDate: NOW_SECONDS - 86400 * 30,
          subnameCount: 5,
          textRecordCount: 4,
          lastRecordUpdateBlock: BigInt(Math.floor(NOW_SECONDS / 12)),
        },
      },
      crossChain: null,
      failures: [],
    };

    const result = computeScore(fixture, { nowSeconds: NOW_SECONDS });

    it('mode = public-read in meta', () => {
      expect(result.meta.mode).toBe('public-read');
    });

    it('tier = B (after 2026-05-10 rebalance; ceiling does not fire below A)', () => {
      // Pre-rebalance: tier=C under B=60. Post-rebalance: B=35 → tier=B.
      expect(result.tier).toBe('B');
      // ceilingApplied stays `none` — public-read cap fires only when
      // raw tier would otherwise be S or A.
      expect(result.ceilingApplied).toBe('none');
    });
  });
});
