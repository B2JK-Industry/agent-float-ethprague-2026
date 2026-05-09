import type { Abi } from 'viem';
import { describe, expect, it } from 'vitest';

import {
  RISKY_SELECTOR_NAMES,
  diffAbiRiskySelectors,
  isRiskySelectorName,
} from '../../src/diff/abi.js';

const v1: Abi = [
  {
    type: 'function',
    name: 'totalAssets',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'deposit',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'pause',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
];

const v2Safe: Abi = [
  ...v1,
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
];

const v2Dangerous: Abi = [
  ...v1,
  {
    type: 'function',
    name: 'sweep',
    inputs: [{ name: 'to', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setOwner',
    inputs: [{ name: 'newOwner', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
];

describe('RISKY_SELECTOR_NAMES', () => {
  it('exports the canonical risky selector list per docs/04', () => {
    expect(RISKY_SELECTOR_NAMES).toEqual([
      'sweep',
      'withdraw',
      'setOwner',
      'setAdmin',
      'transferOwnership',
      'mint',
      'pause',
      'unpause',
      'upgradeTo',
      'upgradeToAndCall',
      'call',
      'delegatecall',
    ]);
  });

  it('isRiskySelectorName matches the closed set, nothing else', () => {
    for (const name of RISKY_SELECTOR_NAMES) {
      expect(isRiskySelectorName(name)).toBe(true);
    }
    for (const name of ['deposit', 'totalAssets', 'transfer', 'unknownFn']) {
      expect(isRiskySelectorName(name)).toBe(false);
    }
  });
});

describe('diffAbiRiskySelectors', () => {
  it('V1 -> V2Safe: no risky selectors added or removed', () => {
    const diff = diffAbiRiskySelectors(v1, v2Safe);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.addedAny).toBe(false);
    expect(diff.removedAny).toBe(false);
  });

  it('V1 -> V2Dangerous: sweep and setOwner appear in added', () => {
    const diff = diffAbiRiskySelectors(v1, v2Dangerous);
    expect(diff.added.map((m) => m.name)).toEqual(['setOwner', 'sweep']);
    expect(diff.removed).toEqual([]);
    expect(diff.addedAny).toBe(true);
    expect(diff.added[0]?.selector).toMatch(/^0x[a-fA-F0-9]{8}$/);
    expect(diff.added[0]?.inputs).toEqual(['address']);
  });

  it('V2Dangerous -> V1: sweep and setOwner appear in removed', () => {
    const diff = diffAbiRiskySelectors(v2Dangerous, v1);
    expect(diff.added).toEqual([]);
    expect(diff.removed.map((m) => m.name)).toEqual(['setOwner', 'sweep']);
    expect(diff.removedAny).toBe(true);
  });

  it('handles a null previous ABI as if all selectors are added (initial deploy)', () => {
    const diff = diffAbiRiskySelectors(null, v2Dangerous);
    expect(diff.added.map((m) => m.name).sort()).toEqual(['pause', 'setOwner', 'sweep']);
  });

  it('handles a null current ABI as if all selectors are removed', () => {
    const diff = diffAbiRiskySelectors(v2Dangerous, null);
    expect(diff.removed.map((m) => m.name).sort()).toEqual(['pause', 'setOwner', 'sweep']);
  });

  it('treats both null as no diff (vacuously safe)', () => {
    const diff = diffAbiRiskySelectors(null, null);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it('ignores non-function ABI items (events, errors, constructors)', () => {
    const withEvents: Abi = [
      ...v2Safe,
      { type: 'event', name: 'Transfer', inputs: [{ name: 'to', type: 'address', indexed: true }], anonymous: false },
      { type: 'error', name: 'Forbidden', inputs: [] },
      { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
    ];
    const diff = diffAbiRiskySelectors(v1, withEvents);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it('non-risky selectors are ignored even when added or removed', () => {
    const v2NonRisky: Abi = [
      ...v1,
      {
        type: 'function',
        name: 'rebase',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable',
      },
    ];
    const diff = diffAbiRiskySelectors(v1, v2NonRisky);
    expect(diff.added).toEqual([]);
  });

  it('functions with same name but different signatures are tracked by selector, not name', () => {
    // sweep(address) and sweep(address,uint256) have different selectors.
    const a: Abi = [
      {
        type: 'function',
        name: 'sweep',
        inputs: [{ name: 'to', type: 'address' }],
        outputs: [],
        stateMutability: 'nonpayable',
      },
    ];
    const b: Abi = [
      {
        type: 'function',
        name: 'sweep',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
      },
    ];
    const diff = diffAbiRiskySelectors(a, b);
    // sweep(address,uint256) is "added" because its selector wasn't in v1
    expect(diff.added.length).toBe(1);
    expect(diff.added[0]?.inputs).toEqual(['address', 'uint256']);
    // sweep(address) is "removed" because its selector vanished
    expect(diff.removed.length).toBe(1);
    expect(diff.removed[0]?.inputs).toEqual(['address']);
  });
});
