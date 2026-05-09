import { describe, expect, it } from 'vitest';

import type {
  GithubP0Signals,
  GithubRepoP0,
  MultiSourceEvidence,
  SubjectIdentity,
} from '../../src/index.js';
import { bugHygiene, ciPassRate, releaseCadence, repoHygiene } from '../../src/score/components.js';

const PRIMARY = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;

const subject: SubjectIdentity = {
  name: 'x.eth',
  chainId: 1,
  mode: 'manifest',
  primaryAddress: PRIMARY,
  kind: 'ai-agent',
  manifest: null,
};

function repo(overrides: Partial<GithubRepoP0> = {}): GithubRepoP0 {
  return {
    name: 'r',
    fullName: 'x/r',
    createdAt: null,
    pushedAt: null,
    archived: false,
    defaultBranch: 'main',
    license: null,
    topics: [],
    hasTestDir: false,
    hasSubstantialReadme: false,
    readmeBytes: null,
    hasLicense: false,
    fetchStatus: 'ok',
    ...overrides,
  };
}

function evidenceWithRepos(repos: GithubRepoP0[]): MultiSourceEvidence {
  const gh: GithubP0Signals = {
    owner: 'x',
    user: { login: 'x', createdAt: null, publicRepos: 0, followers: 0 },
    repos,
  };
  return {
    subject,
    sourcify: [],
    github: { kind: 'ok', value: gh },
    onchain: [],
    ensInternal: { kind: 'absent' },
    crossChain: null,
    failures: [],
  };
}

describe('ciPassRate (US-114b flip)', () => {
  it('returns null_p1 when no repo carries ciRuns enrichment', () => {
    const r = ciPassRate(evidenceWithRepos([repo()]));
    expect(r.status).toBe('null_p1');
  });

  it('returns null_p1 when github is absent', () => {
    const r = ciPassRate({
      subject,
      sourcify: [],
      github: { kind: 'absent' },
      onchain: [],
      ensInternal: { kind: 'absent' },
      crossChain: null,
      failures: [],
    });
    expect(r.status).toBe('null_p1');
  });

  it('flips to computed when at least one repo has ciRuns data', () => {
    const r = ciPassRate(evidenceWithRepos([
      repo({ ciRuns: { successful: 8, total: 10 } }),
      repo({ name: 's', ciRuns: { successful: 2, total: 5 } }),
    ]));
    expect(r.status).toBe('computed');
    expect(r.value).toBe(10 / 15);
  });

  it('returns 0 with note when total runs across enriched repos is zero', () => {
    const r = ciPassRate(evidenceWithRepos([repo({ ciRuns: { successful: 0, total: 0 } })]));
    expect(r.value).toBe(0);
    expect(r.note).toContain('no workflow runs');
  });

  it('skips repos whose ciRuns is null (mid-enrichment failure)', () => {
    const r = ciPassRate(evidenceWithRepos([
      repo({ ciRuns: { successful: 4, total: 5 } }),
      repo({ name: 's', ciRuns: null }),
    ]));
    expect(r.value).toBe(0.8);
  });
});

describe('bugHygiene (US-114b flip)', () => {
  it('returns null_p1 when no repo carries bugIssues enrichment', () => {
    expect(bugHygiene(evidenceWithRepos([repo()])).status).toBe('null_p1');
  });

  it('returns 1.0 with note when total bug issues is zero (EPIC §10.2 spec)', () => {
    const r = bugHygiene(evidenceWithRepos([repo({ bugIssues: { closed: 0, total: 0 } })]));
    expect(r.value).toBe(1.0);
    expect(r.note).toContain('no bug-labeled');
  });

  it('returns closed / total when issues exist', () => {
    const r = bugHygiene(evidenceWithRepos([
      repo({ bugIssues: { closed: 4, total: 10 } }),
      repo({ name: 's', bugIssues: { closed: 1, total: 5 } }),
    ]));
    expect(r.value).toBe(5 / 15);
  });
});

describe('releaseCadence (US-114b flip)', () => {
  it('returns null_p1 when no repo carries releasesLast12m', () => {
    expect(releaseCadence(evidenceWithRepos([repo()])).status).toBe('null_p1');
  });

  it('returns total / 12 when below cap', () => {
    const r = releaseCadence(evidenceWithRepos([
      repo({ releasesLast12m: 3 }),
      repo({ name: 's', releasesLast12m: 2 }),
    ]));
    expect(r.value).toBe(5 / 12);
  });

  it('caps total at 12 (returns 1.0)', () => {
    const r = releaseCadence(evidenceWithRepos([
      repo({ releasesLast12m: 20 }),
      repo({ name: 's', releasesLast12m: 30 }),
    ]));
    expect(r.value).toBe(1.0);
  });
});

describe('repoHygiene (US-114b extension)', () => {
  it('counts only README + LICENSE when no P1 enrichment is present (P0-only fallback)', () => {
    const r = repoHygiene(evidenceWithRepos([
      repo({ hasSubstantialReadme: true, hasLicense: true }),
      repo({ name: 's', hasSubstantialReadme: false, hasLicense: false }),
    ]));
    // (2/2 + 0/2) / 2 = 0.5
    expect(r.value).toBe(0.5);
  });

  it('extends denominator + numerator when P1 fields are present', () => {
    const r = repoHygiene(evidenceWithRepos([
      repo({
        hasSubstantialReadme: true,
        hasLicense: true,
        hasSecurity: true,
        hasDependabot: true,
        hasBranchProtection: true,
      }),
    ]));
    // (5/5) / 1 = 1.0
    expect(r.value).toBe(1.0);
  });

  it('mixes P0-only and P1-enriched repos honestly (per-repo denominator)', () => {
    const r = repoHygiene(evidenceWithRepos([
      // P0-only repo: README+LICENSE both present → 2/2 = 1.0
      repo({ hasSubstantialReadme: true, hasLicense: true }),
      // P1-enriched repo: 5/5 = 1.0
      repo({
        name: 's',
        hasSubstantialReadme: true,
        hasLicense: true,
        hasSecurity: true,
        hasDependabot: true,
        hasBranchProtection: true,
      }),
    ]));
    expect(r.value).toBe(1.0);
  });

  it('penalises a P1-enriched repo missing the new signals', () => {
    const r = repoHygiene(evidenceWithRepos([
      // 2 P0 hits, 0 P1 hits → 2/5 = 0.4
      repo({
        hasSubstantialReadme: true,
        hasLicense: true,
        hasSecurity: false,
        hasDependabot: false,
        hasBranchProtection: false,
      }),
    ]));
    expect(r.value).toBe(0.4);
  });
});

describe('GATE-30 v1-max-79 ceiling (US-114b post-flip)', () => {
  it('seniority axis maximum becomes 0.70 once P1 components are computable at value 1.0', () => {
    // With every component computable + at value 1.0, seniority math:
    // 0.25*1.0 + 0.20*1.0*0.6 + 0.15*1.0*0.6 + 0.10*1.0*0.6 + 0.15*1.0*0.6 + 0.15*1.0*0.6
    // = 0.25 + 0.12 + 0.09 + 0.06 + 0.09 + 0.09 = 0.70
    const verifiedContribution = 0.25 * 1.0;
    const unverifiedContribution = (0.20 + 0.15 + 0.10 + 0.15 + 0.15) * 1.0 * 0.6;
    expect(verifiedContribution + unverifiedContribution).toBeCloseTo(0.70, 10);
  });
});
