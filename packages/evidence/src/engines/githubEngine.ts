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
// Refactor 2026-05-10: depth sub-signals using P0 fields available
// without source schema change (topics + archived + account age).
const GH_TOPICS_RICHNESS_W = 0.04;          // signal: how categorised the repos are
const GH_ACCOUNT_AGE_W = 0.06;              // signal: account age (years on github)
const GH_PROFILE_DEPTH_W = 0.02;            // signal: publicRepos count + followers
const GITHUB_SENIORITY_TOTAL = 0.87;

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;
const ARCHIVED_PENALTY_MAX = 0.20;          // anti-signal cap when ≥80% repos archived

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

    const nowSeconds = Math.floor(Date.now() / 1000);
    const user = evidence.github.value.user;
    const repos = evidence.github.value.repos;
    const exists = user !== null;

    // Existing 5 EPIC components (P0 + P1).
    const components = [
      { name: 'testPresence', weight: GH_TEST_PRESENCE_W, value: testPresence(evidence) },
      { name: 'repoHygiene', weight: GH_REPO_HYGIENE_W, value: repoHygiene(evidence) },
      { name: 'ciPassRate', weight: GH_CI_PASS_RATE_W, value: ciPassRate(evidence) },
      { name: 'bugHygiene', weight: GH_BUG_HYGIENE_W, value: bugHygiene(evidence) },
      { name: 'releaseCadence', weight: GH_RELEASE_CADENCE_W, value: releaseCadence(evidence) },
    ];

    // Refactor 2026-05-10: 3 new depth sub-signals from P0 fields.
    const accountAgeSeconds = user?.createdAt
      ? Math.max(0, nowSeconds - Math.floor(Date.parse(user.createdAt) / 1000))
      : 0;
    const accountAgeYears = accountAgeSeconds / SECONDS_PER_YEAR;
    const accountAgeValue = Math.min(1, accountAgeYears / 5); // 5y saturates

    const totalTopics = repos.reduce((s, r) => s + r.topics.length, 0);
    const reposWithTopics = repos.filter((r) => r.topics.length > 0).length;
    const topicsRichnessValue = repos.length > 0
      ? Math.min(1, reposWithTopics / repos.length)
      : 0;

    const profileDepthValue = user
      ? Math.min(1, Math.log10(user.publicRepos + user.followers + 1) / Math.log10(101))
      : 0;

    const depthComponents = [
      { name: 'githubAccountAge', weight: GH_ACCOUNT_AGE_W, value: accountAgeValue },
      { name: 'githubTopicsRichness', weight: GH_TOPICS_RICHNESS_W, value: topicsRichnessValue },
      { name: 'githubProfileDepth', weight: GH_PROFILE_DEPTH_W, value: profileDepthValue },
    ];

    // Weighted sum across all available signals (skip null components
    // for P1; depth signals always present once user is loaded).
    let seniorityNumerator = 0;
    let seniorityDenominator = 0;
    for (const c of components) {
      if (c.value.value === null) continue;
      seniorityNumerator += c.value.value * c.weight;
      seniorityDenominator += c.weight;
    }
    for (const c of depthComponents) {
      seniorityNumerator += c.value * c.weight;
      seniorityDenominator += c.weight;
    }
    const seniorityValue = seniorityDenominator > 0 ? seniorityNumerator / seniorityDenominator : 0;

    const recency = githubRecency(evidence, nowSeconds);
    const relevanceValue = recency.value ?? 0;

    // Anti-signals: heavy-archived repos = abandoned subject.
    const archivedCount = repos.filter((r) => r.archived).length;
    const archivedRatio = repos.length > 0 ? archivedCount / repos.length : 0;
    const antiSignals = [];
    if (archivedRatio >= 0.8 && repos.length >= 3) {
      antiSignals.push({
        name: 'github_repos_mostly_archived',
        penalty: ARCHIVED_PENALTY_MAX,
        reason: `${archivedCount}/${repos.length} top repos archived — abandoned signal`,
      });
    } else if (archivedRatio >= 0.5 && repos.length >= 5) {
      antiSignals.push({
        name: 'github_repos_partially_archived',
        penalty: ARCHIVED_PENALTY_MAX / 2,
        reason: `${archivedCount}/${repos.length} top repos archived — declining activity`,
      });
    }

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
        seniorityBreakdown: [
          ...components.map((c) => ({
            name: c.name,
            value: c.value.value ?? 0,
            weight: c.weight,
            raw: { status: c.value.status, note: c.value.note },
          })),
          ...depthComponents.map((c) => ({
            name: c.name,
            value: c.value,
            weight: c.weight,
            raw: { status: 'computed' as const },
          })),
        ],
        relevanceBreakdown: [
          {
            name: 'githubRecency',
            value: relevanceValue,
            weight: GITHUB_RELEVANCE_WEIGHT,
            raw: { status: recency.status },
          },
        ],
        antiSignals,
      },
      evidence: [
        user
          ? { label: 'GitHub login', value: user.login, source: 'github user', link: `https://github.com/${user.login}` }
          : { label: 'GitHub login', value: '(absent)', source: 'github user' },
        { label: 'Repos surveyed', value: String(repos.length) },
        { label: 'Account created', value: user?.createdAt ?? '(unknown)' },
        { label: 'Account age', value: user?.createdAt ? `${accountAgeYears.toFixed(1)}y` : '—' },
        { label: 'Public repos', value: user ? String(user.publicRepos) : '—' },
        { label: 'Followers', value: user ? String(user.followers) : '—' },
        { label: 'Repos with topics', value: `${reposWithTopics}/${repos.length}` },
        { label: 'Repos archived', value: `${archivedCount}/${repos.length}` },
        { label: 'P1 enrichment', value: components.find((c) => c.value.status === 'null_p1') ? 'null (US-114b)' : 'present' },
      ],
      confidence: 'complete',
      durationMs: performance.now() - start,
      cacheHit: false,
      errors: [],
    };
  },
};
