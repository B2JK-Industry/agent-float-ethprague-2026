// Optional grace window for the slot-vs-manifest mismatch path.
//
// P0 default: SIREN whenever the live EIP-1967 slot disagrees with the
// manifest's currentImpl. That decision lives in classifyAbsentRecord
// (US-020 rule 4) and feeds the verdict engine (US-029).
//
// P1 enhancement (this module): if the manifest's effectiveFrom is within a
// configurable grace window in the past, downgrade the slot-mismatch verdict
// from SIREN to REVIEW with reason `manifest_update_in_flight`. This handles
// the legitimate case where a real upgrade has just occurred but the
// signed manifest record hasn't propagated yet.
//
// Disabled by default (0 seconds = P0 conservative behavior). Mentor
// feedback decides whether to enable in production. Per docs/07
// mentor-question 60.

export type ManifestGraceMode = 'disabled' | 'allow_within_window';

export const DEFAULT_GRACE_SECONDS = 0;

export interface ManifestGraceOptions {
  // Window in seconds. 0 (default) keeps the P0 conservative behavior:
  // every slot-vs-manifest mismatch is SIREN. >0 enables the grace policy
  // for the documented window.
  readonly graceSeconds?: number;
  readonly clock?: () => Date;
}

export type ManifestGraceDecision =
  | { readonly verdict: 'SIREN'; readonly reason: 'manifest_stale_or_unexpected_upgrade' }
  | { readonly verdict: 'REVIEW'; readonly reason: 'manifest_update_in_flight' };

export interface ManifestGraceInput {
  readonly effectiveFrom: string;
}

// Reads the env-var grace window. Falls back to 0 (disabled) if missing or
// not a finite non-negative number. Production callers wire this up at app
// boot once; tests pass options directly.
export function readGraceSecondsFromEnv(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env['MANIFEST_GRACE_SECONDS'];
  if (raw === undefined || raw === '') return DEFAULT_GRACE_SECONDS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_GRACE_SECONDS;
  return Math.floor(n);
}

// Returns the verdict to apply when the live slot != manifest currentImpl.
// SIREN by default; REVIEW only when the grace window is enabled AND the
// manifest's effectiveFrom is within the past `graceSeconds`.
export function applyManifestGracePolicy(
  input: ManifestGraceInput,
  options: ManifestGraceOptions = {},
): ManifestGraceDecision {
  const graceSeconds = options.graceSeconds ?? DEFAULT_GRACE_SECONDS;
  if (graceSeconds <= 0) {
    return { verdict: 'SIREN', reason: 'manifest_stale_or_unexpected_upgrade' };
  }

  const now = (options.clock ?? (() => new Date()))();
  const effective = new Date(input.effectiveFrom);
  if (Number.isNaN(effective.getTime())) {
    // Unparseable timestamp -> conservative SIREN.
    return { verdict: 'SIREN', reason: 'manifest_stale_or_unexpected_upgrade' };
  }

  const diffSeconds = (now.getTime() - effective.getTime()) / 1000;
  if (diffSeconds < 0) {
    // effectiveFrom is in the future -> conservative SIREN.
    return { verdict: 'SIREN', reason: 'manifest_stale_or_unexpected_upgrade' };
  }
  if (diffSeconds <= graceSeconds) {
    return { verdict: 'REVIEW', reason: 'manifest_update_in_flight' };
  }
  return { verdict: 'SIREN', reason: 'manifest_stale_or_unexpected_upgrade' };
}
