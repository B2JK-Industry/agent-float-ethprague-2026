import { describe, expect, it } from 'vitest';

import { parseUpgradeManifest } from '../../src/manifest/parse.js';
import { MANIFEST_SCHEMA_V1 } from '../../src/manifest/types.js';
import {
  KNOWN_MANIFEST_VERSIONS,
  isKnownManifestVersion,
} from '../../src/manifest/versionPolicy.js';

describe('KNOWN_MANIFEST_VERSIONS', () => {
  it('contains exactly the v1 literal at hackathon time', () => {
    expect([...KNOWN_MANIFEST_VERSIONS]).toEqual([MANIFEST_SCHEMA_V1]);
  });
});

describe('isKnownManifestVersion', () => {
  it('returns true for v1', () => {
    expect(isKnownManifestVersion(MANIFEST_SCHEMA_V1)).toBe(true);
  });

  it('returns false for unknown version strings', () => {
    expect(isKnownManifestVersion('upgrade-siren-manifest@2')).toBe(false);
    expect(isKnownManifestVersion('siren-upgrade-manifest@1')).toBe(false); // pre-flip transposed spelling
    expect(isKnownManifestVersion('')).toBe(false);
  });

  it('returns false for non-strings', () => {
    expect(isKnownManifestVersion(null)).toBe(false);
    expect(isKnownManifestVersion(undefined)).toBe(false);
    expect(isKnownManifestVersion(1)).toBe(false);
    expect(isKnownManifestVersion({})).toBe(false);
  });
});

describe('parseUpgradeManifest enforces the policy', () => {
  it('rejects an unknown schema string with unknown_schema_version', () => {
    const raw = JSON.stringify({
      schema: 'upgrade-siren-manifest@2',
      chainId: 1,
      proxy: '0x1111111111111111111111111111111111111111',
      previousImpl: '0x2222222222222222222222222222222222222222',
      currentImpl: '0x3333333333333333333333333333333333333333',
      reportUri: 'https://example.com/r',
      reportHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
      version: 1,
      effectiveFrom: '2026-05-09T00:00:00Z',
      previousManifestHash: '0x5555555555555555555555555555555555555555555555555555555555555555',
    });
    const r = parseUpgradeManifest(raw);
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.error.reason).toBe('unknown_schema_version');
      expect(r.error.message).toContain('upgrade-siren-manifest@1');
    }
  });
});
