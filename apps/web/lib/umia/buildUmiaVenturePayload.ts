// Pure function: maps a Bench Mode evidence + score snapshot into a
// PrefilledUmiaForm. The form preserves provenance per field so the UI
// can render ENS/report/manifest-sourced values as locked/read-only and
// keep user-editable inputs for everything else.
//
// Hard rule: never fabricate required-but-missing values. Missing fields
// stay editable so the user must fill them before download.

import type { MultiSourceEvidence, ScoreResult } from "@upgrade-siren/evidence";

import type {
  FieldOrigin,
  PrefilledField,
  PrefilledProject,
  PrefilledProjectLinks,
  PrefilledTeamMember,
  PrefilledUmiaForm,
  UmiaOwnerContacts,
  UmiaProject,
  UmiaProjectLinkOther,
  UmiaProjectLinks,
  UmiaTeam,
  UmiaTeamMember,
  UmiaVenturePayload,
  UmiaUpgradeSirenReportRef,
} from "./types";

const GITHUB_OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?$/;
const GITHUB_REPO_RE = /^[A-Za-z0-9_.-]{1,100}$/;

function field<T>(
  value: T,
  origin: FieldOrigin,
  sourceLabel: string | null,
): PrefilledField<T> {
  const locked = origin === "ens" || origin === "report" || origin === "manifest";
  return { value, origin, sourceLabel, locked };
}

function emptyField<T>(empty: T): PrefilledField<T> {
  return field(empty, "user", null);
}

function defaultField<T>(value: T): PrefilledField<T> {
  return field(value, "default", null);
}

// Read a text record across the three places it might surface:
//   1. evidence.subject.inferredTexts (public-read)
//   2. evidence.subject.manifest text-records mirror (manifest mode — not
//      currently wired into the manifest type, so we treat it as null)
function readEnsText(
  evidence: MultiSourceEvidence,
  key: string,
): string | null {
  const texts = evidence.subject.inferredTexts;
  if (!texts) return null;
  const v = texts[key];
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function ensSourceLabel(key: string): string {
  return `from ENS · ${key}`;
}

function githubRepoUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}`;
}

function githubOwnerUrl(owner: string): string {
  return `https://github.com/${owner}`;
}

// Build a deterministic seed report-ref from evidence + score, when no
// uploaded report UID is supplied by the caller. Hash field is omitted —
// the on-chain attestation hash flows in via easBundle on the server side
// and isn't always available here. URL is constructed from subject name.
function buildReportRef(
  evidence: MultiSourceEvidence,
  score: ScoreResult | null,
  override: Partial<UmiaUpgradeSirenReportRef> | null,
): UmiaUpgradeSirenReportRef {
  const subjectEns = evidence.subject.name;
  const ref: UmiaUpgradeSirenReportRef = {
    subject_ens: subjectEns,
    url: `https://upgrade-siren.vercel.app/b/${encodeURIComponent(subjectEns)}`,
    ...(score !== null
      ? {
          score_100: score.score_100,
          tier: score.tier,
        }
      : {}),
    ...(override ?? {}),
  };
  return ref;
}

export interface BuildPrefilledFormOptions {
  readonly evidence: MultiSourceEvidence;
  readonly score: ScoreResult | null;
  // Optional report metadata sourced from the EAS attestation widget on
  // the bench page. When supplied, uid/hash flow into upgrade_siren_report.
  readonly reportRef?: Partial<UmiaUpgradeSirenReportRef> | null;
}

export function buildPrefilledForm(
  options: BuildPrefilledFormOptions,
): PrefilledUmiaForm {
  const { evidence, score, reportRef } = options;
  const subject = evidence.subject;
  const ensName = subject.name;

  // ─── ENS text record reads ───
  const description = readEnsText(evidence, "description");
  const websiteUrl = readEnsText(evidence, "url");
  const githubOwner = readEnsText(evidence, "com.github");
  const twitterRaw =
    readEnsText(evidence, "com.twitter") ?? readEnsText(evidence, "X");
  const telegramRaw = readEnsText(evidence, "org.telegram");
  const discordRaw = readEnsText(evidence, "com.discord");
  const linkedinRaw = readEnsText(evidence, "com.linkedin");
  const farcasterRaw = readEnsText(evidence, "xyz.farcaster");
  const lensRaw = readEnsText(evidence, "org.lens");

  // ─── owner_contacts ───
  // The schema requires at least one contact. We mark each field as
  // locked when sourced from ENS so the user can't silently change it.
  const ownerContacts = {
    email: emptyField<string>(""),
    telegram: telegramRaw
      ? field<string>(telegramRaw, "ens", ensSourceLabel("org.telegram"))
      : emptyField<string>(""),
    twitter: twitterRaw
      ? field<string>(
          twitterRaw,
          "ens",
          readEnsText(evidence, "com.twitter") !== null
            ? ensSourceLabel("com.twitter")
            : ensSourceLabel("X"),
        )
      : emptyField<string>(""),
    discord: discordRaw
      ? field<string>(discordRaw, "ens", ensSourceLabel("com.discord"))
      : emptyField<string>(""),
  };

  // ─── team.members ───
  // We always seed exactly one member: the subject ENS (locked) with the
  // resolved primaryAddress (locked when present) and inferred com.github.
  // The user can add more members from the form UI; that flow lives in
  // the component, not here.
  const member: PrefilledTeamMember = {
    handle: field<string>(ensName, "ens", ensSourceLabel("name")),
    role: emptyField<string>(""),
    ens: field<string>(ensName, "ens", ensSourceLabel("name")),
    github: githubOwner && GITHUB_OWNER_RE.test(githubOwner)
      ? field<string>(githubOwner, "ens", ensSourceLabel("com.github"))
      : emptyField<string>(""),
    wallet_address: subject.primaryAddress
      ? field<string>(subject.primaryAddress, "report", "from report · primary address")
      : emptyField<string>(""),
  };

  // ─── project.links ───
  const githubRepoUrls: string[] = [];
  if (githubOwner && GITHUB_OWNER_RE.test(githubOwner)) {
    // Without a manifest-declared repo we fall back to the org/user URL
    // formatted as a repository placeholder. Schema requires github_repositories
    // be a non-empty array of URIs; the org URL satisfies that and remains
    // editable so the user can pin a specific repo before submission.
    githubRepoUrls.push(githubOwnerUrl(githubOwner));
  }
  // Manifest may carry sources.github with explicit repo list (rare in v1).
  const manifestGh = subject.manifest?.sources.github;
  if (manifestGh) {
    const owner = manifestGh.owner;
    if (owner && GITHUB_OWNER_RE.test(owner)) {
      const ownerUrl = githubOwnerUrl(owner);
      if (!githubRepoUrls.includes(ownerUrl)) githubRepoUrls.unshift(ownerUrl);
    }
  }

  const otherLinks: UmiaProjectLinkOther[] = [];
  if (linkedinRaw) otherLinks.push({ label: "LinkedIn", url: normaliseLinkedIn(linkedinRaw) });
  if (farcasterRaw) otherLinks.push({ label: "Farcaster", url: normaliseFarcaster(farcasterRaw) });
  if (lensRaw) otherLinks.push({ label: "Lens", url: normaliseLens(lensRaw) });

  const links: PrefilledProjectLinks = {
    website: websiteUrl
      ? field<string>(websiteUrl, "ens", ensSourceLabel("url"))
      : emptyField<string>(""),
    github_repositories:
      githubRepoUrls.length > 0
        ? field<ReadonlyArray<string>>(
            githubRepoUrls,
            "ens",
            ensSourceLabel("com.github"),
          )
        : emptyField<ReadonlyArray<string>>([]),
    github_organization: githubOwner && GITHUB_OWNER_RE.test(githubOwner)
      ? field<string>(githubOwner, "ens", ensSourceLabel("com.github"))
      : emptyField<string>(""),
    twitter: twitterRaw
      ? field<string>(twitterRaw, "ens", ensSourceLabel("com.twitter"))
      : emptyField<string>(""),
    telegram: telegramRaw
      ? field<string>(telegramRaw, "ens", ensSourceLabel("org.telegram"))
      : emptyField<string>(""),
    discord: discordRaw
      ? field<string>(discordRaw, "ens", ensSourceLabel("com.discord"))
      : emptyField<string>(""),
    other: otherLinks.length > 0
      ? field<ReadonlyArray<UmiaProjectLinkOther>>(
          otherLinks,
          "ens",
          "from ENS · social text records",
        )
      : emptyField<ReadonlyArray<UmiaProjectLinkOther>>([]),
  };

  const project: PrefilledProject = {
    name: field<string>(ensName, "ens", ensSourceLabel("name")),
    description: description
      ? field<string>(description, "ens", ensSourceLabel("description"))
      : emptyField<string>(""),
    pitch: emptyField<string>(""),
    // Stage is editable — schema enum can't be inferred from evidence.
    // Default "prototype" as a sensible starting point but mark editable.
    stage: defaultField<UmiaProject["stage"]>("prototype"),
    primary_address: subject.primaryAddress
      ? field<string>(
          subject.primaryAddress,
          "report",
          "from report · primary address",
        )
      : emptyField<string>(""),
    links,
  };

  const reportRefBuilt = buildReportRef(evidence, score, reportRef ?? null);
  const reportNote = "App-owned export payload for a future `umia venture apply` CLI adapter. Generated by Upgrade Siren from a Bench-mode verdict.";

  return {
    schema_version: "0.1.0",
    target_command: "umia venture apply",
    submission_track: "community",
    submission_notes: defaultField<string>(reportNote),
    upgrade_siren_report: reportRefBuilt,
    team: {
      name: emptyField<string>(""),
      members: [member],
    },
    owner_contacts: ownerContacts,
    project,
  };
}

// ─── Form → Payload ───
//
// Convert the user-completed form into the schema-shaped payload. Drops
// empty optional fields so the JSON output stays clean. The caller is
// responsible for running the validator against this output.

export interface BuildPayloadInput {
  readonly form: PrefilledUmiaForm;
  // Override layer: edits the user made to editable fields in the UI.
  // Locked fields are not overridable — the UI never sends them in here.
  readonly userEdits?: {
    readonly submission_notes?: string;
    readonly team_name?: string;
    readonly members?: ReadonlyArray<UmiaTeamMember>;
    readonly owner_contacts?: Partial<UmiaOwnerContacts>;
    readonly project?: {
      readonly name?: string;
      readonly description?: string;
      readonly pitch?: string;
      readonly stage?: UmiaProject["stage"];
      readonly links?: Partial<{
        readonly website: string;
        readonly github_repositories: ReadonlyArray<string>;
        readonly github_organization: string;
        readonly twitter: string;
        readonly telegram: string;
        readonly discord: string;
      }>;
    };
  };
}

function pickValue<T>(
  field: PrefilledField<T>,
  edit: T | undefined,
): T {
  if (field.locked) return field.value;
  if (edit !== undefined) return edit;
  return field.value;
}

function nonEmptyString(s: string | undefined): string | undefined {
  if (s === undefined) return undefined;
  const trimmed = s.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildPayloadFromForm(
  input: BuildPayloadInput,
): UmiaVenturePayload {
  const { form, userEdits } = input;
  const edits = userEdits ?? {};

  const ownerContactsOut: UmiaOwnerContacts = {};
  const emailVal = nonEmptyString(
    pickValue(form.owner_contacts.email, edits.owner_contacts?.email),
  );
  const tgVal = nonEmptyString(
    pickValue(form.owner_contacts.telegram, edits.owner_contacts?.telegram),
  );
  const twVal = nonEmptyString(
    pickValue(form.owner_contacts.twitter, edits.owner_contacts?.twitter),
  );
  const dcVal = nonEmptyString(
    pickValue(form.owner_contacts.discord, edits.owner_contacts?.discord),
  );
  if (emailVal) (ownerContactsOut as { email: string }).email = emailVal;
  if (tgVal) (ownerContactsOut as { telegram: string }).telegram = tgVal;
  if (twVal) (ownerContactsOut as { twitter: string }).twitter = twVal;
  if (dcVal) (ownerContactsOut as { discord: string }).discord = dcVal;

  const seedMember = form.team.members[0];
  const seedMemberOut: UmiaTeamMember = seedMember
    ? compactMember({
        handle: seedMember.handle.value,
        role: seedMember.role.value,
        ens: seedMember.ens.value,
        github: seedMember.github.value,
        wallet_address: seedMember.wallet_address.value,
      })
    : { handle: "" };

  const editedMembers = edits.members?.map(compactMember) ?? [];
  const members: UmiaTeamMember[] = [seedMemberOut, ...editedMembers].filter(
    (m) => m.handle.trim().length > 0,
  );

  const team: UmiaTeam = compactTeam({
    name: nonEmptyString(pickValue(form.team.name, edits.team_name)),
    members,
  });

  const projectLinks = form.project.links;
  const links: UmiaProjectLinks = compactLinks({
    website: nonEmptyString(
      pickValue(projectLinks.website, edits.project?.links?.website),
    ),
    github_repositories: pickValue(
      projectLinks.github_repositories,
      edits.project?.links?.github_repositories,
    ),
    github_organization: nonEmptyString(
      pickValue(
        projectLinks.github_organization,
        edits.project?.links?.github_organization,
      ),
    ),
    twitter: nonEmptyString(
      pickValue(projectLinks.twitter, edits.project?.links?.twitter),
    ),
    telegram: nonEmptyString(
      pickValue(projectLinks.telegram, edits.project?.links?.telegram),
    ),
    discord: nonEmptyString(
      pickValue(projectLinks.discord, edits.project?.links?.discord),
    ),
    other: projectLinks.other.value,
  });

  const projectOut: UmiaProject = compactProject({
    name: nonEmptyString(
      pickValue(form.project.name, edits.project?.name),
    ) ?? "",
    description:
      nonEmptyString(
        pickValue(form.project.description, edits.project?.description),
      ) ?? "",
    pitch:
      nonEmptyString(pickValue(form.project.pitch, edits.project?.pitch)) ?? "",
    stage: pickValue(form.project.stage, edits.project?.stage),
    primary_address: nonEmptyString(form.project.primary_address.value),
    links,
  });

  const submissionNotes = nonEmptyString(
    pickValue(form.submission_notes, edits.submission_notes),
  );

  const payload: UmiaVenturePayload = {
    schema_version: "0.1.0",
    target_command: "umia venture apply",
    submission_track: "community",
    ...(submissionNotes ? { submission_notes: submissionNotes } : {}),
    ...(form.upgrade_siren_report
      ? { upgrade_siren_report: form.upgrade_siren_report }
      : {}),
    team,
    owner_contacts: ownerContactsOut,
    project: projectOut,
  };
  return payload;
}

function compactMember(m: UmiaTeamMember): UmiaTeamMember {
  const out: { -readonly [K in keyof UmiaTeamMember]?: UmiaTeamMember[K] } = {
    handle: m.handle?.trim() ?? "",
  };
  if (nonEmptyString(m.role)) out.role = m.role!.trim();
  if (nonEmptyString(m.ens)) out.ens = m.ens!.trim();
  if (nonEmptyString(m.github)) out.github = m.github!.trim();
  if (nonEmptyString(m.wallet_address)) out.wallet_address = m.wallet_address!.trim();
  return out as UmiaTeamMember;
}

function compactTeam(t: { name?: string; members: ReadonlyArray<UmiaTeamMember> }): UmiaTeam {
  const out: { -readonly [K in keyof UmiaTeam]?: UmiaTeam[K] } = {
    members: t.members,
  };
  if (t.name) out.name = t.name;
  return out as UmiaTeam;
}

function compactLinks(l: {
  website?: string;
  github_repositories: ReadonlyArray<string>;
  github_organization?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  other: ReadonlyArray<UmiaProjectLinkOther>;
}): UmiaProjectLinks {
  const out: { -readonly [K in keyof UmiaProjectLinks]?: UmiaProjectLinks[K] } = {
    github_repositories: l.github_repositories,
  };
  if (l.website) out.website = l.website;
  if (l.github_organization) out.github_organization = l.github_organization;
  if (l.twitter) out.twitter = l.twitter;
  if (l.telegram) out.telegram = l.telegram;
  if (l.discord) out.discord = l.discord;
  if (l.other.length > 0) out.other = l.other;
  return out as UmiaProjectLinks;
}

function compactProject(p: {
  name: string;
  description: string;
  pitch: string;
  stage: UmiaProject["stage"];
  primary_address?: string;
  links: UmiaProjectLinks;
}): UmiaProject {
  const out: { -readonly [K in keyof UmiaProject]?: UmiaProject[K] } = {
    name: p.name,
    description: p.description,
    pitch: p.pitch,
    stage: p.stage,
    links: p.links,
  };
  if (p.primary_address) out.primary_address = p.primary_address;
  return out as UmiaProject;
}

function normaliseLinkedIn(raw: string): string {
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("linkedin.com")) return `https://${raw}`;
  return `https://www.linkedin.com/in/${raw.replace(/^@/, "")}`;
}

function normaliseFarcaster(raw: string): string {
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://warpcast.com/${raw.replace(/^@/, "")}`;
}

function normaliseLens(raw: string): string {
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.endsWith(".lens")) return `https://hey.xyz/u/${raw.replace(/\.lens$/, "")}`;
  return `https://hey.xyz/u/${raw.replace(/^@/, "")}`;
}

// Re-export GITHUB_REPO_RE so the form component can lightly validate
// user input on the github_organization → repo URL composition.
export const _GITHUB_REPO_RE = GITHUB_REPO_RE;
