// US-069: server-side report-trust runtime. Combines the two halves of the
// "Authentication Of Offchain Reports" pipeline from
// docs/04-technical-design.md into one entry point that the apps/web
// /r/[name] route can call once it has the manifest, the fetched report
// bytes, and the upgrade-siren:owner address from ENS:
//
//   1. keccak256(fetchedBytes) === manifest.reportHash  (integrity)
//   2. JSON.parse(fetchedBytes)                          (well-formed report)
//   3. verifyReportSignature(report, owner)              (authority)
//
// Both checks must pass for the report to be trusted. Any failure surfaces
// as a discriminated error so the verdict engine + UI can render the exact
// reason ('hash_mismatch', 'malformed_json', 'signature_missing', etc.).
// GATE-24 enforcement.

import { keccak256, type Hex } from 'viem';

import type { Address, Hex32, SirenReport } from '@upgrade-siren/shared';

import type { UpgradeManifest } from '../manifest/types.js';
import { verifyReportSignature } from './signature.js';

export type ReportTrustFailureReason =
  | 'malformed_json'
  | 'malformed_report_shape'
  | 'hash_mismatch'
  | 'signature_missing'
  | 'signature_invalid'
  | 'unsupported_signature_type'
  | 'owner_mismatch';

export interface ReportTrustOk {
  readonly kind: 'ok';
  readonly report: SirenReport;
  readonly signer: Address;
  readonly reportHash: Hex32;
}

export interface ReportTrustError {
  readonly kind: 'error';
  readonly reason: ReportTrustFailureReason;
  readonly message: string;
  readonly expectedReportHash?: Hex32;
  readonly computedReportHash?: Hex32;
  readonly recovered?: Address;
}

export type ReportTrustResult = ReportTrustOk | ReportTrustError;

function bytesToString(input: string | Uint8Array): string {
  if (typeof input === 'string') return input;
  return new TextDecoder().decode(input);
}

function bytesToHex(input: string | Uint8Array): Hex {
  const buf =
    typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let hex = '0x';
  for (const byte of buf) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex as Hex;
}

function lower(value: string): string {
  return value.toLowerCase();
}

export async function verifyReportFromManifest(
  manifest: UpgradeManifest,
  fetchedBytes: string | Uint8Array,
  owner: Address,
): Promise<ReportTrustResult> {
  // Step 1: integrity. The manifest's reportHash binds a specific bytestring;
  // any divergence is a cache poisoning / man-in-the-middle / stale-mirror
  // signal and must be flagged before any further parsing of the report.
  const computedHash = keccak256(bytesToHex(fetchedBytes)) as Hex32;
  if (lower(computedHash) !== lower(manifest.reportHash)) {
    return {
      kind: 'error',
      reason: 'hash_mismatch',
      message: `report bytes hash ${computedHash} does not match manifest.reportHash ${manifest.reportHash}`,
      expectedReportHash: manifest.reportHash,
      computedReportHash: computedHash,
    };
  }

  // Step 2: shape. The report is intended to be JSON; anything else is a
  // malformed publish.
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytesToString(fetchedBytes));
  } catch (err) {
    return {
      kind: 'error',
      reason: 'malformed_json',
      message: `report bytes are not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      expectedReportHash: manifest.reportHash,
      computedReportHash: computedHash,
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      kind: 'error',
      reason: 'malformed_report_shape',
      message: 'report top-level value is not a JSON object',
      expectedReportHash: manifest.reportHash,
      computedReportHash: computedHash,
    };
  }
  const candidate = parsed as Record<string, unknown>;
  if (typeof candidate['auth'] !== 'object' || candidate['auth'] === null) {
    return {
      kind: 'error',
      reason: 'malformed_report_shape',
      message: 'report.auth is missing or not an object',
      expectedReportHash: manifest.reportHash,
      computedReportHash: computedHash,
    };
  }
  const report = parsed as SirenReport;

  // Step 3: authority. EIP-712 signature recovery against the
  // upgrade-siren:owner address. Per docs/04, anything other than a clean
  // valid recovery is grounds to refuse to trust the report.
  const sig = await verifyReportSignature(report, owner);
  if (sig.valid) {
    return {
      kind: 'ok',
      report,
      signer: sig.recovered,
      reportHash: manifest.reportHash,
    };
  }
  const reason: ReportTrustFailureReason =
    sig.reason === 'missing_signature'
      ? 'signature_missing'
      : sig.reason === 'owner_mismatch'
      ? 'owner_mismatch'
      : sig.reason === 'unsupported_signature_type'
      ? 'unsupported_signature_type'
      : 'signature_invalid';
  return {
    kind: 'error',
    reason,
    message: sig.message,
    expectedReportHash: manifest.reportHash,
    computedReportHash: computedHash,
    ...(sig.recovered !== undefined ? { recovered: sig.recovered } : {}),
  };
}

// Re-exported so apps/web (US-068) can compute the manifest.reportHash that
// matches the bytes verifyReportFromManifest will accept. Signing flows
// (Stream A US-011 provisioning) call this on the canonical JSON of the
// signed SirenReport before writing the manifest.
export function computeReportBytesHash(input: string | Uint8Array): Hex32 {
  return keccak256(bytesToHex(input)) as Hex32;
}
