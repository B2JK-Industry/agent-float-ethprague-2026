import { performance } from 'node:perf_hooks';

import { EMPTY_RESULT, type EvaluatorResult, type RecordEngine } from './types.js';

const SENIORITY_TECH_TERMS = [
  'solidity', 'evm', 'defi', 'smart contract', 'ethereum', 'blockchain', 'web3',
  'protocol', 'audit', 'dex', 'amm', 'yield', 'lending', 'nft', 'dao', 'zk',
  'layer2', 'l2', 'rollup', 'proxy', 'upgradeable', 'assembly', 'opcode',
  'foundry', 'hardhat', 'typescript', 'rust', 'cairo', 'vyper',
  'architect', 'engineer', 'developer', 'contributor', 'builder', 'ethprague',
];

const RELEVANCE_ACTIVITY_TERMS = [
  'building', 'developing', 'deploying', 'contributing', 'shipping',
  'hackathon', 'ethglobal', 'devcon', 'ethprague', 'conference',
  'tooling', 'infrastructure', 'project', 'protocol', 'dapp',
  'web3', 'ethereum', 'onchain', 'defi', 'nft',
  'pm', 'product', 'research', 'security', 'auditing',
];

function currentYear(): number {
  return new Date().getFullYear();
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function termHits(text: string, terms: string[]): number {
  const n = normalize(text);
  let hits = 0;
  for (const term of terms) {
    if (n.includes(term)) hits++;
  }
  return hits;
}

function lenRatio(wc: number, goodWords: number): number {
  return Math.min(1, wc / goodWords);
}

function yearScore(text: string): number {
  const year = currentYear();
  const n = normalize(text);
  if (n.includes(String(year))) return 1.0;
  if (n.includes(String(year + 1))) return 0.5;
  if (n.includes(String(year - 1))) return 0.25;
  return 0;
}

export const descriptionEngine: RecordEngine = {
  key: 'description',

  defaultParams: {
    // Refactor 2026-05-10: weight tuned to 0.04 to fit per-axis sum=1.0
    // invariant. Text analysis = supplementary signal, not primary input.
    weight: 0.04,
    trustFloor: 0,
    trustCeiling: 1,
    timeoutMs: 500,
    thresholds: {
      maxTechHits: 6,
      maxActivityHits: 8,
      goodWords: 25,
      wTech: 0.40,
      wActivity: 0.40,
      wLen: 0.30,
      wYear: 0.20,
    },
  },

  async evaluate(record, _ctx, params): Promise<EvaluatorResult> {
    const start = performance.now();

    if (!record.raw || record.raw.trim().length === 0) {
      return EMPTY_RESULT(record.key, params.weight, performance.now() - start);
    }

    const text = record.raw;
    const t = params.thresholds;
    const wc = wordCount(text);

    const techCount = termHits(text, SENIORITY_TECH_TERMS);
    const activityCount = termHits(text, RELEVANCE_ACTIVITY_TERMS);

    const techRatio = Math.min(1, techCount / (t['maxTechHits'] ?? 6));
    const activityRatio = Math.min(1, activityCount / (t['maxActivityHits'] ?? 8));
    const lr = lenRatio(wc, t['goodWords'] ?? 25);
    const yr = yearScore(text);

    const seniority = Math.min(1,
      techRatio * (t['wTech'] ?? 0.40) +
      lr * (t['wLen'] ?? 0.30) +
      yr * (t['wYear'] ?? 0.20),
    );

    const relevance = Math.min(1,
      activityRatio * (t['wActivity'] ?? 0.40) +
      lr * (t['wLen'] ?? 0.30) +
      yr * (t['wYear'] ?? 0.20),
    );

    const trust = Math.min(params.trustCeiling, Math.max(params.trustFloor, 0.5));

    return {
      recordKey: record.key,
      exists: true,
      validity: 1,
      liveness: 1,
      seniority,
      relevance,
      trust,
      weight: params.weight,
      signals: {
        seniorityBreakdown: [
          { name: 'tech_terms', value: techRatio, weight: t['wTech'] ?? 0.40, raw: techCount },
          { name: 'length', value: lr, weight: t['wLen'] ?? 0.30, raw: wc },
          { name: 'year', value: yr, weight: t['wYear'] ?? 0.20, raw: yr },
        ],
        relevanceBreakdown: [
          { name: 'activity_terms', value: activityRatio, weight: t['wActivity'] ?? 0.40, raw: activityCount },
          { name: 'length', value: lr, weight: t['wLen'] ?? 0.30, raw: wc },
          { name: 'year', value: yr, weight: t['wYear'] ?? 0.20, raw: yr },
        ],
        antiSignals: [],
      },
      evidence: [{ label: 'ENS description', value: text.slice(0, 120) }],
      confidence: 'complete',
      durationMs: performance.now() - start,
      cacheHit: false,
      errors: [],
    };
  },
};
