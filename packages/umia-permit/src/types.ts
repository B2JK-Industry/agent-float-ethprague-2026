// Mirrors the on-chain ABI of UmiaValidationHook (per docs.umia.finance
// /docs/technical-reference/validation-hook). The hook is the contract
// called by the CCA on every Tailored Auction bid; mode 0x01 is the
// server-permit path that this package targets.
//
// EIP-712 domain (matches what the hook uses to recover the signer):
//   EIP712Domain(name "UmiaValidationHook", version "1", chainId,
//                verifyingContract /* the hook itself */)
//
// EIP-712 message:
//   ServerPermit(address wallet, uint256 step, uint256 deadline)
//
// Wire-format hookData when the bid uses the server-permit path:
//   0x01 || abi.encode(uint256 permitStep, uint256 deadline, bytes signature)
//
// The first byte is a type flag the hook uses to dispatch between
// server-permit and zkTLS proof modes; we only emit 0x01 here.

import type { Address, Hex } from 'viem';

export const UMIA_VALIDATION_HOOK_DOMAIN_NAME = 'UmiaValidationHook' as const;
export const UMIA_VALIDATION_HOOK_DOMAIN_VERSION = '1' as const;
export const SERVER_PERMIT_TYPE_FLAG: Hex = '0x01';

export interface ServerPermitMessage {
  readonly wallet: Address;
  readonly step: bigint;
  readonly deadline: bigint;
}

export interface PermitDomain {
  readonly hookAddress: Address;
  readonly chainId: number;
}

export interface SignedServerPermit {
  readonly message: ServerPermitMessage;
  readonly domain: PermitDomain;
  readonly signer: Address;
  readonly signature: Hex;
}

export interface EncodedHookData {
  readonly hookData: Hex;
  readonly signedAt: number;
  readonly expiresAt: number;
}
