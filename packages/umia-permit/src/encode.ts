import { concatHex, encodeAbiParameters, type Hex } from 'viem';

import { SERVER_PERMIT_TYPE_FLAG, type SignedServerPermit } from './types.js';

// Materialise a SignedServerPermit into the exact bytes the
// UmiaValidationHook expects on the wire:
//
//   hookData = 0x01 || abi.encode(uint256 permitStep, uint256 deadline,
//                                 bytes signature)
//
// The 0x01 prefix is the type flag the hook uses to dispatch between
// server-permit and zkTLS proof modes; the remaining payload mirrors
// the (permitStep, deadline, signature) decoded by the hook in the
// permit branch.
export function encodeHookData(permit: SignedServerPermit): Hex {
  const payload = encodeAbiParameters(
    [
      { name: 'permitStep', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    [permit.message.step, permit.message.deadline, permit.signature],
  );
  return concatHex([SERVER_PERMIT_TYPE_FLAG, payload]);
}
