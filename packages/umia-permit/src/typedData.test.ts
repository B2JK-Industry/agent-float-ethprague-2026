import { describe, expect, it } from 'vitest';

import {
  buildServerPermitDomain,
  buildServerPermitTypedData,
  SERVER_PERMIT_TYPED_DATA_TYPES,
} from './typedData.js';
import {
  UMIA_VALIDATION_HOOK_DOMAIN_NAME,
  UMIA_VALIDATION_HOOK_DOMAIN_VERSION,
} from './types.js';

const HOOK_ADDRESS = '0xcccccccccccccccccccccccccccccccccccccccc' as const;
const WALLET = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;

describe('buildServerPermitDomain', () => {
  it('matches the canonical Umia hook domain (name "UmiaValidationHook" version "1")', () => {
    const domain = buildServerPermitDomain({
      hookAddress: HOOK_ADDRESS,
      chainId: 11155111,
    });
    expect(domain.name).toBe(UMIA_VALIDATION_HOOK_DOMAIN_NAME);
    expect(domain.version).toBe(UMIA_VALIDATION_HOOK_DOMAIN_VERSION);
    expect(domain.chainId).toBe(11155111);
    expect(domain.verifyingContract).toBe(HOOK_ADDRESS);
  });
});

describe('buildServerPermitTypedData', () => {
  it('exposes the locked ServerPermit(address,uint256,uint256) shape', () => {
    expect(SERVER_PERMIT_TYPED_DATA_TYPES.ServerPermit).toEqual([
      { name: 'wallet', type: 'address' },
      { name: 'step', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ]);
  });

  it('builds typed-data with the supplied message + domain', () => {
    const td = buildServerPermitTypedData(
      { wallet: WALLET, step: 4n, deadline: 1800000000n },
      { hookAddress: HOOK_ADDRESS, chainId: 1 },
    );
    expect(td.primaryType).toBe('ServerPermit');
    expect(td.message.wallet).toBe(WALLET);
    expect(td.message.step).toBe(4n);
    expect(td.message.deadline).toBe(1800000000n);
    expect(td.domain.chainId).toBe(1);
    expect(td.domain.verifyingContract).toBe(HOOK_ADDRESS);
  });
});
