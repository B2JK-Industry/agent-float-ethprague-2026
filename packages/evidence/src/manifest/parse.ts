import type { Address, Hex32 } from '@upgrade-siren/shared';

import {
  MANIFEST_SCHEMA_V1,
  type ManifestError,
  type ParseManifestResult,
  type UpgradeManifest,
} from './types.js';
import { KNOWN_MANIFEST_VERSIONS, isKnownManifestVersion } from './versionPolicy.js';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const HASH32_RE = /^0x[a-fA-F0-9]{64}$/;

const REQUIRED_FIELDS = [
  'schema',
  'chainId',
  'proxy',
  'previousImpl',
  'currentImpl',
  'reportUri',
  'reportHash',
  'version',
  'effectiveFrom',
  'previousManifestHash',
] as const;

function err(error: ManifestError): ParseManifestResult {
  return { kind: 'error', error };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAddress(value: unknown): value is Address {
  return typeof value === 'string' && ADDRESS_RE.test(value);
}

function isHash32(value: unknown): value is Hex32 {
  return typeof value === 'string' && HASH32_RE.test(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isIsoDateTime(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  // Must round-trip via ISO string to be canonical (rejects "2026-05-09" only).
  return value.includes('T') && /Z$|[+-]\d{2}:?\d{2}$/.test(value);
}

function isHttpsLikeUri(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  // Permissive: allow https://, ipfs://, ar:// and similar schemes the sponsor
  // ecosystem uses for report hosting. Reject anything without a scheme.
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

export function parseUpgradeManifest(raw: string): ParseManifestResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return err({
      reason: 'malformed_json',
      message: `manifest: invalid JSON - ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  if (!isPlainObject(parsed)) {
    return err({
      reason: 'not_an_object',
      message: 'manifest: top-level value is not a JSON object',
    });
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in parsed)) {
      return err({
        reason: 'missing_required_field',
        field,
        message: `manifest: missing required field "${field}"`,
      });
    }
  }

  const schemaValue = parsed['schema'];
  if (!isKnownManifestVersion(schemaValue)) {
    return err({
      reason: 'unknown_schema_version',
      field: 'schema',
      got: schemaValue,
      message: `manifest: unknown schema version ${JSON.stringify(schemaValue)}; known versions: ${KNOWN_MANIFEST_VERSIONS.join(', ')}`,
    });
  }

  const chainId = parsed['chainId'];
  if (!isPositiveInteger(chainId)) {
    return err({
      reason: 'invalid_chain_id',
      field: 'chainId',
      got: chainId,
      message: `manifest: chainId must be a positive integer, got ${JSON.stringify(chainId)}`,
    });
  }

  for (const addrField of ['proxy', 'previousImpl', 'currentImpl'] as const) {
    if (!isAddress(parsed[addrField])) {
      return err({
        reason: 'invalid_address',
        field: addrField,
        got: parsed[addrField],
        message: `manifest: ${addrField} must be a 0x-prefixed 20-byte hex address`,
      });
    }
  }

  if (!isHttpsLikeUri(parsed['reportUri'])) {
    return err({
      reason: 'invalid_report_uri',
      field: 'reportUri',
      got: parsed['reportUri'],
      message: `manifest: reportUri must be a non-empty URI with a scheme`,
    });
  }

  if (!isHash32(parsed['reportHash'])) {
    return err({
      reason: 'invalid_hash',
      field: 'reportHash',
      got: parsed['reportHash'],
      message: `manifest: reportHash must be a 0x-prefixed 32-byte hex string`,
    });
  }

  if (!isNonNegativeInteger(parsed['version'])) {
    return err({
      reason: 'invalid_version',
      field: 'version',
      got: parsed['version'],
      message: `manifest: version must be a non-negative integer`,
    });
  }

  if (!isIsoDateTime(parsed['effectiveFrom'])) {
    return err({
      reason: 'invalid_iso_timestamp',
      field: 'effectiveFrom',
      got: parsed['effectiveFrom'],
      message: `manifest: effectiveFrom must be an ISO-8601 datetime`,
    });
  }

  if (!isHash32(parsed['previousManifestHash'])) {
    return err({
      reason: 'invalid_hash',
      field: 'previousManifestHash',
      got: parsed['previousManifestHash'],
      message: `manifest: previousManifestHash must be a 0x-prefixed 32-byte hex string`,
    });
  }

  const manifest: UpgradeManifest = {
    schema: MANIFEST_SCHEMA_V1,
    chainId,
    proxy: parsed['proxy'] as Address,
    previousImpl: parsed['previousImpl'] as Address,
    currentImpl: parsed['currentImpl'] as Address,
    reportUri: parsed['reportUri'] as string,
    reportHash: parsed['reportHash'] as Hex32,
    version: parsed['version'] as number,
    effectiveFrom: parsed['effectiveFrom'] as string,
    previousManifestHash: parsed['previousManifestHash'] as Hex32,
  };

  return { kind: 'ok', value: manifest };
}
