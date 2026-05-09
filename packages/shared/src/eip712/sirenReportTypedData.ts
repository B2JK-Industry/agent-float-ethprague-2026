import { keccak256, stringToHex, type TypedData, type TypedDataDomain } from 'viem';

import type { Address, Hex32, SirenReport } from '../sirenReport.js';

export const SIREN_REPORT_DOMAIN_NAME = 'Upgrade Siren' as const;
export const SIREN_REPORT_DOMAIN_VERSION = '1' as const;
export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000';

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
    { name: 'contentHash', type: 'bytes32' },
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
  readonly contentHash: Hex32;
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
// hand. Used to derive the contentHash that binds the entire report payload
// (sans `auth`) into the EIP-712 signature.
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

// Computes the contentHash that binds non-typed-data report fields
// (`findings`, `sourcify`, `ens`, plus any other future additions) into the
// EIP-712 signature. The `auth` block is excluded so the same payload can be
// signed by a fresh `signReport` invocation without circularity. Tampering
// any field in the report (other than `auth`) changes contentHash and the
// signature stops recovering to the original signer.
export function computeSirenReportContentHash(report: SirenReport): Hex32 {
  const { auth: _auth, ...rest } = report;
  void _auth;
  return keccak256(stringToHex(canonicalJson(rest))) as Hex32;
}

export function buildSirenReportTypedData(report: SirenReport): SirenReportTypedData {
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
    contentHash: computeSirenReportContentHash(report),
  };

  return {
    domain: buildSirenReportDomain(report.chainId),
    types: SIREN_REPORT_TYPED_DATA_TYPES,
    primaryType: 'SirenReport',
    message,
  };
}
