import { describe, expect, it } from 'vitest';

import {
  diffStorageLayout,
  type StorageLayout,
} from '../../src/diff/storage.js';

const v1: StorageLayout = {
  storage: [
    { slot: '0', offset: 0, type: 't_uint256', label: 'totalAssets', contract: 'Vault' },
    { slot: '1', offset: 0, type: 't_address', label: 'admin' },
  ],
};

const v2Safe: StorageLayout = {
  storage: [
    { slot: '0', offset: 0, type: 't_uint256', label: 'totalAssets', contract: 'Vault' },
    { slot: '1', offset: 0, type: 't_address', label: 'admin' },
    { slot: '2', offset: 0, type: 't_uint256', label: 'totalShares' },
  ],
};

const v2DangerousChangedType: StorageLayout = {
  storage: [
    { slot: '0', offset: 0, type: 't_uint128', label: 'totalAssets', contract: 'Vault' },
    { slot: '1', offset: 0, type: 't_address', label: 'admin' },
  ],
};

const v2DangerousInsertedBefore: StorageLayout = {
  storage: [
    { slot: '0', offset: 0, type: 't_address', label: 'evilHook' },
    { slot: '1', offset: 0, type: 't_uint256', label: 'totalAssets', contract: 'Vault' },
    { slot: '2', offset: 0, type: 't_address', label: 'admin' },
  ],
};

const v2Reordered: StorageLayout = {
  storage: [
    { slot: '0', offset: 0, type: 't_address', label: 'admin' },
    { slot: '1', offset: 0, type: 't_uint256', label: 'totalAssets', contract: 'Vault' },
  ],
};

describe('diffStorageLayout', () => {
  it('returns unknown_missing_layout when previous is null', () => {
    const result = diffStorageLayout(null, v1);
    expect(result.kind).toBe('unknown_missing_layout');
    expect(result.changes).toEqual([]);
  });

  it('returns unknown_missing_layout when current is null', () => {
    const result = diffStorageLayout(v1, null);
    expect(result.kind).toBe('unknown_missing_layout');
  });

  it('returns unknown_missing_layout when both are null', () => {
    const result = diffStorageLayout(null, null);
    expect(result.kind).toBe('unknown_missing_layout');
  });

  it('V1 -> V2Safe (append totalShares) returns compatible_appended_only', () => {
    const result = diffStorageLayout(v1, v2Safe);
    expect(result.kind).toBe('compatible_appended_only');
    expect(result.appended.length).toBe(1);
    expect(result.appended[0]?.label).toBe('totalShares');
    expect(result.changes).toEqual([]);
  });

  it('V1 -> V2 with type change at slot 0 returns incompatible_changed_type', () => {
    const result = diffStorageLayout(v1, v2DangerousChangedType);
    expect(result.kind).toBe('incompatible_changed_type');
    expect(result.changes[0]?.note).toContain('totalAssets');
    expect(result.changes[0]?.note).toContain('t_uint256 -> t_uint128');
  });

  it('V1 -> V2 inserting before existing returns incompatible_inserted_before_existing', () => {
    const result = diffStorageLayout(v1, v2DangerousInsertedBefore);
    expect(result.kind).toBe('incompatible_inserted_before_existing');
    expect(result.changes[0]?.note).toContain('evilHook');
    expect(result.changes[0]?.note).toContain('totalAssets');
  });

  it('V1 -> V2 with slots reordered returns incompatible_reordered', () => {
    const result = diffStorageLayout(v1, v2Reordered);
    expect(result.kind).toBe('incompatible_reordered');
  });

  it('V1 -> V1 (identical) returns compatible_appended_only with no appended entries', () => {
    const result = diffStorageLayout(v1, v1);
    expect(result.kind).toBe('compatible_appended_only');
    expect(result.appended).toEqual([]);
    expect(result.changes).toEqual([]);
  });

  it('V2Safe -> V1 (variable removed) returns incompatible_reordered', () => {
    const result = diffStorageLayout(v2Safe, v1);
    expect(result.kind).toBe('incompatible_reordered');
    expect(result.changes[0]?.note).toContain('totalShares');
    expect(result.changes[0]?.note).toContain('removed');
  });

  it('returns compatible_appended_only when both layouts are empty', () => {
    const empty: StorageLayout = { storage: [] };
    const result = diffStorageLayout(empty, empty);
    expect(result.kind).toBe('compatible_appended_only');
  });

  it('returns compatible_appended_only when previous is empty and current has entries', () => {
    const empty: StorageLayout = { storage: [] };
    const result = diffStorageLayout(empty, v1);
    expect(result.kind).toBe('compatible_appended_only');
    expect(result.appended.length).toBe(2);
  });

  it('returns incompatible_inserted_before_existing when an appended entry sits in an earlier slot than the previous tail', () => {
    const prev: StorageLayout = {
      storage: [
        { slot: '5', offset: 0, type: 't_uint256', label: 'a' },
        { slot: '6', offset: 0, type: 't_uint256', label: 'b' },
      ],
    };
    const curr: StorageLayout = {
      storage: [
        { slot: '5', offset: 0, type: 't_uint256', label: 'a' },
        { slot: '6', offset: 0, type: 't_uint256', label: 'b' },
        { slot: '3', offset: 0, type: 't_uint256', label: 'c' }, // suspicious: slot 3 < 6
      ],
    };
    const result = diffStorageLayout(prev, curr);
    expect(result.kind).toBe('incompatible_inserted_before_existing');
  });
});
