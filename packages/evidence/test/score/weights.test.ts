import { describe, expect, it } from 'vitest';

import {
  AXIS_WEIGHTS,
  PUBLIC_READ_TIER_CAP,
  RELEVANCE_WEIGHTS,
  SENIORITY_WEIGHTS,
  TIER_THRESHOLDS,
  TRUST_DISCOUNT_UNVERIFIED,
  TRUST_DISCOUNT_VERIFIED,
  U_TIER_MIN_NONZERO_SOURCES,
  trustFactor,
} from '../../src/score/weights.js';

describe('score weights — locked constants', () => {
  it('TRUST_DISCOUNT_UNVERIFIED locked at 0.6 (Section 21 D-G)', () => {
    expect(TRUST_DISCOUNT_UNVERIFIED).toBe(0.6);
  });

  it('TRUST_DISCOUNT_VERIFIED is 1.0', () => {
    expect(TRUST_DISCOUNT_VERIFIED).toBe(1.0);
  });

  it('seniority weights sum to 1.0 (locked per EPIC §10.2)', () => {
    const sum = Object.values(SENIORITY_WEIGHTS).reduce((acc, c) => acc + c.weight, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it('relevance weights sum to 1.0 (provisional locked per Section 21 D-A)', () => {
    const sum = Object.values(RELEVANCE_WEIGHTS).reduce((acc, c) => acc + c.weight, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it('axis weights sum to 1.0 (0.5/0.5 split locked)', () => {
    expect(AXIS_WEIGHTS.seniority + AXIS_WEIGHTS.relevance).toBe(1.0);
  });

  it('locks the seniority weight tuple verbatim from EPIC §10.2', () => {
    expect(SENIORITY_WEIGHTS.compileSuccess).toEqual({ weight: 0.25, trust: 'verified' });
    expect(SENIORITY_WEIGHTS.ciPassRate).toEqual({ weight: 0.2, trust: 'unverified' });
    expect(SENIORITY_WEIGHTS.testPresence).toEqual({ weight: 0.15, trust: 'unverified' });
    expect(SENIORITY_WEIGHTS.bugHygiene).toEqual({ weight: 0.1, trust: 'unverified' });
    expect(SENIORITY_WEIGHTS.repoHygiene).toEqual({ weight: 0.15, trust: 'unverified' });
    expect(SENIORITY_WEIGHTS.releaseCadence).toEqual({ weight: 0.15, trust: 'unverified' });
  });

  it('locks the relevance weight tuple verbatim from EPIC §10.3', () => {
    expect(RELEVANCE_WEIGHTS.sourcifyRecency).toEqual({ weight: 0.3, trust: 'verified' });
    expect(RELEVANCE_WEIGHTS.githubRecency).toEqual({ weight: 0.3, trust: 'unverified' });
    expect(RELEVANCE_WEIGHTS.onchainRecency).toEqual({ weight: 0.25, trust: 'verified' });
    expect(RELEVANCE_WEIGHTS.ensRecency).toEqual({ weight: 0.15, trust: 'verified' });
  });

  it('tier thresholds match EPIC §10.1', () => {
    expect(TIER_THRESHOLDS.S).toBe(90);
    expect(TIER_THRESHOLDS.A).toBe(75);
    expect(TIER_THRESHOLDS.B).toBe(60);
    expect(TIER_THRESHOLDS.C).toBe(45);
    expect(TIER_THRESHOLDS.D).toBe(0);
  });

  it('public-read tier cap is A (Section 21 D-I lock)', () => {
    expect(PUBLIC_READ_TIER_CAP).toBe('A');
  });

  it('U-tier triggers below 2 non-zero sources', () => {
    expect(U_TIER_MIN_NONZERO_SOURCES).toBe(2);
  });

  it('trustFactor maps verified → 1.0 and unverified → 0.6', () => {
    expect(trustFactor('verified')).toBe(1.0);
    expect(trustFactor('unverified')).toBe(0.6);
  });

  describe('v1 reachable ceilings (EPIC §10.1 table)', () => {
    it('seniority axis maximum with all unverified at 1.0 is exactly 0.70', () => {
      // 0.25*1.0 + (0.20+0.15+0.10+0.15+0.15)*0.6 = 0.25 + 0.45 = 0.70
      const verifiedContribution = SENIORITY_WEIGHTS.compileSuccess.weight * 1.0;
      const unverifiedContribution =
        (SENIORITY_WEIGHTS.ciPassRate.weight +
          SENIORITY_WEIGHTS.testPresence.weight +
          SENIORITY_WEIGHTS.bugHygiene.weight +
          SENIORITY_WEIGHTS.repoHygiene.weight +
          SENIORITY_WEIGHTS.releaseCadence.weight) *
        TRUST_DISCOUNT_UNVERIFIED;
      expect(verifiedContribution + unverifiedContribution).toBeCloseTo(0.7, 10);
    });

    it('relevance axis maximum with all components at 1.0 is exactly 0.88', () => {
      // 0.30 + 0.30*0.6 + 0.25 + 0.15 = 0.88
      const verifiedContribution =
        RELEVANCE_WEIGHTS.sourcifyRecency.weight +
        RELEVANCE_WEIGHTS.onchainRecency.weight +
        RELEVANCE_WEIGHTS.ensRecency.weight;
      const unverifiedContribution =
        RELEVANCE_WEIGHTS.githubRecency.weight * TRUST_DISCOUNT_UNVERIFIED;
      expect(verifiedContribution + unverifiedContribution).toBeCloseTo(0.88, 10);
    });

    it('v1 max final score is 79 (locked); S-tier (≥90) unreachable in v1', () => {
      // (0.5 * 0.70) + (0.5 * 0.88) = 0.79
      // round(0.79 * 100) = 79
      const score_raw = 0.5 * 0.7 + 0.5 * 0.88;
      const score_100 = Math.round(score_raw * 100);
      expect(score_100).toBe(79);
      expect(score_100).toBeLessThan(TIER_THRESHOLDS.S);
    });
  });
});
