import { keccak256, stringToHex } from 'viem';

import type { Hex32 } from '@upgrade-siren/shared';

import type { UpgradeManifest } from './types.js';

export type ManifestChainFailureReason =
  | 'previous_manifest_hash_mismatch'
  | 'invalid_previous_manifest_hash_format';

export interface ManifestChainValid {
  readonly valid: true;
  readonly expected: Hex32;
}

export interface ManifestChainInvalid {
  readonly valid: false;
  readonly reason: ManifestChainFailureReason;
  readonly expected: Hex32;
  readonly got: string;
  readonly message: string;
}

export type ManifestChainResult = ManifestChainValid | ManifestChainInvalid;

// Canonical JSON: sort keys at every level, no whitespace. The result is
// stable across runs and deterministic for hashing.
function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']';
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return (
      '{' +
      keys.map((k) => JSON.stringify(k) + ':' + canonicalJson(obj[k])).join(',') +
      '}'
    );
  }
  return JSON.stringify(value);
}

export function canonicalManifestJson(manifest: UpgradeManifest): string {
  return canonicalJson(manifest);
}

export function hashManifest(manifest: UpgradeManifest): Hex32 {
  return keccak256(stringToHex(canonicalManifestJson(manifest))) as Hex32;
}

const HASH32_RE = /^0x[a-fA-F0-9]{64}$/;

export function validateManifestChain(
  current: UpgradeManifest,
  previous: UpgradeManifest,
): ManifestChainResult {
  const expected = hashManifest(previous);

  if (!HASH32_RE.test(current.previousManifestHash)) {
    return {
      valid: false,
      reason: 'invalid_previous_manifest_hash_format',
      expected,
      got: current.previousManifestHash,
      message: `manifest.chain: current.previousManifestHash is not a 0x-prefixed 32-byte hex string`,
    };
  }

  if (current.previousManifestHash.toLowerCase() === expected.toLowerCase()) {
    return { valid: true, expected };
  }

  return {
    valid: false,
    reason: 'previous_manifest_hash_mismatch',
    expected,
    got: current.previousManifestHash,
    message: `manifest.chain: current.previousManifestHash ${current.previousManifestHash} does not match keccak256(canonical(previous)) ${expected}`,
  };
}
