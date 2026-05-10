import { describe, expect, it } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';

import { recoverServerPermitSigner } from './verify.js';
import { signServerPermit } from './sign.js';

const TEST_KEY = '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318' as const;
const HOOK_ADDRESS = '0xcccccccccccccccccccccccccccccccccccccccc' as const;
const BIDDER_WALLET = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const ALT_HOOK = '0xdddddddddddddddddddddddddddddddddddddddd' as const;

describe('signServerPermit', () => {
  it('produces a signature that recovers to the signer for the given typed-data', async () => {
    const result = await signServerPermit({
      message: {
        wallet: BIDDER_WALLET,
        step: 2n,
        deadline: 1747000000n,
      },
      domain: { hookAddress: HOOK_ADDRESS, chainId: 11155111 },
      signerPrivateKey: TEST_KEY,
    });

    const expectedSigner = privateKeyToAccount(TEST_KEY).address;
    expect(result.signer.toLowerCase()).toBe(expectedSigner.toLowerCase());
    expect(result.signature).toMatch(/^0x[0-9a-fA-F]{130}$/);

    const recovered = await recoverServerPermitSigner({
      message: result.message,
      domain: result.domain,
      signature: result.signature,
    });
    expect(recovered.toLowerCase()).toBe(expectedSigner.toLowerCase());
  });

  it('produces deterministic signatures for fixed inputs', async () => {
    const a = await signServerPermit({
      message: { wallet: BIDDER_WALLET, step: 1n, deadline: 1700000000n },
      domain: { hookAddress: HOOK_ADDRESS, chainId: 1 },
      signerPrivateKey: TEST_KEY,
    });
    const b = await signServerPermit({
      message: { wallet: BIDDER_WALLET, step: 1n, deadline: 1700000000n },
      domain: { hookAddress: HOOK_ADDRESS, chainId: 1 },
      signerPrivateKey: TEST_KEY,
    });
    expect(a.signature).toBe(b.signature);
  });

  it('different chainIds produce different signatures (domain separation)', async () => {
    const mainnet = await signServerPermit({
      message: { wallet: BIDDER_WALLET, step: 1n, deadline: 1700000000n },
      domain: { hookAddress: HOOK_ADDRESS, chainId: 1 },
      signerPrivateKey: TEST_KEY,
    });
    const sepolia = await signServerPermit({
      message: { wallet: BIDDER_WALLET, step: 1n, deadline: 1700000000n },
      domain: { hookAddress: HOOK_ADDRESS, chainId: 11155111 },
      signerPrivateKey: TEST_KEY,
    });
    expect(mainnet.signature).not.toBe(sepolia.signature);
  });

  it('different hookAddresses produce different signatures (domain separation)', async () => {
    const a = await signServerPermit({
      message: { wallet: BIDDER_WALLET, step: 1n, deadline: 1700000000n },
      domain: { hookAddress: HOOK_ADDRESS, chainId: 1 },
      signerPrivateKey: TEST_KEY,
    });
    const b = await signServerPermit({
      message: { wallet: BIDDER_WALLET, step: 1n, deadline: 1700000000n },
      domain: {
        hookAddress: ALT_HOOK,
        chainId: 1,
      },
      signerPrivateKey: TEST_KEY,
    });
    expect(a.signature).not.toBe(b.signature);
  });
});
