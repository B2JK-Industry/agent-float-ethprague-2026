import { describe, expect, it } from 'vitest';

import {
  BRIDGE_AXIS_BONUS_CAP,
  computeEvalBonus,
  resolvedRecordsFromEvidence,
} from '../bridge.js';
import type { MultiSourceEvidence } from '../../bench/types.js';
import type { EvaluatorResult, SignalEntry } from '../types.js';

const RESOLVED_AT_MS = 1778356762000;

const baseSubject = (
  overrides: Partial<MultiSourceEvidence['subject']> = {},
): MultiSourceEvidence['subject'] => ({
  name: 'letadlo.eth',
  chainId: 11155111,
  mode: 'public-read',
  primaryAddress: '0x37C118F3A57e7b4aF2d6959f9FA53424dE9868FB',
  kind: null,
  manifest: null,
  inferredGithub: null,
  inferredTexts: {},
  ...overrides,
});

const baseEvidence = (
  subjectOverrides: Partial<MultiSourceEvidence['subject']> = {},
): MultiSourceEvidence => ({
  subject: baseSubject(subjectOverrides),
  sourcify: [],
  github: { kind: 'absent' },
  onchain: [],
  ensInternal: { kind: 'absent' },
  crossChain: null,
  failures: [],
});

const stubResult = (
  recordKey: EvaluatorResult['recordKey'],
  overrides: Partial<EvaluatorResult> = {},
): EvaluatorResult => ({
  recordKey,
  exists: true,
  validity: 1,
  liveness: 1,
  seniority: 0.5,
  relevance: 0.5,
  trust: 0.7,
  weight: 1,
  signals: {
    seniorityBreakdown: [] as SignalEntry[],
    relevanceBreakdown: [] as SignalEntry[],
    antiSignals: [],
  },
  evidence: [],
  confidence: 'complete',
  durationMs: 10,
  cacheHit: false,
  errors: [],
  ...overrides,
});

describe('resolvedRecordsFromEvidence', () => {
  it('extracts addr, description, url, com.github from inferredTexts', () => {
    const evidence = baseEvidence({
      inferredTexts: {
        description: 'Emerging Web3 PM, Prague.',
        url: 'https://www.linkedin.com/in/artem-starokozhko-715700393/',
        'com.github': 'Artemstar',
      },
    });
    const records = resolvedRecordsFromEvidence(evidence, RESOLVED_AT_MS);

    expect(records.get('addr.eth')?.raw).toBe(
      '0x37C118F3A57e7b4aF2d6959f9FA53424dE9868FB',
    );
    expect(records.get('description')?.raw).toBe('Emerging Web3 PM, Prague.');
    expect(records.get('url')?.raw).toBe(
      'https://www.linkedin.com/in/artem-starokozhko-715700393/',
    );
    expect(records.get('com.github')?.raw).toBe('Artemstar');
    expect(records.get('ens-registration')?.raw).toBe('letadlo.eth');
  });

  it('returns null raw for absent records (does not crash bridge)', () => {
    const evidence = baseEvidence({ inferredTexts: {} });
    const records = resolvedRecordsFromEvidence(evidence, RESOLVED_AT_MS);

    expect(records.get('description')?.raw).toBeNull();
    expect(records.get('url')?.raw).toBeNull();
    expect(records.get('com.github')?.raw).toBeNull();
    // addr always present in this fixture
    expect(records.get('addr.eth')?.raw).not.toBeNull();
  });

  it('falls back to manifest.sources.github.owner when inferredTexts missing com.github', () => {
    const evidence = baseEvidence({
      mode: 'manifest',
      inferredTexts: {},
      manifest: {
        schema: 'agent-bench-manifest@1',
        version: 1,
        kind: 'project',
        sources: {
          github: { owner: 'manifestowner' },
          sourcify: [],
        },
        previousManifestHash: null,
      } as unknown as MultiSourceEvidence['subject']['manifest'],
    });
    const records = resolvedRecordsFromEvidence(evidence, RESOLVED_AT_MS);
    expect(records.get('com.github')?.raw).toBe('manifestowner');
  });

  it('treats whitespace-only text records as absent', () => {
    const evidence = baseEvidence({
      inferredTexts: { description: '   ', url: '\n\n' },
    });
    const records = resolvedRecordsFromEvidence(evidence, RESOLVED_AT_MS);
    expect(records.get('description')?.raw).toBeNull();
    expect(records.get('url')?.raw).toBeNull();
  });

  it('passes resolvedAtMs through so engines can compute time deltas deterministically', () => {
    const evidence = baseEvidence();
    const records = resolvedRecordsFromEvidence(evidence, 12345);
    for (const record of records.values()) {
      expect(record.resolvedAtMs).toBe(12345);
    }
  });
});

describe('computeEvalBonus', () => {
  it('returns zero bonus for an empty engine list', () => {
    const bonus = computeEvalBonus([]);
    expect(bonus.seniority).toBe(0);
    expect(bonus.relevance).toBe(0);
    expect(bonus.appliedToScore100).toBe(0);
  });

  it('returns zero bonus when every engine is absent (effectiveContribution = 0)', () => {
    const bonus = computeEvalBonus([
      stubResult('addr.eth', { exists: false, validity: 0, trust: 0, weight: 0 }),
      stubResult('description', { exists: false, validity: 0, trust: 0, weight: 0 }),
    ]);
    expect(bonus.seniority).toBe(0);
    expect(bonus.relevance).toBe(0);
  });

  it('caps the bonus per axis at BRIDGE_AXIS_BONUS_CAP', () => {
    const bonus = computeEvalBonus([
      stubResult('addr.eth', { seniority: 1, relevance: 1, trust: 1, weight: 1 }),
    ]);
    expect(bonus.seniority).toBeLessThanOrEqual(BRIDGE_AXIS_BONUS_CAP);
    expect(bonus.relevance).toBeLessThanOrEqual(BRIDGE_AXIS_BONUS_CAP);
    expect(bonus.seniority).toBeCloseTo(BRIDGE_AXIS_BONUS_CAP, 6);
    expect(bonus.relevance).toBeCloseTo(BRIDGE_AXIS_BONUS_CAP, 6);
  });

  it('weights contributions by weight × trust × exists × validity', () => {
    const bonus = computeEvalBonus([
      stubResult('addr.eth', { seniority: 0.8, relevance: 0.8, trust: 1, weight: 1 }),
      stubResult('description', {
        seniority: 0.2,
        relevance: 0.2,
        trust: 0.5,
        weight: 0.5,
      }),
    ]);
    // weighted seniority = (0.8*1 + 0.2*0.25) / (1 + 0.25) = 0.85/1.25 = 0.68
    // bonus = min(0.1, 0.68 * 0.1) = 0.068
    expect(bonus.seniority).toBeCloseTo(0.068, 3);
    expect(bonus.relevance).toBeCloseTo(0.068, 3);
  });

  it('appliedToScore100 mirrors the score engine 0.5/0.5 axis weighting + rounding', () => {
    const bonus = computeEvalBonus([
      stubResult('addr.eth', { seniority: 1, relevance: 0, trust: 1, weight: 1 }),
    ]);
    // seniority bonus = 0.1, relevance bonus = 0
    // appliedToScore100 = round((0.1 + 0) * 0.5 * 100) = 5
    expect(bonus.appliedToScore100).toBe(5);
  });

  it('skips antisignal-only engines (validity 0) in the bonus calculation', () => {
    const bonus = computeEvalBonus([
      stubResult('addr.eth', {
        seniority: 0.6,
        relevance: 0.6,
        trust: 1,
        weight: 1,
      }),
      stubResult('url', {
        seniority: 0.9,
        relevance: 0.9,
        validity: 0, // malformed URL — engine emitted exists=true but invalid
        trust: 1,
        weight: 1,
      }),
    ]);
    // Only addr.eth contributes: bonus = min(0.1, 0.6 * 0.1) = 0.06
    expect(bonus.seniority).toBeCloseTo(0.06, 3);
    expect(bonus.relevance).toBeCloseTo(0.06, 3);
  });
});
