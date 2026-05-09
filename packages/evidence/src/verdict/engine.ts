// Verdict engine. Implements the SAFE / REVIEW / SIREN rule table from
// docs/02-product-architecture.md "Verdict Logic" and the absent-record
// rules from docs/04-technical-design.md "Authentication Of Offchain
// Reports". The engine is pure and deterministic: identical inputs always
// yield identical outputs. LLM-generated text is decoration on top, never
// the source of the verdict.

import type { Address } from '@upgrade-siren/shared';

import type { AbiRiskyDiff } from '../diff/abi.js';
import type { StorageDiffResult } from '../diff/storage.js';
import type { SourcifyMatchLevel } from '../sourcify/types.js';
import type { UpgradeManifest } from '../manifest/types.js';
import type { VerifySignatureResult } from '../verify/signature.js';
import { classifyAbsentRecord } from './absentRecords.js';
import { FINDING_IDS, type Finding, makeFinding } from './findings.js';

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
}

export interface ComputeVerdictResult {
  readonly verdict: Verdict;
  readonly findings: ReadonlyArray<Finding>;
  readonly summary: string;
  readonly mode: VerdictMode;
  readonly confidence: VerdictConfidence;
}

function confidenceFor(mode: VerdictMode): VerdictConfidence {
  if (mode === 'signed-manifest') return 'operator-signed';
  if (mode === 'public-read') return 'public-read';
  return 'mock';
}

// Aggregates a set of findings into a final verdict. Higher severity wins;
// public-read mode caps at REVIEW (never SAFE) per docs/02.
function aggregateVerdict(findings: ReadonlyArray<Finding>, mode: VerdictMode, mock: boolean): Verdict {
  if (mock) {
    // Mock mode reflects the worst severity but doesn't claim production trust.
    // Engine still returns the structural verdict so the UI can render it.
  }

  const hasCritical = findings.some((f) => f.severity === 'critical');
  const hasWarning = findings.some((f) => f.severity === 'warning');

  if (hasCritical) return 'SIREN';
  if (mode === 'public-read') {
    // Per docs/02: public-read mode is never SAFE. Even with no warnings, REVIEW.
    return hasWarning ? 'REVIEW' : 'REVIEW';
  }
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
function addAbsentRecordFinding(input: ComputeVerdictInput, findings: Finding[]): void {
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
    case 'manifest_stale_or_unexpected_upgrade':
      findings.push(
        makeFinding(
          FINDING_IDS.MANIFEST_STALE_OR_UNEXPECTED_UPGRADE,
          'critical',
          'live proxy implementation disagrees with the manifest currentImpl',
          {
            liveImplementation: input.liveImplementation,
            manifestCurrentImpl: input.manifest?.currentImpl ?? null,
          },
        ),
      );
      break;
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
  if (current === 'not_found') {
    findings.push(
      makeFinding(
        FINDING_IDS.VERIFICATION_CURRENT_UNVERIFIED,
        'critical',
        'current implementation is not verified on Sourcify',
        { match: current },
      ),
    );
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

function addProxyFindings(input: ComputeVerdictInput, findings: Finding[]): void {
  if (input.liveImplementation === null) {
    findings.push(
      makeFinding(
        FINDING_IDS.PROXY_NOT_INITIALISED,
        // The address probably isn't an EIP-1967 proxy at all. Surface as
        // warning so the verdict caps at REVIEW; further critical signals
        // can still escalate to SIREN.
        'warning',
        'live EIP-1967 implementation slot is zero (proxy not initialised or not a proxy)',
        {},
      ),
    );
  }
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

export function computeVerdict(input: ComputeVerdictInput): ComputeVerdictResult {
  const findings: Finding[] = [];

  addModeFinding(input, findings);
  addAbsentRecordFinding(input, findings);
  addSignatureFinding(input, findings);
  addProxyFindings(input, findings);
  addSourcifyFindings(input, findings);
  addAbiFindings(input, findings);
  addStorageFindings(input, findings);

  const verdict = aggregateVerdict(findings, input.mode, input.mock);
  const summary = summarise(verdict, findings, input.mode);
  return {
    verdict,
    findings,
    summary,
    mode: input.mode,
    confidence: confidenceFor(input.mode),
  };
}
