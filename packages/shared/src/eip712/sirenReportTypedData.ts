import type { TypedData, TypedDataDomain } from 'viem';

import type { Address, SirenReport } from '../sirenReport.js';

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
  };

  return {
    domain: buildSirenReportDomain(report.chainId),
    types: SIREN_REPORT_TYPED_DATA_TYPES,
    primaryType: 'SirenReport',
    message,
  };
}
