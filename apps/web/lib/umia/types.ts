// Mirrors umia-venture-apply.schema.json (v0.1.0). Hand-written so the
// app gets compile-time safety without pulling in a JSON-schema-to-TS
// codegen step. Keep in sync with the .schema.json file in this dir.

export type UmiaProjectStage =
  | "idea"
  | "prototype"
  | "alpha"
  | "beta"
  | "live";

export interface UmiaTeamMember {
  readonly handle: string;
  readonly role?: string;
  readonly ens?: string;
  readonly github?: string;
  readonly wallet_address?: string;
}

export interface UmiaTeam {
  readonly name?: string;
  readonly members: ReadonlyArray<UmiaTeamMember>;
}

export interface UmiaOwnerContacts {
  readonly email?: string;
  readonly telegram?: string;
  readonly twitter?: string;
  readonly discord?: string;
}

export interface UmiaProjectLinkOther {
  readonly label: string;
  readonly url: string;
}

export interface UmiaProjectLinks {
  readonly website?: string;
  readonly github_repositories: ReadonlyArray<string>;
  readonly github_organization?: string;
  readonly twitter?: string;
  readonly telegram?: string;
  readonly discord?: string;
  readonly other?: ReadonlyArray<UmiaProjectLinkOther>;
}

export interface UmiaProject {
  readonly name: string;
  readonly description: string;
  readonly pitch: string;
  readonly stage: UmiaProjectStage;
  readonly primary_address?: string;
  readonly links: UmiaProjectLinks;
}

export interface UmiaUpgradeSirenReportRef {
  readonly uid?: string;
  readonly hash?: string;
  readonly url?: string;
  readonly subject_ens?: string;
  readonly score_100?: number;
  readonly tier?: "S" | "A" | "B" | "C" | "D" | "U";
  readonly computed_at_iso?: string;
}

export interface UmiaVenturePayload {
  readonly schema_version: "0.1.0";
  readonly target_command: "umia venture apply";
  readonly submission_track: "community";
  readonly submission_notes?: string;
  readonly upgrade_siren_report?: UmiaUpgradeSirenReportRef;
  readonly team: UmiaTeam;
  readonly owner_contacts: UmiaOwnerContacts;
  readonly project: UmiaProject;
}

// Shape used by the form component. Mirrors UmiaVenturePayload but each
// field tracks whether the value came from ENS/report evidence (locked,
// read-only) or was hand-typed by the user (editable).
export type FieldOrigin = "ens" | "report" | "manifest" | "user" | "default";

export interface PrefilledField<T> {
  readonly value: T;
  readonly origin: FieldOrigin;
  // Short hint shown next to the field in the UI ("from ENS · com.github").
  readonly sourceLabel: string | null;
  // True when origin was ENS/report/manifest and the field is rendered
  // as locked/read-only. False for editable fields (origin === user/default).
  readonly locked: boolean;
}

export interface PrefilledOwnerContacts {
  readonly email: PrefilledField<string>;
  readonly telegram: PrefilledField<string>;
  readonly twitter: PrefilledField<string>;
  readonly discord: PrefilledField<string>;
}

export interface PrefilledTeamMember {
  readonly handle: PrefilledField<string>;
  readonly role: PrefilledField<string>;
  readonly ens: PrefilledField<string>;
  readonly github: PrefilledField<string>;
  readonly wallet_address: PrefilledField<string>;
}

export interface PrefilledProjectLinks {
  readonly website: PrefilledField<string>;
  readonly github_repositories: PrefilledField<ReadonlyArray<string>>;
  readonly github_organization: PrefilledField<string>;
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
  readonly primary_address: PrefilledField<string>;
  readonly links: PrefilledProjectLinks;
}

export interface PrefilledUmiaForm {
  readonly schema_version: "0.1.0";
  readonly target_command: "umia venture apply";
  readonly submission_track: "community";
  readonly submission_notes: PrefilledField<string>;
  readonly upgrade_siren_report: UmiaUpgradeSirenReportRef | null;
  readonly team: {
    readonly name: PrefilledField<string>;
    readonly members: ReadonlyArray<PrefilledTeamMember>;
  };
  readonly owner_contacts: PrefilledOwnerContacts;
  readonly project: PrefilledProject;
}
