import { recoverTypedDataAddress } from 'viem';

import {
  buildSirenReportTypedData,
  type Address,
  type SirenReport,
} from '@upgrade-siren/shared';

export type VerifySignatureFailureReason =
  | 'missing_signature'
  | 'owner_mismatch'
  | 'malformed_signature'
  | 'unsupported_signature_type';

export interface VerifySignatureValid {
  readonly valid: true;
  readonly recovered: Address;
}

export interface VerifySignatureInvalid {
  readonly valid: false;
  readonly reason: VerifySignatureFailureReason;
  readonly message: string;
  readonly recovered?: Address;
}

export type VerifySignatureResult = VerifySignatureValid | VerifySignatureInvalid;

const SIGNATURE_RE = /^0x[a-fA-F0-9]{130}$/;

function addressesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export async function verifyReportSignature(
  report: SirenReport,
  owner: Address,
): Promise<VerifySignatureResult> {
  const auth = report.auth;

  if (!auth.signature || auth.status === 'unsigned') {
    return {
      valid: false,
      reason: 'missing_signature',
      message: 'verifyReportSignature: report has no signature',
    };
  }

  if (auth.signatureType !== null && auth.signatureType !== 'EIP-712') {
    return {
      valid: false,
      reason: 'unsupported_signature_type',
      message: `verifyReportSignature: unsupported signatureType ${JSON.stringify(auth.signatureType)}`,
    };
  }

  if (!SIGNATURE_RE.test(auth.signature)) {
    return {
      valid: false,
      reason: 'malformed_signature',
      message: `verifyReportSignature: signature is not a valid 65-byte hex (got length ${auth.signature.length})`,
    };
  }

  const td = buildSirenReportTypedData(report);

  let recovered: Address;
  try {
    recovered = (await recoverTypedDataAddress({
      domain: td.domain,
      types: td.types,
      primaryType: td.primaryType,
      message: td.message,
      signature: auth.signature,
    })) as Address;
  } catch (err) {
    return {
      valid: false,
      reason: 'malformed_signature',
      message: `verifyReportSignature: signature recovery failed - ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!addressesEqual(recovered, owner)) {
    return {
      valid: false,
      reason: 'owner_mismatch',
      message: `verifyReportSignature: signature recovered to ${recovered}, expected owner ${owner}`,
      recovered,
    };
  }

  return { valid: true, recovered };
}
