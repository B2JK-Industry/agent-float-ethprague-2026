// Source engine wrapper for the Sourcify per-source pipeline.
//
// Refactor 2026-05-10: axes redefined per Daniel constraint
//   SENIORITY = quality / engineering depth / verified track record
//   RELEVANCE = legitimacy / anti-scam / contracts-actually-exist
//
// Semantic move: `compileSuccess` (does verified source EXIST?) is the
// fundamental anti-scam signal — "no source = scam risk" is exactly
// what relevance asks. `sourcifyRecency` + `crossChainBreadth` measure
// engineering depth (how recently they verify, how many chains they
// deploy on) — that is seniority.
//
// No fetching happens here — the orchestrator owns the network. This
// wrapper is a pure projection from the existing component extractors.

import { performance } from 'node:perf_hooks';

import { compileSuccess, sourcifyRecency } from '../score/components.js';
import {
  emptyContribution,
  type AntiSignalEntry,
  type SourceEngine,
  type EngineContribution,
} from './types.js';

// Per-component weights (sum to per-axis total)
const SOURCIFY_SEN_RECENCY_W = 0.10;       // recent verification = active engineering
const SOURCIFY_SEN_BREADTH_W = 0.10;       // multi-chain deployment = depth
const SOURCIFY_SENIORITY_WEIGHT = SOURCIFY_SEN_RECENCY_W + SOURCIFY_SEN_BREADTH_W; // 0.20

const SOURCIFY_REL_COMPILE_W = 0.20;       // verified source exists (anti-scam)
const SOURCIFY_RELEVANCE_WEIGHT = SOURCIFY_REL_COMPILE_W;

const CROSS_CHAIN_BREADTH_CAP = 5;
const COMPILER_OUTDATED_PENALTY = 0.10;    // anti-signal: outdated solc = security risk

export const sourcifyEngine: SourceEngine = {
  id: 'sourcify',
  category: 'source',
  defaultParams: {
    weight: 1,
    trustFloor: 1.0,
    trustCeiling: 1.0,
    timeoutMs: 100,
    thresholds: {},
  },
  async evaluate(evidence, _ctx, params): Promise<EngineContribution> {
    const start = performance.now();

    const compile = compileSuccess(evidence);
    const recency = sourcifyRecency(evidence);

    const okEntries = evidence.sourcify.filter((e) => e.kind === 'ok');
    const exists = okEntries.length > 0;
    const errorEntries = evidence.sourcify.filter((e) => e.kind === 'error');

    if (!exists && errorEntries.length === 0) {
      return emptyContribution(
        'sourcify',
        'source',
        SOURCIFY_SENIORITY_WEIGHT + SOURCIFY_RELEVANCE_WEIGHT,
        performance.now() - start,
        [],
        SOURCIFY_SENIORITY_WEIGHT,
        SOURCIFY_RELEVANCE_WEIGHT,
      );
    }

    const compileValue = compile.value ?? 0;
    const recencyValue = recency.value ?? 0;

    // Cross-chain breadth — unique chainIds across OK entries / cap.
    const uniqueChains = new Set(
      okEntries.map((e) => (e.kind === 'ok' ? e.chainId : 0)).filter((c) => c > 0),
    ).size;
    const breadthValue = Math.min(1, uniqueChains / CROSS_CHAIN_BREADTH_CAP);

    // Seniority axis — sourcifyRecency + crossChainBreadth (depth signals).
    const seniorityValue =
      recencyValue * (SOURCIFY_SEN_RECENCY_W / SOURCIFY_SENIORITY_WEIGHT) +
      breadthValue * (SOURCIFY_SEN_BREADTH_W / SOURCIFY_SENIORITY_WEIGHT);

    // Relevance axis — compileSuccess (anti-scam: contracts exist + verified).
    const relevanceValue = compileValue;

    // Anti-signals — relevance only (outdated compiler = scam vulnerability).
    const antiSignals: AntiSignalEntry[] = [];
    let outdatedCompilerCount = 0;
    for (const entry of okEntries) {
      if (entry.kind !== 'ok') continue;
      const compiler = entry.licenseCompiler.compiler;
      if (compiler !== null && compiler.recent === false) {
        outdatedCompilerCount += 1;
      }
    }
    if (outdatedCompilerCount > 0 && okEntries.length > 0) {
      const penalty = Math.min(
        COMPILER_OUTDATED_PENALTY,
        (outdatedCompilerCount / okEntries.length) * COMPILER_OUTDATED_PENALTY,
      );
      antiSignals.push({
        name: 'compiler_outdated',
        penalty,
        reason: `${outdatedCompilerCount}/${okEntries.length} contracts compiled with stale solc — security risk`,
      });
    }
    for (const e of errorEntries) {
      if (e.kind !== 'error') continue;
      antiSignals.push({
        name: 'sourcify_entry_error',
        penalty: 0,
        reason: `${e.chainId}:${e.address} — ${e.reason}`,
      });
    }

    const errors: string[] = errorEntries.map(
      (e) => `sourcify[${e.kind === 'error' ? `${e.chainId}:${e.address}` : ''}]: ${
        e.kind === 'error' ? e.message : ''
      }`,
    );
    const confidence: EngineContribution['confidence'] = errorEntries.length > 0
      ? 'partial'
      : 'complete';

    // Surface dominant license + compiler version aggregates for evidence.
    const licenses = new Map<string, number>();
    let mostRecentCompilerVersion: string | null = null;
    for (const entry of okEntries) {
      if (entry.kind !== 'ok') continue;
      const dom = entry.licenseCompiler.dominantLicense;
      if (dom) licenses.set(dom, (licenses.get(dom) ?? 0) + 1);
      if (entry.licenseCompiler.compiler && mostRecentCompilerVersion === null) {
        mostRecentCompilerVersion = entry.licenseCompiler.compiler.raw;
      }
    }
    const dominantLicense = licenses.size > 0
      ? Array.from(licenses.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      : null;

    return {
      engineId: 'sourcify',
      category: 'source',
      exists,
      validity: 1,
      liveness: exists ? 1 : 0,
      seniority: seniorityValue,
      relevance: relevanceValue,
      trust: params.trustFloor,
      weight: SOURCIFY_SENIORITY_WEIGHT + SOURCIFY_RELEVANCE_WEIGHT,
      seniorityWeight: SOURCIFY_SENIORITY_WEIGHT,
      relevanceWeight: SOURCIFY_RELEVANCE_WEIGHT,
      signals: {
        seniorityBreakdown: [
          {
            name: 'sourcifyRecency',
            value: recencyValue,
            weight: SOURCIFY_SEN_RECENCY_W,
            raw: { status: recency.status },
          },
          {
            name: 'crossChainBreadth',
            value: breadthValue,
            weight: SOURCIFY_SEN_BREADTH_W,
            raw: { uniqueChains, cap: CROSS_CHAIN_BREADTH_CAP },
          },
        ],
        relevanceBreakdown: [
          {
            name: 'compileSuccess',
            value: compileValue,
            weight: SOURCIFY_REL_COMPILE_W,
            raw: { status: compile.status, count: okEntries.length },
          },
        ],
        antiSignals,
      },
      evidence: [
        { label: 'Sourcify entries', value: `${okEntries.length} ok · ${errorEntries.length} error` },
        { label: 'Cross-chain breadth', value: `${uniqueChains} chain(s)` },
        { label: 'compileSuccess', value: compileValue.toFixed(2) },
        { label: 'sourcifyRecency', value: recencyValue.toFixed(2) },
        { label: 'Dominant license', value: dominantLicense ?? '—' },
        { label: 'Compiler version', value: mostRecentCompilerVersion ?? '—' },
        { label: 'Outdated compilers', value: `${outdatedCompilerCount} / ${okEntries.length}` },
      ],
      confidence,
      durationMs: performance.now() - start,
      cacheHit: false,
      errors,
    };
  },
};
