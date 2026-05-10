import { describe, expect, it } from 'vitest';
import { decodeAbiParameters, sliceHex } from 'viem';

import { encodeHookData } from './encode.js';
import { signServerPermit } from './sign.js';
import { SERVER_PERMIT_TYPE_FLAG } from './types.js';

const TEST_KEY = '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318' as const;
const HOOK_ADDRESS = '0xcccccccccccccccccccccccccccccccccccccccc' as const;
const BIDDER_WALLET = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;

describe('encodeHookData', () => {
  it('prefixes payload with the 0x01 type flag', async () => {
    const permit = await signServerPermit({
      message: { wallet: BIDDER_WALLET, step: 3n, deadline: 1750000000n },
      domain: { hookAddress: HOOK_ADDRESS, chainId: 11155111 },
      signerPrivateKey: TEST_KEY,
    });
    const hookData = encodeHookData(permit);
    expect(hookData.slice(0, 4)).toBe(SERVER_PERMIT_TYPE_FLAG);
    expect(hookData.length).toBeGreaterThan(SERVER_PERMIT_TYPE_FLAG.length);
  });

  it('round-trips the (step, deadline, signature) tuple via abi.decode', async () => {
    const permit = await signServerPermit({
      message: { wallet: BIDDER_WALLET, step: 7n, deadline: 1900000000n },
      domain: { hookAddress: HOOK_ADDRESS, chainId: 1 },
      signerPrivateKey: TEST_KEY,
    });
    const hookData = encodeHookData(permit);
    // Strip the 0x01 type flag (1 byte = 2 hex chars after the leading 0x).
    const payload = ('0x' + hookData.slice(4)) as `0x${string}`;
    const [step, deadline, signature] = decodeAbiParameters(
      [
        { name: 'permitStep', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'signature', type: 'bytes' },
      ],
      payload,
    );
    expect(step).toBe(7n);
    expect(deadline).toBe(1900000000n);
    expect(signature.toLowerCase()).toBe(permit.signature.toLowerCase());
  });

  it('first byte slice is exactly 0x01', async () => {
    const permit = await signServerPermit({
      message: { wallet: BIDDER_WALLET, step: 0n, deadline: 1n },
      domain: { hookAddress: HOOK_ADDRESS, chainId: 1 },
      signerPrivateKey: TEST_KEY,
    });
    const hookData = encodeHookData(permit);
    expect(sliceHex(hookData, 0, 1)).toBe('0x01');
  });
});
