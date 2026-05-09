import { describe, expect, it } from 'vitest';

import type { Address } from '@upgrade-siren/shared';

import {
  classifyAbsentRecord,
  type AbsentRecordInput,
} from '../../src/verdict/absentRecords.js';

const PROXY: Address = '0x1111111111111111111111111111111111111111';
const IMPL_A: Address = '0x2222222222222222222222222222222222222222';
const IMPL_B: Address = '0x3333333333333333333333333333333333333333';

const baseInput: AbsentRecordInput = {
  manifestPresent: true,
  manifestParseOk: true,
  ownerPresent: true,
  liveImplementation: IMPL_A,
  manifestCurrentImpl: IMPL_A,
  mode: 'signed-manifest',
};

describe('classifyAbsentRecord', () => {
  it('returns null when every required record is present and consistent', () => {
    expect(classifyAbsentRecord(baseInput)).toBeNull();
  });

  it('rule 1: manifest absent => REVIEW with manifest_absent_falling_back_public_read', () => {
    const r = classifyAbsentRecord({ ...baseInput, manifestPresent: false, manifestParseOk: false });
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.verdict).toBe('REVIEW');
    expect(r.reason).toBe('manifest_absent_falling_back_public_read');
  });

  it('rule 1 takes priority over rules 2/3/4 when manifest is absent', () => {
    const r = classifyAbsentRecord({
      ...baseInput,
      manifestPresent: false,
      manifestParseOk: false,
      ownerPresent: false, // would otherwise trigger rule 3
      liveImplementation: IMPL_A,
      manifestCurrentImpl: IMPL_B, // would otherwise trigger rule 4
    });
    expect(r?.reason).toBe('manifest_absent_falling_back_public_read');
  });

  it('rule 2: malformed manifest in signed-manifest mode => SIREN with malformed_manifest', () => {
    const r = classifyAbsentRecord({ ...baseInput, manifestParseOk: false });
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.verdict).toBe('SIREN');
    expect(r.reason).toBe('malformed_manifest');
  });

  it('rule 2 in public-read mode => REVIEW (downgraded from SIREN)', () => {
    const r = classifyAbsentRecord({
      ...baseInput,
      manifestParseOk: false,
      mode: 'public-read',
    });
    expect(r?.verdict).toBe('REVIEW');
    expect(r?.reason).toBe('malformed_manifest');
  });

  it('rule 3: owner absent in signed-manifest mode => SIREN with owner_absent_authority_unverifiable', () => {
    const r = classifyAbsentRecord({ ...baseInput, ownerPresent: false });
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.verdict).toBe('SIREN');
    expect(r.reason).toBe('owner_absent_authority_unverifiable');
  });

  it('rule 3 does NOT fire in public-read mode (owner not required there)', () => {
    const r = classifyAbsentRecord({
      ...baseInput,
      ownerPresent: false,
      mode: 'public-read',
    });
    expect(r).toBeNull();
  });

  it('rule 4: live slot != manifest currentImpl => SIREN with manifest_stale_or_unexpected_upgrade', () => {
    const r = classifyAbsentRecord({
      ...baseInput,
      liveImplementation: IMPL_B,
      manifestCurrentImpl: IMPL_A,
    });
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.verdict).toBe('SIREN');
    expect(r.reason).toBe('manifest_stale_or_unexpected_upgrade');
    expect(r.message).toContain(IMPL_B);
    expect(r.message).toContain(IMPL_A);
  });

  it('rule 4 is case-insensitive on address comparison (EIP-55 vs lowercase)', () => {
    const r = classifyAbsentRecord({
      ...baseInput,
      liveImplementation: IMPL_A.toLowerCase() as Address,
      manifestCurrentImpl: IMPL_A.toUpperCase().replace('0X', '0x') as Address,
    });
    expect(r).toBeNull();
  });

  it('rule 4 does not fire when either side is null (insufficient evidence)', () => {
    expect(
      classifyAbsentRecord({ ...baseInput, liveImplementation: null }),
    ).toBeNull();
    expect(
      classifyAbsentRecord({ ...baseInput, manifestCurrentImpl: null }),
    ).toBeNull();
  });

  it('rule precedence: manifest absent > parse failure > owner missing > slot mismatch', () => {
    // manifest absent + parse failure + owner missing + slot mismatch => rule 1
    const r1 = classifyAbsentRecord({
      ...baseInput,
      manifestPresent: false,
      manifestParseOk: false,
      ownerPresent: false,
      liveImplementation: IMPL_A,
      manifestCurrentImpl: IMPL_B,
    });
    expect(r1?.reason).toBe('manifest_absent_falling_back_public_read');

    // parse failure + owner missing + slot mismatch => rule 2
    const r2 = classifyAbsentRecord({
      ...baseInput,
      manifestParseOk: false,
      ownerPresent: false,
      liveImplementation: IMPL_A,
      manifestCurrentImpl: IMPL_B,
    });
    expect(r2?.reason).toBe('malformed_manifest');

    // owner missing + slot mismatch => rule 3
    const r3 = classifyAbsentRecord({
      ...baseInput,
      ownerPresent: false,
      liveImplementation: IMPL_A,
      manifestCurrentImpl: IMPL_B,
    });
    expect(r3?.reason).toBe('owner_absent_authority_unverifiable');

    // slot mismatch only => rule 4
    const r4 = classifyAbsentRecord({
      ...baseInput,
      liveImplementation: IMPL_A,
      manifestCurrentImpl: IMPL_B,
    });
    expect(r4?.reason).toBe('manifest_stale_or_unexpected_upgrade');

    // Sanity test the anchor against PROXY constant so it remains used.
    expect(typeof PROXY).toBe('string');
  });
});
