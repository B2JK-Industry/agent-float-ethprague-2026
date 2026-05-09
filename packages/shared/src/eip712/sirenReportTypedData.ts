import { keccak256, stringToHex, type TypedData, type TypedDataDomain } from 'viem';

import type {
  Address,
  Hex32,
  IsoDateTime,
  SirenReport,
  SirenReportFinding,
  SirenReportSourcifyLink,
} from '../sirenReport.js';

export const SIREN_REPORT_DOMAIN_NAME = 'Upgrade Siren' as const;
export const SIREN_REPORT_DOMAIN_VERSION = '1' as const;
export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000';

// US-074 supersedes #83's monolithic `contentHash: bytes32` approach with
// the per-field shape Daniel specified: each variable-length section gets
// its own bytes32 hash field, plus the previously-omitted scalar fields
// (`recommendedAction`, `mock`, `signedAt`) are bound directly. Earlier
// iterations stopped at `summary`, leaving the rest of the payload outside
// the signature — an attacker could swap those post-signing without
// breaking recovery.
//
// Hashes are derived from a canonical JSON serialisation (sorted keys,
// no whitespace) so judges and verifiers can recompute them by hand.
export const SIREN_REPORT_TYPED_DATA_TYPES = {
  SirenReport: [
    { name: 'name', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'proxy', type: 'address' },
    { name: 'previousImplementation', type: 'address' },
    { name: 'currentImplementation', type: 'address' },
    { name: 'verdict', type: 'string' },
    { name: 'mode', type: 'string' },
    { name: 'confidence', type: 'string' },
    { name: 'generatedAt', type: 'string' },
    { name: 'summary', type: 'string' },
    { name: 'recommendedAction', type: 'string' },
    { name: 'mock', type: 'bool' },
    { name: 'findingsHash', type: 'bytes32' },
    { name: 'sourcifyLinksHash', type: 'bytes32' },
    { name: 'signedAt', type: 'string' },
  ],
} as const satisfies TypedData;

export type SirenReportTypedDataTypes = typeof SIREN_REPORT_TYPED_DATA_TYPES;

export interface SirenReportTypedDataMessage {
  readonly name: string;
  readonly chainId: bigint;
  readonly proxy: Address;
  readonly previousImplementation: Address;
  readonly currentImplementation: Address;
  readonly verdict: string;
  readonly mode: string;
  readonly confidence: string;
  readonly generatedAt: string;
  readonly summary: string;
  readonly recommendedAction: string;
  readonly mock: boolean;
  readonly findingsHash: Hex32;
  readonly sourcifyLinksHash: Hex32;
  readonly signedAt: IsoDateTime;
}

export interface SirenReportTypedData {
  readonly domain: TypedDataDomain;
  readonly types: SirenReportTypedDataTypes;
  readonly primaryType: 'SirenReport';
  readonly message: SirenReportTypedDataMessage;
}

export function buildSirenReportDomain(chainId: number): TypedDataDomain {
  return {
    name: SIREN_REPORT_DOMAIN_NAME,
    version: SIREN_REPORT_DOMAIN_VERSION,
    chainId,
    verifyingContract: ZERO_ADDRESS,
  };
}

// Canonical JSON: sorted keys at every level, no whitespace. Stable across
// runs and key-insertion orders so judges and verifiers can recompute by
// hand. Used to derive the per-array bytes32 hashes that bind variable-
// length report payload sections into the EIP-712 typed-data.
function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJson(obj[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

export function computeFindingsHash(findings: ReadonlyArray<SirenReportFinding>): Hex32 {
  return keccak256(stringToHex(canonicalJson(findings))) as Hex32;
}

export function computeSourcifyLinksHash(links: ReadonlyArray<SirenReportSourcifyLink>): Hex32 {
  return keccak256(stringToHex(canonicalJson(links))) as Hex32;
}

// Backwards-compat shim: PR #83 (merged) exported `computeSirenReportContentHash`
// as a monolithic `keccak256(canonicalJson(report sans auth))`. US-074
// supersedes that with per-field hashes inside the typed-data, but the
// helper itself is still useful as a single-line "did anything outside
// auth change?" tag for cache keys and integrity logging. Behaviour
// preserved.
export function computeSirenReportContentHash(report: SirenReport): Hex32 {
  const { auth: _auth, ...rest } = report;
  void _auth;
  return keccak256(stringToHex(canonicalJson(rest))) as Hex32;
}

export function buildSirenReportTypedData(report: SirenReport): SirenReportTypedData {
  // auth.signedAt MUST be populated on the report passed to this builder so
  // the signature binds the timestamp. signReport sets it pre-sign;
  // verifiers reconstruct against the same field on the published report.
  // null/missing signedAt is mapped to '' so the typed-data shape stays
  // stable on unsigned reports (the verifier rejects them on auth.status
  // anyway).
  const message: SirenReportTypedDataMessage = {
    name: report.name,
    chainId: BigInt(report.chainId),
    proxy: report.proxy,
    previousImplementation: report.previousImplementation ?? ZERO_ADDRESS,
    currentImplementation: report.currentImplementation,
    verdict: report.verdict,
    mode: report.mode,
    confidence: report.confidence,
    generatedAt: report.generatedAt,
    summary: report.summary,
    recommendedAction: report.recommendedAction,
    mock: report.mock,
    findingsHash: computeFindingsHash(report.findings),
    sourcifyLinksHash: computeSourcifyLinksHash(report.sourcify.links),
    signedAt: report.auth.signedAt ?? '',
  };

  return {
    domain: buildSirenReportDomain(report.chainId),
    types: SIREN_REPORT_TYPED_DATA_TYPES,
    primaryType: 'SirenReport',
    message,
  };
}
