// Source engine wrapper for the GitHub per-source pipeline.
//
// Refactor 2026-05-10: axes redefined per Daniel constraint
//   SENIORITY = quality / engineering depth
//   RELEVANCE = legitimacy / anti-scam / alive
//
// Re-classification:
//   • testPresence, repoHygiene → seniority (engineering quality)
//   • accountAge, topicsRichness, profileDepth → seniority (tenure + curated work)
//   • ciPassRate, bugHygiene, releaseCadence → relevance (working code, alive maintainer)
//   • githubRecency → relevance (alive)
//   • repos_archived anti-signal → relevance (abandoned scam-like)
//
// Trust 0.6 unverified; upgrade path 0.6 → 1.0 via gist cross-sign (P1).

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

// SENIORITY signals (engineering depth)
const GH_SEN_TEST_PRESENCE_W = 0.05;
const GH_SEN_REPO_HYGIENE_W = 0.05;
const GH_SEN_ACCOUNT_AGE_W = 0.10;
const GH_SEN_TOPICS_W = 0.05;
const GH_SEN_PROFILE_DEPTH_W = 0.05;
const GITHUB_SENIORITY_WEIGHT = 0.30;

// RELEVANCE signals (alive + works + responsive)
const GH_REL_CI_W = 0.10;
const GH_REL_BUG_W = 0.10;
const GH_REL_RELEASE_W = 0.05;
const GH_REL_RECENCY_W = 0.20;
const GITHUB_RELEVANCE_WEIGHT = 0.45;

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;
const ARCHIVED_PENALTY_MAX = 0.20;

export const githubEngine: SourceEngine = {
  id: 'github',
  category: 'source',
  defaultParams: {
    weight: 1,
    trustFloor: 0.6,
    trustCeiling: 0.6,
    timeoutMs: 100,
    thresholds: {},
  },
  async evaluate(evidence, _ctx, params): Promise<EngineContribution> {
    const start = performance.now();

    if (evidence.github.kind === 'absent') {
      return emptyContribution(
        'github', 'source',
        GITHUB_SENIORITY_WEIGHT + GITHUB_RELEVANCE_WEIGHT,
        performance.now() - start, [],
        GITHUB_SENIORITY_WEIGHT, GITHUB_RELEVANCE_WEIGHT,
      );
    }

    if (evidence.github.kind === 'error') {
      const empty = emptyContribution(
        'github', 'source',
        GITHUB_SENIORITY_WEIGHT + GITHUB_RELEVANCE_WEIGHT,
        performance.now() - start, [evidence.github.message],
        GITHUB_SENIORITY_WEIGHT, GITHUB_RELEVANCE_WEIGHT,
      );
      return { ...empty, confidence: 'degraded' };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const user = evidence.github.value.user;
    const repos = evidence.github.value.repos;
    const exists = user !== null;

    // ---- SENIORITY components ----
    const testPresVal = testPresence(evidence).value ?? 0;
    const repoHygVal = repoHygiene(evidence).value ?? 0;

    const accountAgeSeconds = user?.createdAt
      ? Math.max(0, nowSeconds - Math.floor(Date.parse(user.createdAt) / 1000))
      : 0;
    const accountAgeYears = accountAgeSeconds / SECONDS_PER_YEAR;
    const accountAgeValue = Math.min(1, accountAgeYears / 5);

    const totalTopics = repos.reduce((s, r) => s + r.topics.length, 0);
    const reposWithTopics = repos.filter((r) => r.topics.length > 0).length;
    const topicsRichnessValue = repos.length > 0
      ? Math.min(1, reposWithTopics / repos.length)
      : 0;

    const profileDepthValue = user
      ? Math.min(1, Math.log10(user.publicRepos + user.followers + 1) / Math.log10(101))
      : 0;

    const seniorityComponents = [
      { name: 'testPresence', value: testPresVal, weight: GH_SEN_TEST_PRESENCE_W },
      { name: 'repoHygiene', value: repoHygVal, weight: GH_SEN_REPO_HYGIENE_W },
      { name: 'githubAccountAge', value: accountAgeValue, weight: GH_SEN_ACCOUNT_AGE_W },
      { name: 'githubTopicsRichness', value: topicsRichnessValue, weight: GH_SEN_TOPICS_W },
      { name: 'githubProfileDepth', value: profileDepthValue, weight: GH_SEN_PROFILE_DEPTH_W },
    ];
    const seniorityValue = seniorityComponents.reduce(
      (s, c) => s + c.value * (c.weight / GITHUB_SENIORITY_WEIGHT),
      0,
    );

    // ---- RELEVANCE components ----
    const ciVal = ciPassRate(evidence).value;
    const bugVal = bugHygiene(evidence).value;
    const releaseVal = releaseCadence(evidence).value;
    const recencyResult = githubRecency(evidence, nowSeconds);
    const recencyVal = recencyResult.value ?? 0;

    // P1 components return null until US-114b runs — drop from denominator.
    const relevanceComponents = [
      { name: 'ciPassRate', value: ciVal, weight: GH_REL_CI_W, status: ciPassRate(evidence).status },
      { name: 'bugHygiene', value: bugVal, weight: GH_REL_BUG_W, status: bugHygiene(evidence).status },
      { name: 'releaseCadence', value: releaseVal, weight: GH_REL_RELEASE_W, status: releaseCadence(evidence).status },
      { name: 'githubRecency', value: recencyVal, weight: GH_REL_RECENCY_W, status: recencyResult.status },
    ];
    let relevanceNumerator = 0;
    let relevanceDenominator = 0;
    for (const c of relevanceComponents) {
      if (c.value === null) continue;
      relevanceNumerator += c.value * c.weight;
      relevanceDenominator += c.weight;
    }
    const relevanceValue = relevanceDenominator > 0
      ? relevanceNumerator / relevanceDenominator
      : 0;

    // ---- Anti-signals (relevance only — abandoned = scam-like) ----
    const archivedCount = repos.filter((r) => r.archived).length;
    const archivedRatio = repos.length > 0 ? archivedCount / repos.length : 0;
    const antiSignals = [];
    if (archivedRatio >= 0.8 && repos.length >= 3) {
      antiSignals.push({
        name: 'github_repos_mostly_archived',
        penalty: ARCHIVED_PENALTY_MAX,
        reason: `${archivedCount}/${repos.length} top repos archived — abandoned`,
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
      trust: params.trustFloor,
      weight: GITHUB_SENIORITY_WEIGHT + GITHUB_RELEVANCE_WEIGHT,
      seniorityWeight: GITHUB_SENIORITY_WEIGHT,
      relevanceWeight: GITHUB_RELEVANCE_WEIGHT,
      signals: {
        seniorityBreakdown: seniorityComponents.map((c) => ({
          name: c.name,
          value: c.value,
          weight: c.weight,
          raw: { status: 'computed' as const },
        })),
        relevanceBreakdown: relevanceComponents.map((c) => ({
          name: c.name,
          value: c.value ?? 0,
          weight: c.weight,
          raw: { status: c.status },
        })),
        antiSignals,
      },
      evidence: [
        user
          ? { label: 'GitHub login', value: user.login, source: 'github user', link: `https://github.com/${user.login}` }
          : { label: 'GitHub login', value: '(absent)', source: 'github user' },
        { label: 'Repos surveyed', value: String(repos.length) },
        { label: 'Account age', value: user?.createdAt ? `${accountAgeYears.toFixed(1)}y` : '—' },
        { label: 'Public repos', value: user ? String(user.publicRepos) : '—' },
        { label: 'Followers', value: user ? String(user.followers) : '—' },
        { label: 'Repos with topics', value: `${reposWithTopics}/${repos.length}` },
        { label: 'Repos archived', value: `${archivedCount}/${repos.length}` },
        { label: 'P1 enrichment', value: relevanceComponents.find((c) => c.status === 'null_p1') ? 'null (US-114b)' : 'present' },
      ],
      confidence: 'complete',
      durationMs: performance.now() - start,
      cacheHit: false,
      errors: [],
    };
  },
};
