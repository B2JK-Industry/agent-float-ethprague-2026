import { keccak256, stringToHex } from 'viem';
import { describe, expect, it } from 'vitest';

import {
  canonicalManifestJson,
  hashManifest,
  validateManifestChain,
} from '../../src/manifest/chain.js';
import { MANIFEST_SCHEMA_V1, type UpgradeManifest } from '../../src/manifest/types.js';

const v1: UpgradeManifest = {
  schema: MANIFEST_SCHEMA_V1,
  chainId: 11155111,
  proxy: '0x1111111111111111111111111111111111111111',
  previousImpl: '0x2222222222222222222222222222222222222222',
  currentImpl: '0x3333333333333333333333333333333333333333',
  reportUri: 'https://example.com/r/v1',
  reportHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
  version: 1,
  effectiveFrom: '2026-05-08T00:00:00Z',
  previousManifestHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

const v2Linked: UpgradeManifest = {
  ...v1,
  previousImpl: v1.currentImpl,
  currentImpl: '0x5555555555555555555555555555555555555555',
  reportUri: 'https://example.com/r/v2',
  reportHash: '0x6666666666666666666666666666666666666666666666666666666666666666',
  version: 2,
  effectiveFrom: '2026-05-09T00:00:00Z',
  previousManifestHash: hashManifest(v1),
};

describe('canonicalManifestJson', () => {
  it('produces a key-sorted no-whitespace JSON string', () => {
    const json = canonicalManifestJson(v1);
    expect(json.startsWith('{"chainId":')).toBe(true);
    expect(json.includes(' ')).toBe(false);
    // Keys must appear in sorted order.
    const keysInOrder = json.match(/"[a-zA-Z]+":/g)?.map((k) => k.slice(1, -2)) ?? [];
    expect(keysInOrder).toEqual([...keysInOrder].sort());
  });

  it('produces the same output regardless of input key order', () => {
    const reordered: UpgradeManifest = {
      ...v1,
    };
    // Build a new object with literally reversed key insertion order.
    const reordered2 = Object.fromEntries(
      Object.entries(v1).reverse(),
    ) as unknown as UpgradeManifest;
    expect(canonicalManifestJson(reordered)).toBe(canonicalManifestJson(reordered2));
  });
});

describe('hashManifest', () => {
  it('returns a 32-byte 0x-prefixed hex hash', () => {
    const h = hashManifest(v1);
    expect(h).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it('produces the same hash for byte-identical inputs', () => {
    expect(hashManifest(v1)).toBe(hashManifest({ ...v1 }));
  });

  it('matches keccak256(stringToHex(canonicalJson)) directly', () => {
    expect(hashManifest(v1)).toBe(keccak256(stringToHex(canonicalManifestJson(v1))));
  });
});

describe('validateManifestChain', () => {
  it('returns valid: true for a valid chain link', () => {
    const r = validateManifestChain(v2Linked, v1);
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.expected).toBe(hashManifest(v1));
  });

  it('returns valid: false / previous_manifest_hash_mismatch for a tampered current manifest', () => {
    const tampered = { ...v2Linked, previousManifestHash: '0xdead' + '0'.repeat(60) } as UpgradeManifest;
    const r = validateManifestChain(tampered, v1);
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.reason).toBe('previous_manifest_hash_mismatch');
      expect(r.expected).toBe(hashManifest(v1));
      expect(r.got).toBe(tampered.previousManifestHash);
    }
  });

  it('returns valid: false when the previous-as-passed has been tampered (chain detects it)', () => {
    const tamperedPrev = { ...v1, currentImpl: '0xffffffffffffffffffffffffffffffffffffffff' as `0x${string}` };
    const r = validateManifestChain(v2Linked, tamperedPrev);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe('previous_manifest_hash_mismatch');
  });

  it('returns invalid_previous_manifest_hash_format for syntactically broken previousManifestHash', () => {
    const broken = { ...v2Linked, previousManifestHash: '0xnothex' } as UpgradeManifest;
    const r = validateManifestChain(broken, v1);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe('invalid_previous_manifest_hash_format');
  });

  it('is case-insensitive on the previousManifestHash hex string', () => {
    const expected = hashManifest(v1);
    const upper = { ...v2Linked, previousManifestHash: expected.toUpperCase().replace('0X', '0x') as `0x${string}` };
    const r = validateManifestChain(upper, v1);
    expect(r.valid).toBe(true);
  });
});
