import { describe, expect, it } from 'vitest';

import {
  DEFAULT_GRACE_SECONDS,
  applyManifestGracePolicy,
  readGraceSecondsFromEnv,
} from '../../src/verdict/gracePolicy.js';

const baseEffective = '2026-05-09T12:00:00.000Z';
const fixedClock = (iso: string) => () => new Date(iso);

describe('readGraceSecondsFromEnv', () => {
  it('returns 0 (disabled) when env var is unset', () => {
    expect(readGraceSecondsFromEnv({})).toBe(0);
  });

  it('returns 0 when env var is empty string', () => {
    expect(readGraceSecondsFromEnv({ MANIFEST_GRACE_SECONDS: '' })).toBe(0);
  });

  it('returns 0 for non-numeric values', () => {
    expect(readGraceSecondsFromEnv({ MANIFEST_GRACE_SECONDS: 'abc' })).toBe(0);
  });

  it('returns 0 for negative values', () => {
    expect(readGraceSecondsFromEnv({ MANIFEST_GRACE_SECONDS: '-5' })).toBe(0);
  });

  it('parses a positive integer string', () => {
    expect(readGraceSecondsFromEnv({ MANIFEST_GRACE_SECONDS: '300' })).toBe(300);
  });

  it('floors fractional values', () => {
    expect(readGraceSecondsFromEnv({ MANIFEST_GRACE_SECONDS: '60.9' })).toBe(60);
  });

  it('default DEFAULT_GRACE_SECONDS is 0', () => {
    expect(DEFAULT_GRACE_SECONDS).toBe(0);
  });
});

describe('applyManifestGracePolicy — disabled by default', () => {
  it('returns SIREN when graceSeconds is omitted', () => {
    const r = applyManifestGracePolicy({ effectiveFrom: baseEffective });
    expect(r.verdict).toBe('SIREN');
    expect(r.reason).toBe('manifest_stale_or_unexpected_upgrade');
  });

  it('returns SIREN when graceSeconds is explicitly 0', () => {
    const r = applyManifestGracePolicy({ effectiveFrom: baseEffective }, { graceSeconds: 0 });
    expect(r.verdict).toBe('SIREN');
  });

  it('returns SIREN when graceSeconds is negative (defensive)', () => {
    const r = applyManifestGracePolicy(
      { effectiveFrom: baseEffective },
      { graceSeconds: -10 },
    );
    expect(r.verdict).toBe('SIREN');
  });
});

describe('applyManifestGracePolicy — enabled within window', () => {
  it('returns REVIEW when now is just after effectiveFrom', () => {
    const r = applyManifestGracePolicy(
      { effectiveFrom: baseEffective },
      { graceSeconds: 300, clock: fixedClock('2026-05-09T12:00:01.000Z') },
    );
    expect(r.verdict).toBe('REVIEW');
    expect(r.reason).toBe('manifest_update_in_flight');
  });

  it('returns REVIEW exactly at the window boundary', () => {
    const r = applyManifestGracePolicy(
      { effectiveFrom: baseEffective },
      { graceSeconds: 300, clock: fixedClock('2026-05-09T12:05:00.000Z') },
    );
    expect(r.verdict).toBe('REVIEW');
  });

  it('returns SIREN one second past the window boundary', () => {
    const r = applyManifestGracePolicy(
      { effectiveFrom: baseEffective },
      { graceSeconds: 300, clock: fixedClock('2026-05-09T12:05:01.000Z') },
    );
    expect(r.verdict).toBe('SIREN');
  });

  it('returns REVIEW when now equals effectiveFrom (zero diff is within any positive window)', () => {
    const r = applyManifestGracePolicy(
      { effectiveFrom: baseEffective },
      { graceSeconds: 60, clock: fixedClock(baseEffective) },
    );
    expect(r.verdict).toBe('REVIEW');
  });
});

describe('applyManifestGracePolicy — clock + timestamp edge cases', () => {
  it('returns SIREN when effectiveFrom is in the future', () => {
    const r = applyManifestGracePolicy(
      { effectiveFrom: '2027-01-01T00:00:00Z' },
      { graceSeconds: 300, clock: fixedClock('2026-05-09T12:00:00Z') },
    );
    expect(r.verdict).toBe('SIREN');
  });

  it('returns SIREN when effectiveFrom is unparseable', () => {
    const r = applyManifestGracePolicy(
      { effectiveFrom: 'not a date' },
      { graceSeconds: 300, clock: fixedClock('2026-05-09T12:00:00Z') },
    );
    expect(r.verdict).toBe('SIREN');
  });

  it('returns SIREN when effectiveFrom is far in the past beyond the window', () => {
    const r = applyManifestGracePolicy(
      { effectiveFrom: baseEffective },
      { graceSeconds: 300, clock: fixedClock('2026-06-01T00:00:00Z') },
    );
    expect(r.verdict).toBe('SIREN');
  });
});
