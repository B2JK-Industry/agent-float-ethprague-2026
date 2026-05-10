import { privateKeyToAccount } from 'viem/accounts';
import type { Hex } from 'viem';

import { buildServerPermitTypedData } from './typedData.js';
import type {
  PermitDomain,
  ServerPermitMessage,
  SignedServerPermit,
} from './types.js';

export interface SignServerPermitInput {
  readonly message: ServerPermitMessage;
  readonly domain: PermitDomain;
  readonly signerPrivateKey: Hex;
}

export async function signServerPermit(
  input: SignServerPermitInput,
): Promise<SignedServerPermit> {
  const account = privateKeyToAccount(input.signerPrivateKey);
  const typedData = buildServerPermitTypedData(input.message, input.domain);
  const signature = (await account.signTypedData({
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
  })) as Hex;
  return {
    message: input.message,
    domain: input.domain,
    signer: account.address,
    signature,
  };
}
