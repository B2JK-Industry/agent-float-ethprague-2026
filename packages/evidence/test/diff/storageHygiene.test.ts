import { describe, expect, it } from 'vitest';

import type { StorageLayout, StorageLayoutEntry } from '../../src/diff/storage.js';
import {
  classifyImplementationPair,
  classifySlot,
  computeProxyHygiene,
  computeSubjectHygiene,
} from '../../src/diff/storageHygiene.js';

const PROXY = '0x1111111111111111111111111111111111111111';
const IMPL_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const IMPL_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const IMPL_C = '0xcccccccccccccccccccccccccccccccccccccccc';

const TYPES = {
  t_uint256: { label: 'uint256', encoding: 'inplace', numberOfBytes: '32' },
  t_uint128: { label: 'uint128', encoding: 'inplace', numberOfBytes: '16' },
  t_address: { label: 'address', encoding: 'inplace', numberOfBytes: '20' },
};

function entry(slot: string, offset: number, type: string, label: string): StorageLayoutEntry {
  return { slot, offset, type, label };
}

const baseLayout: StorageLayout = {
  storage: [
    entry('0', 0, 't_uint256', 'totalSupply'),
    entry('1', 0, 't_address', 'owner'),
  ],
  types: TYPES,
};

const renamedLayout: StorageLayout = {
  storage: [
    entry('0', 0, 't_uint256', 'totalSupply'),
    entry('1', 0, 't_address', 'newOwnerName'), // renamed
  ],
  types: TYPES,
};

const collidedLayout: StorageLayout = {
  storage: [
    entry('0', 0, 't_uint256', 'totalSupply'),
    entry('1', 0, 't_uint128', 'owner'), // type changed at slot 1
  ],
  types: TYPES,
};

const appendedLayout: StorageLayout = {
  storage: [
    entry('0', 0, 't_uint256', 'totalSupply'),
    entry('1', 0, 't_address', 'owner'),
    entry('2', 0, 't_uint256', 'newField'),
  ],
  types: TYPES,
};

const removedLayout: StorageLayout = {
  storage: [entry('0', 0, 't_uint256', 'totalSupply')], // owner removed
  types: TYPES,
};

const reorderedLayout: StorageLayout = {
  storage: [
    entry('0', 0, 't_uint256', 'totalSupply'),
    entry('2', 0, 't_address', 'owner'), // moved slot
  ],
  types: TYPES,
};

describe('classifySlot', () => {
  it('returns safe when slot/offset/type/label all match', () => {
    const result = classifySlot(0, baseLayout.storage[0]!, baseLayout.storage[0]!, TYPES, TYPES);
    expect(result.classification).toBe('safe');
  });

  it('returns soft_rename when only the label differs', () => {
    const result = classifySlot(1, baseLayout.storage[1]!, renamedLayout.storage[1]!, TYPES, TYPES);
    expect(result.classification).toBe('soft_rename');
    expect(result.note).toContain('renamed');
  });

  it('returns collision when type differs at same slot', () => {
    const result = classifySlot(1, baseLayout.storage[1]!, collidedLayout.storage[1]!, TYPES, TYPES);
    expect(result.classification).toBe('collision');
    expect(result.note).toContain('type changed');
  });

  it('returns collision when slot location moves', () => {
    const result = classifySlot(1, baseLayout.storage[1]!, reorderedLayout.storage[1]!, TYPES, TYPES);
    expect(result.classification).toBe('collision');
    expect(result.note).toContain('slot/offset moved');
  });

  it('returns safe_append when previous is null and current is set', () => {
    const result = classifySlot(2, null, appendedLayout.storage[2]!, undefined, TYPES);
    expect(result.classification).toBe('safe_append');
  });

  it('returns removed when previous is set and current is null', () => {
    const result = classifySlot(1, baseLayout.storage[1]!, null, TYPES, undefined);
    expect(result.classification).toBe('removed');
  });

  it('returns unknown when both sides are null (defensive)', () => {
    const result = classifySlot(0, null, null, undefined, undefined);
    expect(result.classification).toBe('unknown');
  });
});

describe('classifyImplementationPair', () => {
  it('returns kind=computed + score 1.0 for byte-identical layouts', () => {
    const pair = classifyImplementationPair(IMPL_A, IMPL_B, baseLayout, baseLayout);
    expect(pair.kind).toBe('computed');
    expect(pair.score).toBe(1.0);
    expect(pair.slots.every((s) => s.classification === 'safe')).toBe(true);
  });

  it('returns kind=computed + score 0.75 for one rename out of two slots', () => {
    // 1 SAFE + 1 SOFT = (1.0 + 0.5) / 2 = 0.75
    const pair = classifyImplementationPair(IMPL_A, IMPL_B, baseLayout, renamedLayout);
    expect(pair.kind).toBe('computed');
    expect(pair.score).toBeCloseTo(0.75, 6);
  });

  it('returns kind=computed + score 0.5 for one collision out of two slots', () => {
    // 1 SAFE + 1 COLLISION = (1.0 + 0.0) / 2 = 0.5
    const pair = classifyImplementationPair(IMPL_A, IMPL_B, baseLayout, collidedLayout);
    expect(pair.kind).toBe('computed');
    expect(pair.score).toBe(0.5);
  });

  it('returns score 1.0 for a clean append (SAFE + SAFE + SAFE_APPEND)', () => {
    const pair = classifyImplementationPair(IMPL_A, IMPL_B, baseLayout, appendedLayout);
    expect(pair.kind).toBe('computed');
    expect(pair.score).toBe(1.0);
    expect(pair.slots.find((s) => s.classification === 'safe_append')).toBeDefined();
  });

  it('penalises removal (1 SAFE + 1 REMOVED = 0.5)', () => {
    const pair = classifyImplementationPair(IMPL_A, IMPL_B, baseLayout, removedLayout);
    expect(pair.kind).toBe('computed');
    expect(pair.score).toBe(0.5);
  });

  it('returns kind=unknown_layout + score null when previous layout is missing', () => {
    const pair = classifyImplementationPair(IMPL_A, IMPL_B, null, baseLayout);
    expect(pair.kind).toBe('unknown_layout');
    expect(pair.score).toBeNull();
    expect(pair.slots).toEqual([]);
  });

  it('returns kind=unknown_layout + score null when current layout is missing', () => {
    const pair = classifyImplementationPair(IMPL_A, IMPL_B, baseLayout, null);
    expect(pair.kind).toBe('unknown_layout');
    expect(pair.score).toBeNull();
  });

  it('falls back to literal type-string equality when types maps are absent', () => {
    // Without types: same type string at same slot → SAFE.
    const previous: StorageLayout = { storage: [entry('0', 0, 't_uint256', 'a')] };
    const current: StorageLayout = { storage: [entry('0', 0, 't_uint256', 'a')] };
    const pair = classifyImplementationPair(IMPL_A, IMPL_B, previous, current);
    expect(pair.score).toBe(1.0);
  });

  it('falls back to literal type-string mismatch as collision when types maps are absent', () => {
    const previous: StorageLayout = { storage: [entry('0', 0, 't_uint256', 'a')] };
    const current: StorageLayout = { storage: [entry('0', 0, 't_uint128', 'a')] };
    const pair = classifyImplementationPair(IMPL_A, IMPL_B, previous, current);
    expect(pair.score).toBe(0.0);
  });
});

describe('computeProxyHygiene', () => {
  it('returns score=1.0 for a proxy with zero implementations', () => {
    const result = computeProxyHygiene(PROXY, 1, [], 'EIP1967Proxy');
    expect(result.score).toBe(1.0);
    expect(result.pairs).toEqual([]);
    expect(result.proxyKind).toBe('EIP1967Proxy');
  });

  it('returns score=1.0 for a proxy with one implementation (no upgrades observed)', () => {
    const result = computeProxyHygiene(PROXY, 1, [{ address: IMPL_A, layout: baseLayout }]);
    expect(result.score).toBe(1.0);
    expect(result.pairs).toEqual([]);
  });

  it('returns avg of pair scores for two upgrades', () => {
    // V3 keeps the V2 rename so V2→V3 is purely an append.
    const v3FromV2: StorageLayout = {
      storage: [
        entry('0', 0, 't_uint256', 'totalSupply'),
        entry('1', 0, 't_address', 'newOwnerName'),
        entry('2', 0, 't_uint256', 'newField'),
      ],
      types: TYPES,
    };
    // Two pairs: V1→V2 (rename) score 0.75, V2→V3 (clean append) score 1.0.
    // Avg = (0.75 + 1.0) / 2 = 0.875.
    const result = computeProxyHygiene(PROXY, 1, [
      { address: IMPL_A, layout: baseLayout },
      { address: IMPL_B, layout: renamedLayout },
      { address: IMPL_C, layout: v3FromV2 },
    ]);
    expect(result.score).toBeCloseTo(0.875, 6);
    expect(result.pairs).toHaveLength(2);
  });

  it('excludes UNKNOWN pairs from the proxy average', () => {
    // V1→V2 unknown_layout (one side null), V2→V3 score 1.0
    const result = computeProxyHygiene(PROXY, 1, [
      { address: IMPL_A, layout: null },
      { address: IMPL_B, layout: baseLayout },
      { address: IMPL_C, layout: baseLayout },
    ]);
    expect(result.score).toBe(1.0);
    expect(result.pairs[0]?.kind).toBe('unknown_layout');
    expect(result.pairs[1]?.kind).toBe('computed');
  });

  it('returns null score when every pair is unknown_layout', () => {
    const result = computeProxyHygiene(PROXY, 1, [
      { address: IMPL_A, layout: null },
      { address: IMPL_B, layout: null },
    ]);
    expect(result.score).toBeNull();
  });
});

describe('computeSubjectHygiene', () => {
  it('returns score 1.0 across multiple no-upgrade proxies', () => {
    const a = computeProxyHygiene('0x1', 1, [{ address: IMPL_A, layout: baseLayout }]);
    const b = computeProxyHygiene('0x2', 1, []);
    const result = computeSubjectHygiene([a, b]);
    expect(result.score).toBe(1.0);
  });

  it('averages across proxy scores', () => {
    // proxy1 score 0.5 + proxy2 score 1.0 → 0.75
    const a = computeProxyHygiene('0x1', 1, [
      { address: IMPL_A, layout: baseLayout },
      { address: IMPL_B, layout: collidedLayout },
    ]);
    const b = computeProxyHygiene('0x2', 1, []);
    const result = computeSubjectHygiene([a, b]);
    expect(a.score).toBe(0.5);
    expect(b.score).toBe(1.0);
    expect(result.score).toBe(0.75);
  });

  it('excludes proxies with null score from the subject average', () => {
    const known = computeProxyHygiene('0x1', 1, [
      { address: IMPL_A, layout: baseLayout },
      { address: IMPL_B, layout: collidedLayout },
    ]);
    const unknown = computeProxyHygiene('0x2', 1, [
      { address: IMPL_A, layout: null },
      { address: IMPL_B, layout: null },
    ]);
    const result = computeSubjectHygiene([known, unknown]);
    expect(result.score).toBe(0.5);
  });

  it('returns null subject score when every proxy returned null', () => {
    const u1 = computeProxyHygiene('0x1', 1, [
      { address: IMPL_A, layout: null },
      { address: IMPL_B, layout: null },
    ]);
    const result = computeSubjectHygiene([u1]);
    expect(result.score).toBeNull();
  });

  it('returns null subject score for an empty proxy list', () => {
    const result = computeSubjectHygiene([]);
    expect(result.score).toBeNull();
  });
});
