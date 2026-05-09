import { describe, expect, it } from 'vitest';

import {
  countContractsDeployedBy,
  crosswalkDeployers,
  type DeployerLookup,
} from '../../../src/sources/onchain/crosswalk.js';

const PRIMARY = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const PRIMARY_CHECKSUM = '0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa' as const;
const OTHER = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;

const C1 = '0x1111111111111111111111111111111111111111' as const;
const C2 = '0x2222222222222222222222222222222222222222' as const;
const C3 = '0x3333333333333333333333333333333333333333' as const;
const C4 = '0x4444444444444444444444444444444444444444' as const;

describe('countContractsDeployedBy', () => {
  it('returns 0 for empty input', () => {
    expect(countContractsDeployedBy(PRIMARY, [])).toBe(0);
  });

  it('counts only entries whose deployer matches primaryAddress', () => {
    const lookups: DeployerLookup[] = [
      { contractAddress: C1, deployer: PRIMARY },
      { contractAddress: C2, deployer: OTHER },
      { contractAddress: C3, deployer: PRIMARY },
    ];
    expect(countContractsDeployedBy(PRIMARY, lookups)).toBe(2);
  });

  it('skips lookups with deployer=null (no Sourcify metadata)', () => {
    const lookups: DeployerLookup[] = [
      { contractAddress: C1, deployer: PRIMARY },
      { contractAddress: C2, deployer: null },
      { contractAddress: C3, deployer: null },
    ];
    expect(countContractsDeployedBy(PRIMARY, lookups)).toBe(1);
  });

  it('compares addresses case-insensitively (EIP-55 vs lowercase)', () => {
    const lookups: DeployerLookup[] = [
      { contractAddress: C1, deployer: PRIMARY_CHECKSUM },
    ];
    expect(countContractsDeployedBy(PRIMARY, lookups)).toBe(1);
  });

  it('returns 0 when no deployer matches', () => {
    const lookups: DeployerLookup[] = [
      { contractAddress: C1, deployer: OTHER },
      { contractAddress: C2, deployer: OTHER },
    ];
    expect(countContractsDeployedBy(PRIMARY, lookups)).toBe(0);
  });
});

describe('crosswalkDeployers', () => {
  it('returns full breakdown {count, examined, skipped}', () => {
    const lookups: DeployerLookup[] = [
      { contractAddress: C1, deployer: PRIMARY },        // count
      { contractAddress: C2, deployer: PRIMARY_CHECKSUM }, // count (case-insensitive)
      { contractAddress: C3, deployer: OTHER },          // miss
      { contractAddress: C4, deployer: null },           // skip
    ];
    expect(crosswalkDeployers(PRIMARY, lookups)).toEqual({
      count: 2,
      examined: 4,
      skipped: 1,
    });
  });

  it('handles all-null lookups (no Sourcify metadata at all)', () => {
    const lookups: DeployerLookup[] = [
      { contractAddress: C1, deployer: null },
      { contractAddress: C2, deployer: null },
    ];
    expect(crosswalkDeployers(PRIMARY, lookups)).toEqual({ count: 0, examined: 2, skipped: 2 });
  });

  it('handles all-match lookups', () => {
    const lookups: DeployerLookup[] = [
      { contractAddress: C1, deployer: PRIMARY },
      { contractAddress: C2, deployer: PRIMARY },
    ];
    expect(crosswalkDeployers(PRIMARY, lookups)).toEqual({ count: 2, examined: 2, skipped: 0 });
  });
});
