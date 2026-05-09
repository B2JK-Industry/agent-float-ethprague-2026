// Canonical finding identifiers used by the verdict engine.
// Stable IDs let the UI map findings to localized human strings without
// shipping copy in the engine itself. Severity is the engine's structural
// signal of importance, not a verdict (the aggregate verdict is computed
// from findings + mode). LLM-generated text is decoration on top of these
// structured findings, never the source of the verdict.

export const FINDING_IDS = {
  // Authentication path
  MANIFEST_ABSENT: 'MANIFEST_ABSENT',
  MANIFEST_MALFORMED: 'MANIFEST_MALFORMED',
  OWNER_ABSENT: 'OWNER_ABSENT',
  SIGNATURE_VALID: 'SIGNATURE_VALID',
  SIGNATURE_MISSING: 'SIGNATURE_MISSING',
  SIGNATURE_INVALID: 'SIGNATURE_INVALID',
  SIGNATURE_OWNER_MISMATCH: 'SIGNATURE_OWNER_MISMATCH',

  // Live-vs-manifest consistency
  MANIFEST_STALE_OR_UNEXPECTED_UPGRADE: 'MANIFEST_STALE_OR_UNEXPECTED_UPGRADE',
  PROXY_NOT_INITIALISED: 'PROXY_NOT_INITIALISED',

  // Sourcify verification
  VERIFICATION_CURRENT: 'VERIFICATION_CURRENT',
  VERIFICATION_CURRENT_UNVERIFIED: 'VERIFICATION_CURRENT_UNVERIFIED',
  VERIFICATION_PREVIOUS_UNVERIFIED: 'VERIFICATION_PREVIOUS_UNVERIFIED',

  // ABI risk
  ABI_RISKY_SELECTOR_ADDED: 'ABI_RISKY_SELECTOR_ADDED',
  ABI_RISKY_SELECTOR_REMOVED: 'ABI_RISKY_SELECTOR_REMOVED',

  // Storage-layout compatibility
  STORAGE_INCOMPATIBLE_CHANGED_TYPE: 'STORAGE_INCOMPATIBLE_CHANGED_TYPE',
  STORAGE_INCOMPATIBLE_REORDERED: 'STORAGE_INCOMPATIBLE_REORDERED',
  STORAGE_INCOMPATIBLE_INSERTED_BEFORE_EXISTING: 'STORAGE_INCOMPATIBLE_INSERTED_BEFORE_EXISTING',
  STORAGE_LAYOUT_MISSING: 'STORAGE_LAYOUT_MISSING',
  STORAGE_COMPATIBLE_APPENDED_ONLY: 'STORAGE_COMPATIBLE_APPENDED_ONLY',

  // Mode
  PUBLIC_READ_MODE: 'PUBLIC_READ_MODE',
  MOCK_MODE: 'MOCK_MODE',

  // V1-anchored bytecode interpretation (US-078). Supplants
  // VERIFICATION_CURRENT_UNVERIFIED's critical severity when the
  // unverified current bytecode is byte-equivalent to a verified V1.
  IMPLEMENTATION_HYPOTHESIS_V1_DERIVED: 'IMPLEMENTATION_HYPOTHESIS_V1_DERIVED',
} as const;

export type FindingId = (typeof FINDING_IDS)[keyof typeof FINDING_IDS];

export type FindingSeverity = 'info' | 'warning' | 'critical';

export interface Finding {
  readonly id: FindingId | string;
  readonly severity: FindingSeverity;
  readonly title: string;
  readonly evidence: Readonly<Record<string, unknown>>;
}

export function makeFinding(
  id: FindingId,
  severity: FindingSeverity,
  title: string,
  evidence: Record<string, unknown> = {},
): Finding {
  return { id, severity, title, evidence };
}
