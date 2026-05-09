import { describe, expect, it } from 'vitest';

import type {
  GithubP0Signals,
  MultiSourceEvidence,
  SubjectIdentity,
} from '../../src/index.js';
import {
  bugHygiene,
  ciPassRate,
  compileSuccess,
  ensRecency,
  githubRecency,
  nonZeroSourceCount,
  onchainRecency,
  releaseCadence,
  repoHygiene,
  sourcifyRecency,
  testPresence,
} from '../../src/score/components.js';

const NOW = 1778198400; // 2026-05-09 00:00 UTC
const PRIMARY = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const SOURCIFY_ADDR = '0x1111111111111111111111111111111111111111' as const;

const subject: SubjectIdentity = {
  name: 'x.eth',
  chainId: 1,
  mode: 'manifest',
  primaryAddress: PRIMARY,
  kind: 'ai-agent',
  manifest: null,
};

function evidence(overrides: Partial<MultiSourceEvidence> = {}): MultiSourceEvidence {
  return {
    subject,
    sourcify: [],
    github: { kind: 'absent' },
    onchain: [],
    ensInternal: { kind: 'absent' },
    crossChain: null,
    failures: [],
    ...overrides,
  };
}

function sourcifyEntry(overrides: { match?: 'exact_match' | 'match' | 'not_found'; creationMatch?: 'exact_match' | 'match' | 'not_found' | null; runtimeMatch?: 'exact_match' | 'match' | 'not_found' | null; functions?: number; kind?: 'ok' | 'error'; address?: `0x${string}` } = {}) {
  const fnCount = overrides.functions ?? 3;
  const fns = Array.from({ length: fnCount }, (_, i) => ({
    selector: `0x${i.toString(16).padStart(8, '0')}` as `0x${string}` extends infer S ? string : never,
    signature: `f${i}()`,
  }));
  const addr = overrides.address ?? SOURCIFY_ADDR;
  if (overrides.kind === 'error') {
    return { kind: 'error' as const, chainId: 1, address: addr, label: 'X', reason: 'r', message: 'm' };
  }
  return {
    kind: 'ok' as const,
    chainId: 1,
    address: addr,
    label: 'X',
    deep: {
      chainId: 1,
      address: addr,
      match: overrides.match ?? 'exact_match',
      creationMatch: overrides.creationMatch ?? 'exact_match',
      runtimeMatch: overrides.runtimeMatch ?? 'exact_match',
      compilation: null,
      functionSignatures: fns,
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

describe('compileSuccess', () => {
  it('returns null_no_data when no Sourcify entries pass complexity gate', () => {
    expect(compileSuccess(evidence({ sourcify: [] }))).toEqual({ value: null, status: 'null_no_data' });
  });

  it('ignores hello-world entries (function count < 2 — anti-gaming heuristic)', () => {
    const result = compileSuccess(evidence({
      sourcify: [
        sourcifyEntry({ functions: 1 }),  // dropped
        sourcifyEntry({ functions: 5, address: '0x2222222222222222222222222222222222222222' }),
      ],
    }));
    // Only the 5-fn entry counted; it's verified → 1.0.
    expect(result.value).toBe(1.0);
  });

  it('counts only entries with creationMatch===exact AND runtimeMatch===exact in the numerator', () => {
    const result = compileSuccess(evidence({
      sourcify: [
        sourcifyEntry({ creationMatch: 'exact_match', runtimeMatch: 'exact_match' }),
        sourcifyEntry({ creationMatch: 'exact_match', runtimeMatch: 'match', address: '0x2222222222222222222222222222222222222222' }),
        sourcifyEntry({ creationMatch: 'match', runtimeMatch: 'exact_match', address: '0x3333333333333333333333333333333333333333' }),
      ],
    }));
    expect(result.value).toBeCloseTo(1 / 3, 6);
  });

  it('returns 0 when no entries are exact-match', () => {
    const result = compileSuccess(evidence({
      sourcify: [sourcifyEntry({ creationMatch: 'match', runtimeMatch: 'match' })],
    }));
    expect(result.value).toBe(0);
  });
});

describe('testPresence', () => {
  function ghWithRepos(testCounts: Array<boolean>): GithubP0Signals {
    return {
      owner: 'x',
      user: { login: 'x', createdAt: null, publicRepos: 0, followers: 0 },
      repos: testCounts.map((hasTest, i) => ({
        name: `r${i}`,
        fullName: `x/r${i}`,
        createdAt: null,
        pushedAt: null,
        archived: false,
        defaultBranch: 'main',
        license: null,
        topics: [],
        hasTestDir: hasTest,
        hasSubstantialReadme: false,
        readmeBytes: null,
        hasLicense: false,
        fetchStatus: 'ok' as const,
      })),
    };
  }

  it('returns null when GitHub is absent', () => {
    expect(testPresence(evidence({ github: { kind: 'absent' } })).status).toBe('null_no_data');
  });

  it('returns null when 0 repos', () => {
    expect(testPresence(evidence({ github: { kind: 'ok', value: ghWithRepos([]) } })).status).toBe('null_no_data');
  });

  it('returns 1.0 when every repo has test dir', () => {
    const r = testPresence(evidence({ github: { kind: 'ok', value: ghWithRepos([true, true, true]) } }));
    expect(r.value).toBe(1.0);
  });

  it('returns 0.5 when half of repos have test dir', () => {
    const r = testPresence(evidence({ github: { kind: 'ok', value: ghWithRepos([true, false, true, false]) } }));
    expect(r.value).toBe(0.5);
  });
});

describe('repoHygiene', () => {
  function ghWithRepos(specs: Array<{ readme: boolean; license: boolean }>): GithubP0Signals {
    return {
      owner: 'x',
      user: { login: 'x', createdAt: null, publicRepos: 0, followers: 0 },
      repos: specs.map((s, i) => ({
        name: `r${i}`,
        fullName: `x/r${i}`,
        createdAt: null,
        pushedAt: null,
        archived: false,
        defaultBranch: 'main',
        license: null,
        topics: [],
        hasTestDir: false,
        hasSubstantialReadme: s.readme,
        readmeBytes: s.readme ? 4096 : null,
        hasLicense: s.license,
        fetchStatus: 'ok' as const,
      })),
    };
  }

  it('returns 1.0 when every repo has README + LICENSE', () => {
    const r = repoHygiene(evidence({ github: { kind: 'ok', value: ghWithRepos([{ readme: true, license: true }, { readme: true, license: true }]) } }));
    expect(r.value).toBe(1.0);
  });

  it('returns 0.5 for repos with only README', () => {
    const r = repoHygiene(evidence({ github: { kind: 'ok', value: ghWithRepos([{ readme: true, license: false }]) } }));
    expect(r.value).toBe(0.5);
  });

  it('returns 0 when no signals present', () => {
    const r = repoHygiene(evidence({ github: { kind: 'ok', value: ghWithRepos([{ readme: false, license: false }]) } }));
    expect(r.value).toBe(0);
  });
});

describe('githubRecency', () => {
  function ghWithPushedAt(daysAgo: number[]): GithubP0Signals {
    return {
      owner: 'x',
      user: { login: 'x', createdAt: null, publicRepos: 0, followers: 0 },
      repos: daysAgo.map((d, i) => ({
        name: `r${i}`,
        fullName: `x/r${i}`,
        createdAt: null,
        pushedAt: new Date((NOW - d * 86400) * 1000).toISOString(),
        archived: false,
        defaultBranch: 'main',
        license: null,
        topics: [],
        hasTestDir: false,
        hasSubstantialReadme: false,
        readmeBytes: null,
        hasLicense: false,
        fetchStatus: 'ok' as const,
      })),
    };
  }

  it('returns null when GitHub is absent', () => {
    expect(githubRecency(evidence({}), NOW).status).toBe('null_no_data');
  });

  it('returns 1.0 when every repo pushed within 90 days', () => {
    const r = githubRecency(evidence({ github: { kind: 'ok', value: ghWithPushedAt([1, 30, 89]) } }), NOW);
    expect(r.value).toBe(1.0);
  });

  it('returns 0.5 when half of repos pushed within 90 days', () => {
    const r = githubRecency(evidence({ github: { kind: 'ok', value: ghWithPushedAt([1, 100, 30, 200]) } }), NOW);
    expect(r.value).toBe(0.5);
  });
});

describe('onchainRecency (nonce-fallback path)', () => {
  it('returns null when no on-chain ok records', () => {
    expect(onchainRecency(evidence({})).status).toBe('null_no_data');
  });

  it('clamps total nonce / 1000 to [0, 1]', () => {
    const r = onchainRecency(evidence({
      onchain: [
        { kind: 'ok', chainId: 1, value: { chainId: 1, address: PRIMARY, nonce: 600, firstTxBlock: 1n, firstTxTimestamp: 1, latestBlock: 100n } },
        { kind: 'ok', chainId: 11155111, value: { chainId: 11155111, address: PRIMARY, nonce: 300, firstTxBlock: 1n, firstTxTimestamp: 1, latestBlock: 100n } },
      ],
    }));
    expect(r.value).toBe(0.9);
  });

  it('clamps to 1.0 when total nonce ≥ 1000', () => {
    const r = onchainRecency(evidence({
      onchain: [{ kind: 'ok', chainId: 1, value: { chainId: 1, address: PRIMARY, nonce: 5000, firstTxBlock: 1n, firstTxTimestamp: 1, latestBlock: 100n } }],
    }));
    expect(r.value).toBe(1.0);
  });

  it('surfaces note explaining the fallback', () => {
    const r = onchainRecency(evidence({
      onchain: [{ kind: 'ok', chainId: 1, value: { chainId: 1, address: PRIMARY, nonce: 1, firstTxBlock: 1n, firstTxTimestamp: 1, latestBlock: 100n } }],
    }));
    expect(r.note).toContain('fallback');
  });
});

describe('sourcifyRecency', () => {
  it('returns null when no entries', () => {
    expect(sourcifyRecency(evidence({})).status).toBe('null_no_data');
  });

  it('returns 1.0 with at least one verified entry', () => {
    const r = sourcifyRecency(evidence({ sourcify: [sourcifyEntry({ creationMatch: 'exact_match' })] }));
    expect(r.value).toBe(1.0);
  });

  it('returns 0 when entries exist but none verified', () => {
    const r = sourcifyRecency(evidence({ sourcify: [sourcifyEntry({ creationMatch: 'not_found', runtimeMatch: 'not_found' })] }));
    expect(r.value).toBe(0);
  });
});

describe('ensRecency', () => {
  it('returns null when ens-internal absent', () => {
    expect(ensRecency(evidence({}), NOW).status).toBe('null_no_data');
  });

  it('returns null when registrationDate is null', () => {
    const r = ensRecency(
      evidence({
        ensInternal: {
          kind: 'ok',
          value: {
            name: 'x.eth',
            registrationDate: null,
            subnameCount: 0,
            textRecordCount: 0,
            lastRecordUpdateBlock: 1n,
          },
        },
      }),
      NOW,
    );
    expect(r.status).toBe('null_no_data');
  });

  it('returns 1.0 when last update equals chain head approx', () => {
    const r = ensRecency(
      evidence({
        ensInternal: {
          kind: 'ok',
          value: {
            name: 'x.eth',
            registrationDate: NOW - 86400 * 30,
            subnameCount: 0,
            textRecordCount: 0,
            lastRecordUpdateBlock: BigInt(Math.floor(NOW / 12)),
          },
        },
      }),
      NOW,
    );
    expect(r.value).toBe(1.0);
  });

  it('decays linearly between 0 and 24 months', () => {
    // 12 months stale → freshness = 1 - 12/24 = 0.5
    const twelveMonths = 12 * 30 * 86400;
    const r = ensRecency(
      evidence({
        ensInternal: {
          kind: 'ok',
          value: {
            name: 'x.eth',
            registrationDate: NOW - 86400 * 30,
            subnameCount: 0,
            textRecordCount: 0,
            lastRecordUpdateBlock: BigInt(Math.floor((NOW - twelveMonths) / 12)),
          },
        },
      }),
      NOW,
    );
    expect(r.value).toBeCloseTo(0.5, 2);
  });

  it('floors at 0 when older than 24 months', () => {
    const twoYears = 25 * 30 * 86400;
    const r = ensRecency(
      evidence({
        ensInternal: {
          kind: 'ok',
          value: {
            name: 'x.eth',
            registrationDate: NOW - twoYears - 1,
            subnameCount: 0,
            textRecordCount: 0,
            lastRecordUpdateBlock: BigInt(Math.floor((NOW - twoYears) / 12)),
          },
        },
      }),
      NOW,
    );
    expect(r.value).toBe(0);
  });
});

describe('P1 components return null', () => {
  it('ciPassRate returns null with status null_p1', () => {
    expect(ciPassRate(evidence({}))).toEqual({ value: null, status: 'null_p1' });
  });
  it('bugHygiene returns null with status null_p1', () => {
    expect(bugHygiene(evidence({}))).toEqual({ value: null, status: 'null_p1' });
  });
  it('releaseCadence returns null with status null_p1', () => {
    expect(releaseCadence(evidence({}))).toEqual({ value: null, status: 'null_p1' });
  });
});

describe('nonZeroSourceCount', () => {
  it('returns 0 for fully empty evidence', () => {
    expect(nonZeroSourceCount(evidence({}))).toBe(0);
  });

  it('counts Sourcify when at least one entry has match != not_found', () => {
    expect(nonZeroSourceCount(evidence({ sourcify: [sourcifyEntry({ match: 'exact_match' })] }))).toBe(1);
  });

  it('does NOT count Sourcify when all entries are not_found', () => {
    expect(nonZeroSourceCount(evidence({ sourcify: [sourcifyEntry({ match: 'not_found' })] }))).toBe(0);
  });

  it('counts on-chain when nonce > 0 OR firstTxBlock !== null', () => {
    expect(nonZeroSourceCount(evidence({
      onchain: [{ kind: 'ok', chainId: 1, value: { chainId: 1, address: PRIMARY, nonce: 0, firstTxBlock: 5n, firstTxTimestamp: 1, latestBlock: 100n } }],
    }))).toBe(1);
  });

  it('does NOT count on-chain when nonce=0 AND firstTxBlock=null', () => {
    expect(nonZeroSourceCount(evidence({
      onchain: [{ kind: 'ok', chainId: 1, value: { chainId: 1, address: PRIMARY, nonce: 0, firstTxBlock: null, firstTxTimestamp: null, latestBlock: 100n } }],
    }))).toBe(0);
  });

  it('counts ens-internal when any signal is non-null', () => {
    expect(nonZeroSourceCount(evidence({
      ensInternal: { kind: 'ok', value: { name: 'x.eth', registrationDate: 1, subnameCount: 0, textRecordCount: 0, lastRecordUpdateBlock: null } },
    }))).toBe(1);
  });
});
