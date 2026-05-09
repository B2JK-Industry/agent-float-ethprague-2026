import { privateKeyToAccount } from 'viem/accounts';
import type { Hex } from 'viem';

import type { Address, HexBytes, SirenReport, SirenReportAuth } from '../sirenReport.js';

import { buildSirenReportTypedData } from './sirenReportTypedData.js';

export interface SignReportResult {
  readonly report: SirenReport;
  readonly signature: HexBytes;
  readonly signer: Address;
}

export async function signReport(
  report: SirenReport,
  privateKey: Hex,
  options: { now?: () => Date } = {},
): Promise<SignReportResult> {
  const account = privateKeyToAccount(privateKey);
  const typedData = buildSirenReportTypedData(report);

  const signature = (await account.signTypedData({
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
  })) as HexBytes;

  const signedAt = (options.now?.() ?? new Date()).toISOString();

  const auth: SirenReportAuth = {
    status: 'valid',
    signatureType: 'EIP-712',
    signer: account.address,
    signature,
    signedAt,
  };

  const signedReport: SirenReport = {
    ...report,
    auth,
  };

  return {
    report: signedReport,
    signature,
    signer: account.address,
  };
}
