// Verdict engine. Implements the SAFE / REVIEW / SIREN rule table from
// docs/02-product-architecture.md "Verdict Logic" and the absent-record
// rules from docs/04-technical-design.md "Authentication Of Offchain
// Reports". The engine is pure and deterministic: identical inputs always
// yield identical outputs. LLM-generated text is decoration on top, never
// the source of the verdict.

import type { Address } from '@upgrade-siren/shared';

import type { AbiRiskyDiff } from '../diff/abi.js';
import {
  qualifiesForV1DerivedReview,
  type BytecodeMatchResult,
} from '../diff/bytecodeMatch.js';
import type { StorageDiffResult } from '../diff/storage.js';
import type { SourcifyMatchLevel } from '../sourcify/types.js';
import type { UpgradeManifest } from '../manifest/types.js';
import type { VerifySignatureResult } from '../verify/signature.js';
import { classifyAbsentRecord } from './absentRecords.js';
import { FINDING_IDS, type Finding, makeFinding } from './findings.js';
import { applyManifestGracePolicy } from './gracePolicy.js';

// Compatibility alias for the canonical US-027 type. Earlier drafts of this
// engine declared a local structural mirror named StorageDiffResultLike;
// keeping the alias means downstream callers don't have to chase a rename.
export type StorageDiffResultLike = StorageDiffResult;

export type Verdict = 'SAFE' | 'REVIEW' | 'SIREN';
export type VerdictMode = 'signed-manifest' | 'public-read' | 'mock';
export type VerdictConfidence = 'operator-signed' | 'public-read' | 'mock';

export interface ComputeVerdictInput {
  readonly mode: VerdictMode;
  readonly mock: boolean;

  // ENS / manifest layer
  readonly manifestPresent: boolean;
  readonly manifestParseOk: boolean;
  readonly manifest: UpgradeManifest | null;
  readonly ownerPresent: boolean;
  readonly ownerAddress: Address | null;

  // Chain layer
  readonly liveImplementation: Address | null;

  // Sourcify layer
  readonly currentSourcifyMatch: SourcifyMatchLevel | null;
  readonly previousSourcifyMatch: SourcifyMatchLevel | null;

  // Diff layer
  readonly abiDiff: AbiRiskyDiff | null;
  readonly storageDiff: StorageDiffResult | null;

  // Authentication layer (signed-manifest only)
  readonly signatureVerification: VerifySignatureResult | null;

  // US-078: V1-anchored bytecode interpretation. Optional. When the
  // current implementation is unverified on Sourcify but matches a verified
  // V1 reference at >=0.9 with no risky selectors added, the engine
  // downgrades the verdict from SIREN to REVIEW with an explicit
  // "implementation hypothesis: V1-derived" finding. SAFE remains
  // unreachable on this path because there's no metadata trail proving
  // origin.
  readonly bytecodeMatch?: BytecodeMatchResult | null;
}

export interface ComputeVerdictResult {
  readonly verdict: Verdict;
  readonly findings: ReadonlyArray<Finding>;
  readonly summary: string;
  readonly mode: VerdictMode;
  readonly confidence: VerdictConfidence;
}

// Codex #53: grace-policy options threaded through the verdict path. When
// graceSeconds > 0 and the manifest's effectiveFrom is within the window,
// the slot-vs-manifest mismatch finding is downgraded from critical to
// warning so the aggregated verdict caps at REVIEW instead of SIREN.
// Default disabled (graceSeconds === undefined or 0) preserves the
// conservative SIREN behavior. See docs/07 mentor question 60.
export interface ComputeVerdictOptions {
  readonly graceSeconds?: number;
  readonly clock?: () => Date;
}

// Codex #52 (P2): if a caller sets mock: true while leaving mode='signed-manifest'
// (allowed by ComputeVerdictInput), the previous logic returned 'operator-signed'
// confidence — letting an unsigned/mock fixture be reported as trusted
// signed-manifest output. Mock flag now wins regardless of the mode label.
function confidenceFor(mode: VerdictMode, mock: boolean): VerdictConfidence {
  if (mock) return 'mock';
  if (mode === 'signed-manifest') return 'operator-signed';
  if (mode === 'public-read') return 'public-read';
  return 'mock';
}

// Aggregates a set of findings into a final verdict. Higher severity wins;
// public-read mode caps at REVIEW (never SAFE) per docs/02. Mock mode is
// handled by the caller via the confidence label; aggregation is identical
// to signed-manifest so the booth can render real verdict shapes against
// fixture inputs.
function aggregateVerdict(findings: ReadonlyArray<Finding>, mode: VerdictMode): Verdict {
  const hasCritical = findings.some((f) => f.severity === 'critical');
  const hasWarning = findings.some((f) => f.severity === 'warning');

  if (hasCritical) return 'SIREN';
  if (mode === 'public-read') return 'REVIEW';
  if (hasWarning) return 'REVIEW';
  return 'SAFE';
}

function summarise(verdict: Verdict, findings: ReadonlyArray<Finding>, mode: VerdictMode): string {
  const top = findings.find((f) => f.severity === 'critical') ?? findings.find((f) => f.severity === 'warning');
  const lead = top?.title ?? 'No risk signals detected';
  const modeNote =
    mode === 'public-read'
      ? ' (public-read mode: confidence capped at REVIEW)'
      : mode === 'mock'
      ? ' (mock: true)'
      : '';
  return `${verdict}: ${lead}.${modeNote}`;
}

// Adds a finding for absent-record paths (US-020 output).
// Codex #53: when graceSeconds > 0 and the manifest's effectiveFrom is
// inside the window, the slot-vs-manifest mismatch is downgraded from
// critical to warning so the verdict aggregates to REVIEW instead of
// SIREN. Returns 'critical' (P0 conservative) when the option is absent
// or the window has elapsed.
function staleSeverityWithGrace(
  input: ComputeVerdictInput,
  options: ComputeVerdictOptions | undefined,
): 'critical' | 'warning' {
  if (!options || !options.graceSeconds || options.graceSeconds <= 0) return 'critical';
  const effectiveFrom = input.manifest?.effectiveFrom;
  if (!effectiveFrom) return 'critical';
  const decision = applyManifestGracePolicy(
    { effectiveFrom },
    {
      graceSeconds: options.graceSeconds,
      ...(options.clock !== undefined ? { clock: options.clock } : {}),
    },
  );
  return decision.verdict === 'REVIEW' ? 'warning' : 'critical';
}

function addAbsentRecordFinding(
  input: ComputeVerdictInput,
  findings: Finding[],
  options?: ComputeVerdictOptions,
): void {
  if (input.mode === 'mock') return;
  const absentRecordVerdict = classifyAbsentRecord({
    manifestPresent: input.manifestPresent,
    manifestParseOk: input.manifestParseOk,
    ownerPresent: input.ownerPresent,
    liveImplementation: input.liveImplementation,
    manifestCurrentImpl: input.manifest?.currentImpl ?? null,
    mode: input.mode === 'signed-manifest' ? 'signed-manifest' : 'public-read',
  });
  if (!absentRecordVerdict) return;
  switch (absentRecordVerdict.reason) {
    case 'manifest_absent_falling_back_public_read':
      findings.push(
        makeFinding(
          FINDING_IDS.MANIFEST_ABSENT,
          // public-read fallback caps at REVIEW; warning severity surfaces it
          // as a non-SAFE signal without escalating to SIREN.
          'warning',
          'upgrade-siren:upgrade_manifest record is absent; falling back to public-read',
          { mode: input.mode },
        ),
      );
      break;
    case 'malformed_manifest':
      findings.push(
        makeFinding(
          FINDING_IDS.MANIFEST_MALFORMED,
          input.mode === 'signed-manifest' ? 'critical' : 'warning',
          'upgrade-siren:upgrade_manifest is present but failed to parse against the v1 schema',
          { mode: input.mode },
        ),
      );
      break;
    case 'owner_absent_authority_unverifiable':
      findings.push(
        makeFinding(
          FINDING_IDS.OWNER_ABSENT,
          'critical',
          'upgrade-siren:owner is absent in signed-manifest mode; report authority cannot be verified',
          {},
        ),
      );
      break;
    case 'manifest_stale_or_unexpected_upgrade': {
      const severity = staleSeverityWithGrace(input, options);
      findings.push(
        makeFinding(
          FINDING_IDS.MANIFEST_STALE_OR_UNEXPECTED_UPGRADE,
          severity,
          severity === 'warning'
            ? 'live proxy implementation disagrees with manifest currentImpl, but manifest.effectiveFrom is within the configured grace window (REVIEW)'
            : 'live proxy implementation disagrees with the manifest currentImpl',
          {
            liveImplementation: input.liveImplementation,
            manifestCurrentImpl: input.manifest?.currentImpl ?? null,
            graceApplied: severity === 'warning',
          },
        ),
      );
      break;
    }
  }
}

function addSignatureFinding(input: ComputeVerdictInput, findings: Finding[]): void {
  if (input.mode !== 'signed-manifest') return;
  if (input.mock) return;
  const v = input.signatureVerification;
  if (!v) {
    findings.push(
      makeFinding(
        FINDING_IDS.SIGNATURE_MISSING,
        'critical',
        'production report has no signature verification result; treating as unsigned',
        {},
      ),
    );
    return;
  }
  if (v.valid) {
    findings.push(
      makeFinding(FINDING_IDS.SIGNATURE_VALID, 'info', 'report signature recovered to upgrade-siren:owner', {
        recovered: v.recovered,
      }),
    );
    return;
  }
  switch (v.reason) {
    case 'missing_signature':
      findings.push(
        makeFinding(
          FINDING_IDS.SIGNATURE_MISSING,
          'critical',
          'production report has no EIP-712 signature',
          {},
        ),
      );
      break;
    case 'owner_mismatch':
      findings.push(
        makeFinding(
          FINDING_IDS.SIGNATURE_OWNER_MISMATCH,
          'critical',
          'report signature recovered to an address other than upgrade-siren:owner',
          {
            recovered: v.recovered ?? null,
            expectedOwner: input.ownerAddress,
          },
        ),
      );
      break;
    case 'malformed_signature':
    case 'unsupported_signature_type':
    default:
      findings.push(
        makeFinding(
          FINDING_IDS.SIGNATURE_INVALID,
          'critical',
          'report signature is malformed or uses an unsupported scheme',
          { reason: v.reason },
        ),
      );
      break;
  }
}

function addSourcifyFindings(input: ComputeVerdictInput, findings: Finding[]): void {
  const current = input.currentSourcifyMatch;
  if (current === null) {
    // Sourcify fetch failed (network / rate-limit / 5xx). docs/04 + docs/02
    // GATE-13: missing data must lower confidence, never produce false SAFE.
    findings.push(
      makeFinding(
        FINDING_IDS.VERIFICATION_CURRENT_UNVERIFIED,
        'warning',
        'Sourcify status for current implementation is unavailable',
        { match: null },
      ),
    );
  } else if (current === 'not_found') {
    // US-078: V1-anchored hypothesis. If we have a bytecode-match result
    // showing the unverified current is byte-equivalent to a verified V1
    // (>=0.9 confidence, no risky selectors added), downgrade the verdict
    // path from critical SIREN to warning REVIEW. SAFE stays unreachable
    // because there's no metadata trail.
    const m = input.bytecodeMatch;
    const hasRiskyAddedFromAbi = input.abiDiff?.addedAny ?? false;
    if (m && qualifiesForV1DerivedReview(m, hasRiskyAddedFromAbi)) {
      findings.push(
        makeFinding(
          FINDING_IDS.IMPLEMENTATION_HYPOTHESIS_V1_DERIVED,
          'warning',
          `implementation hypothesis: V1-derived (bytecode match ${(m.confidence * 100).toFixed(1)}%, no risky selectors added). REVIEW — no metadata trail proves origin.`,
          {
            confidence: m.confidence,
            hypothesis: m.hypothesis,
            matchedSelectors: m.matchedSelectors,
            unmatchedSelectors: m.unmatchedSelectors,
            storageLayoutMarkers: m.storageLayoutMarkers,
            rationale: m.rationale,
          },
        ),
      );
    } else {
      findings.push(
        makeFinding(
          FINDING_IDS.VERIFICATION_CURRENT_UNVERIFIED,
          'critical',
          'current implementation is not verified on Sourcify',
          {
            match: current,
            ...(m
              ? {
                  bytecodeMatchConfidence: m.confidence,
                  bytecodeMatchHypothesis: m.hypothesis,
                  riskySelectorsInUnmatched: m.riskySelectorsInUnmatched,
                }
              : {}),
          },
        ),
      );
    }
  } else if (current === 'exact_match' || current === 'match') {
    findings.push(
      makeFinding(
        FINDING_IDS.VERIFICATION_CURRENT,
        'info',
        `current implementation verified on Sourcify (${current})`,
        { match: current },
      ),
    );
  }
  if (input.previousSourcifyMatch === 'not_found') {
    findings.push(
      makeFinding(
        FINDING_IDS.VERIFICATION_PREVIOUS_UNVERIFIED,
        'warning',
        'previous implementation is not verified on Sourcify',
        { match: input.previousSourcifyMatch },
      ),
    );
  }
}

function addAbiFindings(input: ComputeVerdictInput, findings: Finding[]): void {
  const diff = input.abiDiff;
  if (!diff) return;
  for (const m of diff.added) {
    findings.push(
      makeFinding(
        FINDING_IDS.ABI_RISKY_SELECTOR_ADDED,
        // Adding a risky selector is critical: a new privileged path appeared
        // in the upgrade. docs/04 "ABI Risk" section.
        'critical',
        `risky selector "${m.name}" added to current implementation`,
        { selector: m.selector, name: m.name, inputs: m.inputs },
      ),
    );
  }
  for (const m of diff.removed) {
    findings.push(
      makeFinding(
        FINDING_IDS.ABI_RISKY_SELECTOR_REMOVED,
        // Removing a safety selector (e.g. pause) is a warning, not critical:
        // the upgrade weakened a safety lever but did not introduce a new one.
        'warning',
        `safety-related selector "${m.name}" removed in current implementation`,
        { selector: m.selector, name: m.name },
      ),
    );
  }
}

function addStorageFindings(input: ComputeVerdictInput, findings: Finding[]): void {
  const d = input.storageDiff;
  if (!d) return;
  switch (d.kind) {
    case 'incompatible_changed_type':
      findings.push(
        makeFinding(
          FINDING_IDS.STORAGE_INCOMPATIBLE_CHANGED_TYPE,
          'critical',
          'storage layout: existing slot changed type',
          { changes: d.changes },
        ),
      );
      break;
    case 'incompatible_reordered':
      findings.push(
        makeFinding(
          FINDING_IDS.STORAGE_INCOMPATIBLE_REORDERED,
          'critical',
          'storage layout: variables reordered or removed',
          { changes: d.changes },
        ),
      );
      break;
    case 'incompatible_inserted_before_existing':
      findings.push(
        makeFinding(
          FINDING_IDS.STORAGE_INCOMPATIBLE_INSERTED_BEFORE_EXISTING,
          'critical',
          'storage layout: new variable inserted before existing variables',
          { changes: d.changes },
        ),
      );
      break;
    case 'unknown_missing_layout':
      // Per docs/04: missing layout cannot be SAFE; surface a warning so the
      // verdict caps at REVIEW unless another SIREN signal fires.
      findings.push(
        makeFinding(
          FINDING_IDS.STORAGE_LAYOUT_MISSING,
          'warning',
          'storage layout is unavailable for at least one implementation',
          {},
        ),
      );
      break;
    case 'compatible_appended_only':
      findings.push(
        makeFinding(
          FINDING_IDS.STORAGE_COMPATIBLE_APPENDED_ONLY,
          'info',
          'storage layout: append-only changes',
          {},
        ),
      );
      break;
  }
}

function addProxyFindings(
  input: ComputeVerdictInput,
  findings: Finding[],
  options?: ComputeVerdictOptions,
): void {
  if (input.liveImplementation !== null) return;

  // Live slot is zero. Two distinct cases:
  //
  // 1. signed-manifest mode + manifest declares a non-null currentImpl ->
  //    the manifest claims an active proxy but chain says zero. This is the
  //    docs/02 "Proxy slot disagrees with manifest current implementation"
  //    rule and must be SIREN. classifyAbsentRecord rule 4 only fires when
  //    BOTH sides are non-null, so this branch is the engine's own
  //    enforcement of the disagreement when one side is null. Grace policy
  //    (Codex #53) applies here too — same docs/02 path.
  // 2. public-read mode (or signed-manifest with manifest=null) -> the
  //    address probably isn't an EIP-1967 proxy. Warning is enough; the
  //    verdict caps at REVIEW unless another critical signal fires.
  if (input.mode === 'signed-manifest' && (input.manifest?.currentImpl ?? null) !== null) {
    const severity = staleSeverityWithGrace(input, options);
    findings.push(
      makeFinding(
        FINDING_IDS.MANIFEST_STALE_OR_UNEXPECTED_UPGRADE,
        severity,
        severity === 'warning'
          ? 'live EIP-1967 slot is zero but manifest declares a non-null currentImpl, within the configured grace window (REVIEW)'
          : 'live EIP-1967 implementation slot is zero but manifest declares a non-null currentImpl',
        {
          liveImplementation: null,
          manifestCurrentImpl: input.manifest?.currentImpl ?? null,
          graceApplied: severity === 'warning',
        },
      ),
    );
    return;
  }

  findings.push(
    makeFinding(
      FINDING_IDS.PROXY_NOT_INITIALISED,
      'warning',
      'live EIP-1967 implementation slot is zero (proxy not initialised or not a proxy)',
      {},
    ),
  );
}

function addModeFinding(input: ComputeVerdictInput, findings: Finding[]): void {
  if (input.mode === 'public-read') {
    findings.push(
      makeFinding(
        FINDING_IDS.PUBLIC_READ_MODE,
        'info',
        'public-read mode (no signed manifest); confidence capped at REVIEW',
        {},
      ),
    );
  } else if (input.mode === 'mock' || input.mock) {
    findings.push(
      makeFinding(FINDING_IDS.MOCK_MODE, 'info', 'mock: true; demo evidence path', {}),
    );
  }
}

export function computeVerdict(
  input: ComputeVerdictInput,
  options?: ComputeVerdictOptions,
): ComputeVerdictResult {
  const findings: Finding[] = [];

  addModeFinding(input, findings);
  addAbsentRecordFinding(input, findings, options);
  addSignatureFinding(input, findings);
  addProxyFindings(input, findings, options);
  addSourcifyFindings(input, findings);
  addAbiFindings(input, findings);
  addStorageFindings(input, findings);

  const verdict = aggregateVerdict(findings, input.mode);
  const summary = summarise(verdict, findings, input.mode);
  return {
    verdict,
    findings,
    summary,
    mode: input.mode,
    confidence: confidenceFor(input.mode, input.mock),
  };
}
