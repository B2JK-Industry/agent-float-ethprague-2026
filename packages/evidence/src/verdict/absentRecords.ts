// Explicit verdict-condition table for absent and malformed ENS records,
// per docs/02-product-architecture.md "Verdict Logic" and US-020 AC.
// The verdict engine (US-029) consumes the AbsentRecordVerdictReason values
// and folds them into the final SAFE/REVIEW/SIREN result. This module
// owns the rule table; the engine owns the orchestration.

import type { Address } from '@upgrade-siren/shared';

export type AbsentRecordMode = 'signed-manifest' | 'public-read';

export type AbsentRecordVerdictReason =
  | 'manifest_absent_falling_back_public_read'
  | 'owner_absent_authority_unverifiable'
  | 'malformed_manifest'
  | 'manifest_stale_or_unexpected_upgrade';

export interface AbsentRecordVerdict {
  readonly verdict: 'REVIEW' | 'SIREN';
  readonly reason: AbsentRecordVerdictReason;
  readonly message: string;
  readonly mode: AbsentRecordMode;
}

export interface AbsentRecordInput {
  // True when ENS resolved an upgrade-siren:upgrade_manifest text record.
  readonly manifestPresent: boolean;
  // True when the manifest record parsed successfully via US-018.
  // If manifestPresent is false, manifestParseOk is irrelevant (set false).
  readonly manifestParseOk: boolean;
  // True when ENS resolved an upgrade-siren:owner text record.
  readonly ownerPresent: boolean;
  // The current implementation address recovered from the live EIP-1967 slot
  // (US-022). null when slot is zero.
  readonly liveImplementation: Address | null;
  // The currentImpl declared by the parsed manifest, or null when no parsed
  // manifest is available.
  readonly manifestCurrentImpl: Address | null;
  // Whether the caller is operating in signed-manifest mode (i.e. some
  // upgrade-siren:* records were present and the report path is being taken)
  // or already in public-read mode.
  readonly mode: AbsentRecordMode;
}

function addressesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

// Returns the absent-record verdict if any of the four rules in the table
// applies; otherwise null (callers continue to evaluate other signals).
export function classifyAbsentRecord(input: AbsentRecordInput): AbsentRecordVerdict | null {
  // Rule 1: manifest absent in signed-manifest path.
  // Per docs/04-technical-design.md "Authentication Of Offchain Reports", the
  // user falls back to public-read mode and verdict is REVIEW unless another
  // SIREN rule fires. The fallback decision lives here so the engine has a
  // single source of truth.
  if (!input.manifestPresent) {
    return {
      verdict: 'REVIEW',
      reason: 'manifest_absent_falling_back_public_read',
      message:
        'upgrade-siren:upgrade_manifest is absent; falling back to public-read mode (lower confidence, never SAFE)',
      mode: input.mode,
    };
  }

  // Rule 2: manifest present but unparseable.
  // Treat as SIREN if the caller is in signed-manifest mode (we cannot trust
  // a malformed manifest); REVIEW if the caller is already in public-read.
  // Per docs/04 the canonical answer is SIREN/REVIEW depending on mode; the
  // engine maps SIREN here when signed-manifest mode is active.
  if (!input.manifestParseOk) {
    return {
      verdict: input.mode === 'signed-manifest' ? 'SIREN' : 'REVIEW',
      reason: 'malformed_manifest',
      message:
        'upgrade-siren:upgrade_manifest is present but failed to parse against the v1 schema',
      mode: input.mode,
    };
  }

  // Rule 3: owner absent in signed-manifest path.
  // Per docs/04, owner absent means report authority cannot be verified, so
  // the verdict is SIREN regardless of any other evidence.
  if (input.mode === 'signed-manifest' && !input.ownerPresent) {
    return {
      verdict: 'SIREN',
      reason: 'owner_absent_authority_unverifiable',
      message:
        'upgrade-siren:owner is absent in signed-manifest mode; report authority cannot be verified',
      mode: input.mode,
    };
  }

  // Rule 4: live proxy slot disagrees with manifest currentImpl.
  // Per docs/04, this is a P0-conservative SIREN with reason
  // 'manifest stale or unexpected upgrade'. P1 may add a grace policy
  // (US-036) but this rule fires unconditionally at P0.
  if (
    input.manifestCurrentImpl !== null &&
    input.liveImplementation !== null &&
    !addressesEqual(input.liveImplementation, input.manifestCurrentImpl)
  ) {
    return {
      verdict: 'SIREN',
      reason: 'manifest_stale_or_unexpected_upgrade',
      message: `live proxy implementation ${input.liveImplementation} disagrees with manifest currentImpl ${input.manifestCurrentImpl}`,
      mode: input.mode,
    };
  }

  return null;
}
