// Source engine wrapper for the GitHub per-source pipeline.
// Aggregates 5 seniority components (testPresence, repoHygiene,
// ciPassRate, bugHygiene, releaseCadence) and 1 relevance component
// (githubRecency) into a single EngineContribution.
//
// Trust label: unverified (EPIC §9). Score engine pre-refactor applies
// trust 0.6 in components.ts; this wrapper preserves the value via
// engine.trust = 0.6 so the aggregator multiplies once globally.
//
// All P0 components always present once GitHub source is `kind:'ok'`.
// P1 components (CI/bug/releases) return null until US-114b enrichment
// fires — wrapper drops them from the weighted mean denominator so
// non-null components are not penalised by missing P1 data.

import { performance } from 'node:perf_hooks';

import {
  bugHygiene,
  ciPassRate,
  githubRecency,
  releaseCadence,
  repoHygiene,
  testPresence,
} from '../score/components.js';
import {
  emptyContribution,
  type SourceEngine,
  type EngineContribution,
} from './types.js';

// EPIC §10.2 GitHub-derived seniority component weights.
const GH_TEST_PRESENCE_W = 0.15;
const GH_REPO_HYGIENE_W = 0.15;
const GH_CI_PASS_RATE_W = 0.20;
const GH_BUG_HYGIENE_W = 0.10;
const GH_RELEASE_CADENCE_W = 0.15;
const GITHUB_SENIORITY_TOTAL = 0.75;

// EPIC §10.3 githubRecency weight.
const GITHUB_RELEVANCE_WEIGHT = 0.30;

export const githubEngine: SourceEngine = {
  id: 'github',
  category: 'source',
  defaultParams: {
    weight: 1,
    trustFloor: 0.6, // unverified per EPIC §9
    trustCeiling: 0.6,
    timeoutMs: 100, // pure projection, no network
    thresholds: {},
  },
  async evaluate(evidence, _ctx, params): Promise<EngineContribution> {
    const start = performance.now();

    if (evidence.github.kind === 'absent') {
      return emptyContribution(
        'github',
        'source',
        GITHUB_SENIORITY_TOTAL + GITHUB_RELEVANCE_WEIGHT,
        performance.now() - start,
        [],
        GITHUB_SENIORITY_TOTAL,
        GITHUB_RELEVANCE_WEIGHT,
      );
    }

    if (evidence.github.kind === 'error') {
      const empty = emptyContribution(
        'github',
        'source',
        GITHUB_SENIORITY_TOTAL + GITHUB_RELEVANCE_WEIGHT,
        performance.now() - start,
        [evidence.github.message],
        GITHUB_SENIORITY_TOTAL,
        GITHUB_RELEVANCE_WEIGHT,
      );
      return { ...empty, confidence: 'degraded' };
    }

    // Pull each seniority component value via the existing extractor.
    // null_p1 components are dropped from the weighted mean so a P0-only
    // GitHub source still scores cleanly.
    const components = [
      { name: 'testPresence', weight: GH_TEST_PRESENCE_W, value: testPresence(evidence) },
      { name: 'repoHygiene', weight: GH_REPO_HYGIENE_W, value: repoHygiene(evidence) },
      { name: 'ciPassRate', weight: GH_CI_PASS_RATE_W, value: ciPassRate(evidence) },
      { name: 'bugHygiene', weight: GH_BUG_HYGIENE_W, value: bugHygiene(evidence) },
      { name: 'releaseCadence', weight: GH_RELEASE_CADENCE_W, value: releaseCadence(evidence) },
    ];

    let seniorityNumerator = 0;
    let seniorityDenominator = 0;
    for (const c of components) {
      if (c.value.value === null) continue;
      seniorityNumerator += c.value.value * c.weight;
      seniorityDenominator += c.weight;
    }
    const seniorityValue = seniorityDenominator > 0 ? seniorityNumerator / seniorityDenominator : 0;

    const recency = githubRecency(evidence, Math.floor(Date.now() / 1000));
    const relevanceValue = recency.value ?? 0;

    const user = evidence.github.value.user;
    const repos = evidence.github.value.repos;
    const exists = user !== null;

    return {
      engineId: 'github',
      category: 'source',
      exists,
      validity: 1,
      liveness: exists ? 1 : 0,
      seniority: seniorityValue,
      relevance: relevanceValue,
      trust: params.trustFloor, // 0.6 unverified
      weight: GITHUB_SENIORITY_TOTAL + GITHUB_RELEVANCE_WEIGHT,
      seniorityWeight: GITHUB_SENIORITY_TOTAL,
      relevanceWeight: GITHUB_RELEVANCE_WEIGHT,
      signals: {
        seniorityBreakdown: components.map((c) => ({
          name: c.name,
          value: c.value.value ?? 0,
          weight: c.weight,
          raw: { status: c.value.status, note: c.value.note },
        })),
        relevanceBreakdown: [
          {
            name: 'githubRecency',
            value: relevanceValue,
            weight: GITHUB_RELEVANCE_WEIGHT,
            raw: { status: recency.status },
          },
        ],
        antiSignals: [],
      },
      evidence: [
        user
          ? { label: 'GitHub login', value: user.login, source: 'github user', link: `https://github.com/${user.login}` }
          : { label: 'GitHub login', value: '(absent)', source: 'github user' },
        { label: 'Repos surveyed', value: String(repos.length) },
        { label: 'Account created', value: user?.createdAt ?? '(unknown)' },
        { label: 'P1 enrichment', value: components.find((c) => c.value.status === 'null_p1') ? 'null (US-114b)' : 'present' },
      ],
      confidence: 'complete',
      durationMs: performance.now() - start,
      cacheHit: false,
      errors: [],
    };
  },
};
