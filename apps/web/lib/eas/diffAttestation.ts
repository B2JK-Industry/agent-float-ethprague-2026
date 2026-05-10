// Pure diff layer between a previous EAS attestation and the live Bench
// evidence + score the page just computed. Surfaces material changes
// that warrant attention (score regression, identity rotation, ENS
// record edits, Sourcify metadata drift) so the UI can mark the report
// "CHANGED" or "UNCHANGED" without inventing semantic meaning.

import type {
  MultiSourceEvidence,
  ScoreResult,
} from "@upgrade-siren/evidence";

import type { FetchedAttestationOk } from "./fetchAttestation";

export type DiffSeverity = "unchanged" | "info" | "warn" | "alert";

export interface DiffEntry {
  readonly field: string;
  readonly old: string | null;
  readonly current: string | null;
  readonly severity: DiffSeverity;
  readonly note?: string;
}

export interface AttestationDiff {
  // Aggregate verdict: any "alert" → alert; else any "warn" → warn;
  // else any "info" → info; else "unchanged".
  readonly overall: DiffSeverity;
  readonly entries: ReadonlyArray<DiffEntry>;
  readonly oldScore: number | null;
  readonly currentScore: number | null;
  readonly oldTier: string | null;
  readonly currentTier: string | null;
  readonly oldComputedAt: number | null;
  readonly currentComputedAt: number;
  readonly oldRecipient: string | null;
  readonly currentPrimaryAddress: string | null;
}

function rollupSeverity(entries: ReadonlyArray<DiffEntry>): DiffSeverity {
  let max: DiffSeverity = "unchanged";
  for (const e of entries) {
    if (e.severity === "alert") return "alert";
    if (e.severity === "warn") max = "warn";
    else if (e.severity === "info" && max === "unchanged") max = "info";
  }
  return max;
}

function tierRank(tier: string | null): number {
  // U treated as worst (-1) so dropping into U from anything is alert.
  switch (tier) {
    case "S": return 5;
    case "A": return 4;
    case "B": return 3;
    case "C": return 2;
    case "D": return 1;
    case "U": return 0;
    default: return -1;
  }
}

export interface DiffInput {
  readonly previous: FetchedAttestationOk;
  readonly currentEvidence: MultiSourceEvidence;
  readonly currentScore: ScoreResult | null;
  readonly nowSeconds?: number;
}

export function diffAttestationVsCurrent(input: DiffInput): AttestationDiff {
  const { previous, currentEvidence, currentScore } = input;
  const decoded = previous.decoded;
  const oldScore = decoded ? decoded.score : null;
  const oldTier = decoded ? decoded.tier : null;
  const oldRecipient = previous.recipient;
  const oldComputedAt = decoded ? decoded.computedAt : previous.timeCreated;

  const currentScore100 = currentScore?.score_100 ?? null;
  const currentTier = currentScore?.tier ?? null;
  const currentPrimary = currentEvidence.subject.primaryAddress;
  const nowSec = input.nowSeconds ?? Math.floor(Date.now() / 1000);

  const entries: DiffEntry[] = [];

  // ─── score ───
  if (oldScore !== null && currentScore100 !== null) {
    const delta = currentScore100 - oldScore;
    if (delta === 0) {
      entries.push({
        field: "score_100",
        old: String(oldScore),
        current: String(currentScore100),
        severity: "unchanged",
      });
    } else {
      const sev: DiffSeverity =
        Math.abs(delta) >= 15
          ? delta < 0
            ? "alert"
            : "warn"
          : Math.abs(delta) >= 5
            ? "warn"
            : "info";
      entries.push({
        field: "score_100",
        old: String(oldScore),
        current: String(currentScore100),
        severity: sev,
        note: delta > 0 ? `+${delta}` : `${delta}`,
      });
    }
  }

  // ─── tier ───
  if (oldTier !== null && currentTier !== null) {
    if (oldTier === currentTier) {
      entries.push({
        field: "tier",
        old: oldTier,
        current: currentTier,
        severity: "unchanged",
      });
    } else {
      const rankDelta = tierRank(currentTier) - tierRank(oldTier);
      const sev: DiffSeverity =
        rankDelta < -1 ? "alert" : rankDelta < 0 ? "warn" : "info";
      entries.push({
        field: "tier",
        old: oldTier,
        current: currentTier,
        severity: sev,
        note: rankDelta < 0 ? "downgrade" : "upgrade",
      });
    }
  }

  // ─── identity rotation ───
  if (currentPrimary && oldRecipient) {
    if (oldRecipient.toLowerCase() !== currentPrimary.toLowerCase()) {
      entries.push({
        field: "primaryAddress",
        old: oldRecipient,
        current: currentPrimary,
        // Identity rotation is a strong anti-scam signal — alert.
        severity: "alert",
        note: "primary address changed since previous attestation",
      });
    } else {
      entries.push({
        field: "primaryAddress",
        old: oldRecipient,
        current: currentPrimary,
        severity: "unchanged",
      });
    }
  }

  // ─── computedAt freshness ───
  if (oldComputedAt) {
    const ageHours = Math.floor((nowSec - oldComputedAt) / 3600);
    entries.push({
      field: "report_age",
      old: `${ageHours}h ago`,
      current: "now",
      severity: ageHours >= 24 * 30 ? "warn" : "info",
      note:
        ageHours >= 24 * 30
          ? "previous attestation older than 30 days"
          : `previous attestation ${ageHours}h ago`,
    });
  }

  // ─── revocation status ───
  if (previous.revoked) {
    entries.push({
      field: "revoked",
      old: "yes",
      current: "n/a",
      severity: "alert",
      note: "previous attestation has been revoked on-chain",
    });
  }

  // ─── reportUri (pointer to JSON envelope) ───
  if (decoded?.reportUri) {
    entries.push({
      field: "reportUri",
      old: decoded.reportUri,
      current: `https://upgrade-siren.vercel.app/b/${currentEvidence.subject.name}`,
      severity: "info",
      note: "open old report envelope to compare ENS records / sourcify entries",
    });
  }

  return {
    overall: rollupSeverity(entries),
    entries,
    oldScore,
    currentScore: currentScore100,
    oldTier,
    currentTier,
    oldComputedAt,
    currentComputedAt: nowSec,
    oldRecipient,
    currentPrimaryAddress: currentPrimary,
  };
}
