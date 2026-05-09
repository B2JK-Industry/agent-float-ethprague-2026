import { privateKeyToAccount } from 'viem/accounts';
import type { Hex } from 'viem';

import type { Address, HexBytes, SirenReport, SirenReportAuth } from '../sirenReport.js';

import { buildSirenReportTypedData } from './sirenReportTypedData.js';

export interface SignReportResult {
  readonly report: SirenReport;
  readonly signature: HexBytes;
  readonly signer: Address;
}

// US-074: auth.signedAt is now bound by the EIP-712 signature. The signing
// flow therefore has to populate signedAt on the report BEFORE building the
// typed-data so the timestamp ends up inside the signed digest. Verifiers
// reconstruct against the same field on the published report; tampering
// signedAt post-publish breaks recovery.
export async function signReport(
  report: SirenReport,
  privateKey: Hex,
  options: { now?: () => Date } = {},
): Promise<SignReportResult> {
  const account = privateKeyToAccount(privateKey);
  const signedAt = (options.now?.() ?? new Date()).toISOString();

  // Pre-populate auth.signedAt so it's bound by the signature. The other
  // auth fields (signature, signer, status) are populated AFTER signing
  // because they reference the signature itself; they're outside the
  // typed-data binding by construction (the typed-data hashes the rest of
  // the report).
  const reportForSigning: SirenReport = {
    ...report,
    auth: {
      ...report.auth,
      signedAt,
    },
  };

  const typedData = buildSirenReportTypedData(reportForSigning);

  const signature = (await account.signTypedData({
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
  })) as HexBytes;

  const auth: SirenReportAuth = {
    status: 'valid',
    signatureType: 'EIP-712',
    signer: account.address,
    signature,
    signedAt,
  };

  const signedReport: SirenReport = {
    ...reportForSigning,
    auth,
  };

  return {
    report: signedReport,
    signature,
    signer: account.address,
  };
}
