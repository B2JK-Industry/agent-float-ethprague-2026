import { describe, expect, it } from 'vitest';

import type { Address } from '@upgrade-siren/shared';

import {
  computeVerdict,
  type ComputeVerdictInput,
} from '../../src/verdict/engine.js';
import { MANIFEST_SCHEMA_V1, type UpgradeManifest } from '../../src/manifest/types.js';

const PROXY: Address = '0x1111111111111111111111111111111111111111';
const IMPL_A: Address = '0x2222222222222222222222222222222222222222';
const IMPL_B: Address = '0x3333333333333333333333333333333333333333';
const OWNER: Address = '0x5555555555555555555555555555555555555555';

const baseManifest: UpgradeManifest = {
  schema: MANIFEST_SCHEMA_V1,
  chainId: 11155111,
  proxy: PROXY,
  previousImpl: IMPL_A,
  currentImpl: IMPL_B,
  reportUri: 'https://example.com/r',
  reportHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
  version: 2,
  effectiveFrom: '2026-05-09T00:00:00Z',
  previousManifestHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

const happySigned: ComputeVerdictInput = {
  mode: 'signed-manifest',
  mock: false,
  manifestPresent: true,
  manifestParseOk: true,
  manifest: baseManifest,
  ownerPresent: true,
  ownerAddress: OWNER,
  liveImplementation: IMPL_B,
  currentSourcifyMatch: 'exact_match',
  previousSourcifyMatch: 'exact_match',
  abiDiff: { added: [], removed: [], addedAny: false, removedAny: false },
  storageDiff: { kind: 'compatible_appended_only', changes: [], appended: [] },
  signatureVerification: { valid: true, recovered: OWNER },
};

describe('computeVerdict — signed-manifest happy path', () => {
  it('returns SAFE when every signal is positive', () => {
    const r = computeVerdict(happySigned);
    expect(r.verdict).toBe('SAFE');
    expect(r.mode).toBe('signed-manifest');
    expect(r.confidence).toBe('operator-signed');
    expect(r.findings.some((f) => f.severity === 'critical')).toBe(false);
    expect(r.findings.some((f) => f.id === 'VERIFICATION_CURRENT')).toBe(true);
    expect(r.findings.some((f) => f.id === 'SIGNATURE_VALID')).toBe(true);
  });
});

describe('computeVerdict — signed-manifest negative signals', () => {
  it('SIREN when current implementation is unverified', () => {
    const r = computeVerdict({ ...happySigned, currentSourcifyMatch: 'not_found' });
    expect(r.verdict).toBe('SIREN');
    expect(r.findings.some((f) => f.id === 'VERIFICATION_CURRENT_UNVERIFIED')).toBe(true);
  });

  it('SIREN when live slot disagrees with manifest currentImpl', () => {
    const r = computeVerdict({ ...happySigned, liveImplementation: IMPL_A });
    expect(r.verdict).toBe('SIREN');
    expect(r.findings.some((f) => f.id === 'MANIFEST_STALE_OR_UNEXPECTED_UPGRADE')).toBe(true);
  });

  it('SIREN when manifest is malformed in signed-manifest mode', () => {
    const r = computeVerdict({ ...happySigned, manifestParseOk: false });
    expect(r.verdict).toBe('SIREN');
    expect(r.findings.some((f) => f.id === 'MANIFEST_MALFORMED')).toBe(true);
  });

  it('SIREN when upgrade-siren:owner is absent in signed-manifest path', () => {
    const r = computeVerdict({ ...happySigned, ownerPresent: false });
    expect(r.verdict).toBe('SIREN');
    expect(r.findings.some((f) => f.id === 'OWNER_ABSENT')).toBe(true);
  });

  it('SIREN when production report signature is missing', () => {
    const r = computeVerdict({ ...happySigned, signatureVerification: null });
    expect(r.verdict).toBe('SIREN');
    expect(r.findings.some((f) => f.id === 'SIGNATURE_MISSING')).toBe(true);
  });

  it('SIREN when signature recovers to a different address', () => {
    const r = computeVerdict({
      ...happySigned,
      signatureVerification: {
        valid: false,
        reason: 'owner_mismatch',
        message: 'mismatch',
        recovered: '0x9999999999999999999999999999999999999999',
      },
    });
    expect(r.verdict).toBe('SIREN');
    expect(r.findings.some((f) => f.id === 'SIGNATURE_OWNER_MISMATCH')).toBe(true);
  });

  it('SIREN when storage layout is incompatible (changed type)', () => {
    const r = computeVerdict({
      ...happySigned,
      storageDiff: {
        kind: 'incompatible_changed_type',
        changes: [{ position: 0, note: 'totalAssets type changed' }],
        appended: [],
      },
    });
    expect(r.verdict).toBe('SIREN');
    expect(r.findings.some((f) => f.id === 'STORAGE_INCOMPATIBLE_CHANGED_TYPE')).toBe(true);
  });

  it('SIREN when a risky selector is added to the ABI', () => {
    const r = computeVerdict({
      ...happySigned,
      abiDiff: {
        added: [
          { name: 'sweep', selector: '0xdeadbeef', stateMutability: 'nonpayable', inputs: ['address'] },
        ],
        removed: [],
        addedAny: true,
        removedAny: false,
      },
    });
    expect(r.verdict).toBe('SIREN');
    expect(r.findings.some((f) => f.id === 'ABI_RISKY_SELECTOR_ADDED')).toBe(true);
  });

  it('REVIEW when a safety selector is removed but no critical signal', () => {
    const r = computeVerdict({
      ...happySigned,
      abiDiff: {
        added: [],
        removed: [
          { name: 'pause', selector: '0xabcdef12', stateMutability: 'nonpayable', inputs: [] },
        ],
        addedAny: false,
        removedAny: true,
      },
    });
    expect(r.verdict).toBe('REVIEW');
    expect(r.findings.some((f) => f.id === 'ABI_RISKY_SELECTOR_REMOVED')).toBe(true);
  });

  it('REVIEW when storage layout is unavailable', () => {
    const r = computeVerdict({
      ...happySigned,
      storageDiff: { kind: 'unknown_missing_layout', changes: [], appended: [] },
    });
    expect(r.verdict).toBe('REVIEW');
    expect(r.findings.some((f) => f.id === 'STORAGE_LAYOUT_MISSING')).toBe(true);
  });
});

describe('computeVerdict — public-read mode', () => {
  const publicRead: ComputeVerdictInput = {
    ...happySigned,
    mode: 'public-read',
    manifestPresent: false,
    manifestParseOk: false,
    manifest: null,
    ownerPresent: false,
    ownerAddress: null,
    signatureVerification: null,
  };

  it('never returns SAFE even when all evidence is positive', () => {
    const r = computeVerdict(publicRead);
    expect(r.verdict).not.toBe('SAFE');
    expect(['REVIEW', 'SIREN']).toContain(r.verdict);
    expect(r.confidence).toBe('public-read');
  });

  it('returns REVIEW when current implementation is verified and no critical signal', () => {
    const r = computeVerdict(publicRead);
    expect(r.verdict).toBe('REVIEW');
    expect(r.findings.some((f) => f.id === 'PUBLIC_READ_MODE')).toBe(true);
    expect(r.findings.some((f) => f.id === 'MANIFEST_ABSENT')).toBe(true);
  });

  it('returns SIREN when current implementation is unverified in public-read', () => {
    const r = computeVerdict({ ...publicRead, currentSourcifyMatch: 'not_found' });
    expect(r.verdict).toBe('SIREN');
  });

  it('returns SIREN when storage layout is incompatible in public-read', () => {
    const r = computeVerdict({
      ...publicRead,
      storageDiff: { kind: 'incompatible_reordered', changes: [{ position: 0, note: 'swap' }], appended: [] },
    });
    expect(r.verdict).toBe('SIREN');
  });
});

describe('computeVerdict — mock mode', () => {
  it('confidence is mock; verdict reflects findings', () => {
    const r = computeVerdict({ ...happySigned, mode: 'mock', mock: true });
    expect(r.confidence).toBe('mock');
    expect(r.findings.some((f) => f.id === 'MOCK_MODE')).toBe(true);
  });
});

describe('computeVerdict — determinism', () => {
  it('identical inputs always yield identical findings (frozen)', () => {
    const a = computeVerdict(happySigned);
    const b = computeVerdict(happySigned);
    expect(a.verdict).toBe(b.verdict);
    expect(a.findings.length).toBe(b.findings.length);
    expect(a.findings.map((f) => f.id)).toEqual(b.findings.map((f) => f.id));
    expect(a.summary).toBe(b.summary);
  });

  it('finding order is stable across runs', () => {
    const out = Array.from({ length: 5 }, () => computeVerdict(happySigned));
    const idsList = out.map((r) => r.findings.map((f) => f.id).join(','));
    for (const ids of idsList) {
      expect(ids).toBe(idsList[0]);
    }
  });
});

describe('computeVerdict — proxy not initialised', () => {
  it('warns when liveImplementation is null', () => {
    const r = computeVerdict({ ...happySigned, liveImplementation: null });
    expect(r.findings.some((f) => f.id === 'PROXY_NOT_INITIALISED')).toBe(true);
    // Other signals (manifest still has currentImpl, sig still valid) keep the
    // critical surface clean; the result is REVIEW.
    expect(r.verdict).toBe('REVIEW');
  });
});
