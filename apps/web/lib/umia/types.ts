// Mirrors umia-venture-apply.schema.json (v0.1.0) — the canonical Umia
// Community Track payload shape Daniel handed over from the Umia docs.
// Hand-written so the app gets compile-time safety without pulling in a
// JSON-schema-to-TS codegen step. Keep in sync with the .schema.json
// file in this dir.

export type UmiaProjectStage =
  | "Idea"
  | "Pre-MVP"
  | "MVP"
  | "Customers"
  | "Revenue"
  | "Growth";

export type UmiaRole =
  | "Founder"
  | "Investor"
  | "Advisor"
  | "Researcher"
  | "Ambassador"
  | "Other";

export type UmiaPreferredContact =
  | "email"
  | "telegram"
  | "twitter"
  | "discord"
  | "phone";

export interface UmiaTeamMember {
  readonly name: string;
  readonly role: UmiaRole;
  readonly handle?: string;
  readonly wallet_address?: string;
  readonly github?: string;
  readonly twitter?: string;
  readonly bio?: string;
}

export interface UmiaTeam {
  readonly members: ReadonlyArray<UmiaTeamMember>;
}

export interface UmiaOwnerContact {
  readonly name: string;
  readonly role?: UmiaRole;
  readonly email?: string;
  readonly telegram?: string;
  readonly twitter?: string;
  readonly discord?: string;
  readonly phone?: string;
  readonly wallet_address?: string;
  readonly preferred_contact?: UmiaPreferredContact;
}

export interface UmiaProjectLinkOther {
  readonly label: string;
  readonly url: string;
}

export interface UmiaProjectLinks {
  readonly website?: string;
  readonly github_repositories: ReadonlyArray<string>;
  readonly github_organization?: string;
  readonly docs?: string;
  readonly demo?: string;
  readonly twitter?: string;
  readonly telegram?: string;
  readonly discord?: string;
  readonly other?: ReadonlyArray<UmiaProjectLinkOther>;
}

export interface UmiaTractionMetricOther {
  readonly label: string;
  readonly value: string | number;
}

export interface UmiaTractionMetrics {
  readonly monthly_revenue_usd?: number;
  readonly monthly_active_users?: number;
  readonly github_stars?: number;
  readonly github_forks?: number;
  readonly other?: ReadonlyArray<UmiaTractionMetricOther>;
}

export interface UmiaProject {
  readonly name: string;
  readonly description: string;
  readonly pitch: string;
  readonly stage: UmiaProjectStage;
  readonly links: UmiaProjectLinks;
  readonly traction_metrics?: UmiaTractionMetrics;
}

export interface UmiaVenturePayload {
  readonly schema_version: "0.1.0";
  readonly target_command: "umia venture apply";
  readonly submission_track: "community";
  readonly submission_notes?: string;
  readonly team: UmiaTeam;
  readonly owner_contacts: ReadonlyArray<UmiaOwnerContact>;
  readonly project: UmiaProject;
}

// ─── Form prefill provenance ───
//
// Used by the UmiaVentureApplySection to render fields with a source
// label and a locked/editable badge. The canonical schema doesn't have
// a "report" field, but we surface the Upgrade Siren report metadata
// inside `submission_notes` so the future Umia adapter has a stable
// reference back to the verdict that triggered the application.

export type FieldOrigin = "ens" | "report" | "manifest" | "user" | "default";

export interface PrefilledField<T> {
  readonly value: T;
  readonly origin: FieldOrigin;
  readonly sourceLabel: string | null;
  readonly locked: boolean;
}

export interface UpgradeSirenReportRef {
  readonly uid?: string;
  readonly hash?: string;
  readonly url?: string;
  readonly subject_ens?: string;
  readonly score_100?: number;
  readonly tier?: "S" | "A" | "B" | "C" | "D" | "U";
  readonly computed_at_iso?: string;
}

export interface PrefilledOwnerContact {
  readonly name: PrefilledField<string>;
  readonly role: PrefilledField<UmiaRole>;
  readonly email: PrefilledField<string>;
  readonly telegram: PrefilledField<string>;
  readonly twitter: PrefilledField<string>;
  readonly discord: PrefilledField<string>;
  readonly phone: PrefilledField<string>;
  readonly wallet_address: PrefilledField<string>;
  readonly preferred_contact: PrefilledField<UmiaPreferredContact>;
}

export interface PrefilledTeamMember {
  readonly name: PrefilledField<string>;
  readonly handle: PrefilledField<string>;
  readonly role: PrefilledField<UmiaRole>;
  readonly wallet_address: PrefilledField<string>;
  readonly github: PrefilledField<string>;
  readonly twitter: PrefilledField<string>;
  readonly bio: PrefilledField<string>;
}

export interface PrefilledProjectLinks {
  readonly website: PrefilledField<string>;
  readonly github_repositories: PrefilledField<ReadonlyArray<string>>;
  readonly github_organization: PrefilledField<string>;
  readonly docs: PrefilledField<string>;
  readonly demo: PrefilledField<string>;
  readonly twitter: PrefilledField<string>;
  readonly telegram: PrefilledField<string>;
  readonly discord: PrefilledField<string>;
  readonly other: PrefilledField<ReadonlyArray<UmiaProjectLinkOther>>;
}

export interface PrefilledProject {
  readonly name: PrefilledField<string>;
  readonly description: PrefilledField<string>;
  readonly pitch: PrefilledField<string>;
  readonly stage: PrefilledField<UmiaProjectStage>;
  readonly links: PrefilledProjectLinks;
}

export interface PrefilledUmiaForm {
  readonly schema_version: "0.1.0";
  readonly target_command: "umia venture apply";
  readonly submission_track: "community";
  readonly submission_notes: PrefilledField<string>;
  // Surfaced for the locked report-ref block in the UI; embedded into
  // submission_notes when the payload is materialised.
  readonly upgrade_siren_report: UpgradeSirenReportRef | null;
  readonly team: {
    readonly members: ReadonlyArray<PrefilledTeamMember>;
  };
  readonly owner_contacts: ReadonlyArray<PrefilledOwnerContact>;
  readonly project: PrefilledProject;
}
