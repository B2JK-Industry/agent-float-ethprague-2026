import type { TypedData, TypedDataDomain } from 'viem';

import {
  UMIA_VALIDATION_HOOK_DOMAIN_NAME,
  UMIA_VALIDATION_HOOK_DOMAIN_VERSION,
  type PermitDomain,
  type ServerPermitMessage,
} from './types.js';

export const SERVER_PERMIT_TYPED_DATA_TYPES = {
  ServerPermit: [
    { name: 'wallet', type: 'address' },
    { name: 'step', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const satisfies TypedData;

export type ServerPermitTypedDataTypes = typeof SERVER_PERMIT_TYPED_DATA_TYPES;

export interface ServerPermitTypedData {
  readonly domain: TypedDataDomain;
  readonly types: ServerPermitTypedDataTypes;
  readonly primaryType: 'ServerPermit';
  readonly message: ServerPermitMessage;
}

export function buildServerPermitDomain(domain: PermitDomain): TypedDataDomain {
  return {
    name: UMIA_VALIDATION_HOOK_DOMAIN_NAME,
    version: UMIA_VALIDATION_HOOK_DOMAIN_VERSION,
    chainId: domain.chainId,
    verifyingContract: domain.hookAddress,
  };
}

export function buildServerPermitTypedData(
  message: ServerPermitMessage,
  domain: PermitDomain,
): ServerPermitTypedData {
  return {
    domain: buildServerPermitDomain(domain),
    types: SERVER_PERMIT_TYPED_DATA_TYPES,
    primaryType: 'ServerPermit',
    message,
  };
}
