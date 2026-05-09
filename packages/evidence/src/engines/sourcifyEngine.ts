// Source engine wrapper for the Sourcify per-source pipeline.
// Reads MultiSourceEvidence.sourcify (already populated by the
// orchestrator), extracts the score-engine components for this source
// (compileSuccess + sourcifyRecency) and produces a single
// EngineContribution that the aggregator sums uniformly with every
// other engine.
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

const SOURCIFY_SENIORITY_WEIGHT_COMPILE = 0.25;  // EPIC §10.2 compileSuccess weight
const SOURCIFY_SENIORITY_WEIGHT_BREADTH = 0.05;  // bonus weight for cross-chain breadth
const SOURCIFY_SENIORITY_WEIGHT = SOURCIFY_SENIORITY_WEIGHT_COMPILE + SOURCIFY_SENIORITY_WEIGHT_BREADTH;
const SOURCIFY_RELEVANCE_WEIGHT = 0.30;          // EPIC §10.3 sourcifyRecency weight
const CROSS_CHAIN_BREADTH_CAP = 5;               // capped — past 5 chains diminishing returns
const COMPILER_OUTDATED_PENALTY = 0.10;          // anti-signal when compiler is not recent

export const sourcifyEngine: SourceEngine = {
  id: 'sourcify',
  category: 'source',
  defaultParams: {
    weight: 1,
    trustFloor: 1.0,
    trustCeiling: 1.0,
    timeoutMs: 100, // pure projection, no network
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
    const relevanceValue = recency.value ?? 0;

    // Cross-chain breadth: number of unique chainIds across all OK entries.
    const uniqueChains = new Set(
      okEntries.map((e) => (e.kind === 'ok' ? e.chainId : 0)).filter((c) => c > 0),
    ).size;
    const breadthValue = Math.min(1, uniqueChains / CROSS_CHAIN_BREADTH_CAP);

    // Compose weighted seniority — compileSuccess (0.25) + crossChainBreadth (0.05).
    const seniorityValue =
      compileValue * (SOURCIFY_SENIORITY_WEIGHT_COMPILE / SOURCIFY_SENIORITY_WEIGHT) +
      breadthValue * (SOURCIFY_SENIORITY_WEIGHT_BREADTH / SOURCIFY_SENIORITY_WEIGHT);

    // Anti-signals — compiler outdated + per-entry sourcify errors.
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
      // Penalty proportional to fraction of outdated compilers, capped.
      const penalty = Math.min(
        COMPILER_OUTDATED_PENALTY,
        (outdatedCompilerCount / okEntries.length) * COMPILER_OUTDATED_PENALTY,
      );
      antiSignals.push({
        name: 'compiler_outdated',
        penalty,
        reason: `${outdatedCompilerCount}/${okEntries.length} contracts compiled with stale solc (< 0.8.20 baseline or prerelease)`,
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
      trust: params.trustFloor, // verified — 1.0
      weight: SOURCIFY_SENIORITY_WEIGHT + SOURCIFY_RELEVANCE_WEIGHT,
      seniorityWeight: SOURCIFY_SENIORITY_WEIGHT,
      relevanceWeight: SOURCIFY_RELEVANCE_WEIGHT,
      signals: {
        seniorityBreakdown: [
          {
            name: 'compileSuccess',
            value: compileValue,
            weight: SOURCIFY_SENIORITY_WEIGHT_COMPILE,
            raw: { status: compile.status, count: okEntries.length },
          },
          {
            name: 'crossChainBreadth',
            value: breadthValue,
            weight: SOURCIFY_SENIORITY_WEIGHT_BREADTH,
            raw: { uniqueChains, cap: CROSS_CHAIN_BREADTH_CAP },
          },
        ],
        relevanceBreakdown: [
          {
            name: 'sourcifyRecency',
            value: relevanceValue,
            weight: SOURCIFY_RELEVANCE_WEIGHT,
            raw: { status: recency.status },
          },
        ],
        antiSignals,
      },
      evidence: [
        {
          label: 'Sourcify entries',
          value: `${okEntries.length} ok · ${errorEntries.length} error`,
        },
        { label: 'Cross-chain breadth', value: `${uniqueChains} chain(s)` },
        {
          label: 'compileSuccess',
          value: compile.value === null ? '— (no data)' : compile.value.toFixed(2),
        },
        {
          label: 'sourcifyRecency',
          value: recency.value === null ? '— (no data)' : recency.value.toFixed(2),
        },
        { label: 'Dominant license', value: dominantLicense ?? '—' },
        { label: 'Compiler version', value: mostRecentCompilerVersion ?? '—' },
        {
          label: 'Outdated compilers',
          value: `${outdatedCompilerCount} / ${okEntries.length}`,
        },
      ],
      confidence,
      durationMs: performance.now() - start,
      cacheHit: false,
      errors,
    };
  },
};
