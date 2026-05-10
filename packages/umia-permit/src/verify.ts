import { recoverTypedDataAddress, type Hex } from 'viem';

import { buildServerPermitTypedData } from './typedData.js';
import type { PermitDomain, ServerPermitMessage } from './types.js';

export interface VerifyServerPermitInput {
  readonly message: ServerPermitMessage;
  readonly domain: PermitDomain;
  readonly signature: Hex;
}

// Mirrors the recovery the on-chain hook performs against
// abi.decode(hookData[1:]). Used for tests and for the API endpoint to
// double-check its own signature before handing it back to a bidder.
export async function recoverServerPermitSigner(
  input: VerifyServerPermitInput,
): Promise<`0x${string}`> {
  const typedData = buildServerPermitTypedData(input.message, input.domain);
  return recoverTypedDataAddress({
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
    signature: input.signature,
  });
}
