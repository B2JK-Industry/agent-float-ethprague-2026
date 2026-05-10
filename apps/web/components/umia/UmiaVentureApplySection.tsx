"use client";

// Umia Venture Apply — export-only section.
//
// Renders below the Bench verdict on /b/[name]. Lets a promising subject
// turn the Upgrade Siren report + ENS records into a draft `umia venture
// apply` payload aligned with the canonical Umia Community Track schema
// (apps/web/lib/umia/umia-venture-apply.schema.json v0.1.0).
//
// MVP behavior: download JSON locally; never shells out to the real CLI;
// never uploads anywhere. Strictly additive — does NOT modify the report
// publish flow (BenchPublishWidget, EAS publish, EAS store).
//
// Provenance discipline:
//   - Fields prefilled from ENS / report / manifest render as locked
//     (read-only) with a source label. Edits are not allowed.
//   - Fields the schema requires but evidence cannot supply are editable.
//   - Submit/Download is gated on Ajv schema validation passing.

import { useMemo, useState } from "react";

import type { MultiSourceEvidence, ScoreResult } from "@upgrade-siren/evidence";

import {
  buildPayloadFromForm,
  buildPrefilledForm,
  type OwnerContactEdits,
  type MemberEdits,
} from "../../lib/umia/buildUmiaVenturePayload";
import type {
  PrefilledField,
  PrefilledUmiaForm,
  UmiaPreferredContact,
  UmiaProject,
  UmiaRole,
} from "../../lib/umia/types";
import { validateUmiaPayload } from "../../lib/umia/validate";

const UMIA_HOMEPAGE = "https://www.umia.finance";

const ROLES: ReadonlyArray<UmiaRole> = [
  "Founder",
  "Investor",
  "Advisor",
  "Researcher",
  "Ambassador",
  "Other",
];

const STAGES: ReadonlyArray<UmiaProject["stage"]> = [
  "Idea",
  "Pre-MVP",
  "MVP",
  "Customers",
  "Revenue",
  "Growth",
];

const PREFERRED_CONTACTS: ReadonlyArray<UmiaPreferredContact> = [
  "email",
  "telegram",
  "twitter",
  "discord",
  "phone",
];

interface Props {
  readonly evidence: MultiSourceEvidence;
  readonly score: ScoreResult | null;
  readonly reportUid?: string | null;
  readonly reportHash?: string | null;
}

interface UserEdits {
  submission_notes: string;
  // Owner contact 0 (only the editable fields — locked ones use form.value)
  contact_name: string;
  contact_role: UmiaRole;
  contact_email: string;
  contact_telegram: string;
  contact_twitter: string;
  contact_discord: string;
  contact_phone: string;
  contact_preferred: UmiaPreferredContact;
  // Member 0 (handle/wallet/github come locked from the form)
  member_name: string;
  member_role: UmiaRole;
  member_bio: string;
  // Project
  project_name: string;
  project_description: string;
  project_pitch: string;
  project_stage: UmiaProject["stage"];
  // Project links — github_repositories edits as a single comma-delimited
  // string for MVP simplicity.
  links_website: string;
  links_github_repositories: string;
  links_github_organization: string;
  links_docs: string;
  links_demo: string;
  links_twitter: string;
  links_telegram: string;
  links_discord: string;
}

function emptyEdits(form: PrefilledUmiaForm): UserEdits {
  const contact = form.owner_contacts[0];
  const member = form.team.members[0];
  return {
    submission_notes: form.submission_notes.value,
    contact_name: contact?.name.value ?? "",
    contact_role: contact?.role.value ?? "Founder",
    contact_email: contact?.email.value ?? "",
    contact_telegram: contact?.telegram.value ?? "",
    contact_twitter: contact?.twitter.value ?? "",
    contact_discord: contact?.discord.value ?? "",
    contact_phone: contact?.phone.value ?? "",
    contact_preferred: contact?.preferred_contact.value ?? "email",
    member_name: member?.name.value ?? "",
    member_role: member?.role.value ?? "Founder",
    member_bio: member?.bio.value ?? "",
    project_name: form.project.name.value,
    project_description: form.project.description.value,
    project_pitch: form.project.pitch.value,
    project_stage: form.project.stage.value,
    links_website: form.project.links.website.value,
    links_github_repositories:
      form.project.links.github_repositories.value.join(", "),
    links_github_organization: form.project.links.github_organization.value,
    links_docs: form.project.links.docs.value,
    links_demo: form.project.links.demo.value,
    links_twitter: form.project.links.twitter.value,
    links_telegram: form.project.links.telegram.value,
    links_discord: form.project.links.discord.value,
  };
}

export function UmiaVentureApplySection({
  evidence,
  score,
  reportUid,
  reportHash,
}: Props): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  const form = useMemo(
    () =>
      buildPrefilledForm({
        evidence,
        score,
        reportRef: {
          ...(reportUid ? { uid: reportUid } : {}),
          ...(reportHash ? { hash: reportHash } : {}),
        },
      }),
    [evidence, score, reportUid, reportHash],
  );

  const [edits, setEdits] = useState<UserEdits>(() => emptyEdits(form));

  const computed = useMemo(() => {
    const repos = edits.links_github_repositories
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const ownerContactEdits: OwnerContactEdits = {
      name: edits.contact_name,
      role: edits.contact_role,
      email: edits.contact_email,
      telegram: edits.contact_telegram,
      twitter: edits.contact_twitter,
      discord: edits.contact_discord,
      phone: edits.contact_phone,
      preferred_contact: edits.contact_preferred,
    };
    const memberEdits: MemberEdits = {
      name: edits.member_name,
      role: edits.member_role,
      bio: edits.member_bio,
    };

    const payload = buildPayloadFromForm({
      form,
      userEdits: {
        submission_notes: edits.submission_notes,
        owner_contacts: [ownerContactEdits],
        members: [memberEdits],
        project: {
          name: edits.project_name,
          description: edits.project_description,
          pitch: edits.project_pitch,
          stage: edits.project_stage,
          links: {
            website: edits.links_website,
            github_repositories: repos,
            github_organization: edits.links_github_organization,
            docs: edits.links_docs,
            demo: edits.links_demo,
            twitter: edits.links_twitter,
            telegram: edits.links_telegram,
            discord: edits.links_discord,
          },
        },
      },
    });

    const validation = validateUmiaPayload(payload);
    return { payload, validation };
  }, [edits, form]);

  const blocked = computed.validation.kind === "error";

  const filename = useMemo(() => {
    const base = reportUid ?? evidence.subject.name.replace(/[^a-z0-9._-]/gi, "_");
    return `umia-venture-apply-${base}.json`;
  }, [reportUid, evidence.subject.name]);

  function handleDownload(): void {
    if (blocked) return;
    const json = JSON.stringify(computed.payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section
      data-section="umia-venture-apply"
      data-expanded={expanded ? "true" : "false"}
      aria-label="Launch with Umia"
      className="border border-border bg-surface"
    >
      <header
        className="flex flex-col gap-1"
        style={{
          padding: "16px 20px",
          borderBottom: expanded ? "1px solid var(--color-border)" : "none",
        }}
      >
        <span
          className="font-mono uppercase text-t3"
          style={{ fontSize: "10px", letterSpacing: "0.18em" }}
        >
          Launch with Umia · ETHPrague 2026 sponsor
        </span>
        <h2
          className="font-display text-t1"
          style={{ fontSize: "20px", fontWeight: 700, lineHeight: 1.2 }}
        >
          Want to launch a real promising project in one click?
        </h2>
        <p
          className="text-t2"
          style={{
            fontSize: "12px",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
          }}
        >
          Umia is the Community Track venture launcher. This section turns
          the verdict above into a draft{" "}
          <code className="font-mono">umia venture apply</code>{" "}
          payload aligned with the Community Track schema — JSON download
          only, no upload, no real CLI execution.{" "}
          <a
            href={UMIA_HOMEPAGE}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            About Umia ↗
          </a>
        </p>
        <div className="flex items-center justify-end">
          <button
            type="button"
            data-action="toggle-umia-form"
            onClick={() => setExpanded((v) => !v)}
            className="border border-t1 px-3 py-1 font-mono text-t1 hover:bg-bg"
            style={{
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {expanded ? "Collapse" : "Prepare Umia application"}
          </button>
        </div>
      </header>

      {expanded ? (
        <div
          data-section="umia-form"
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            fontFamily: "var(--font-mono)",
          }}
        >
          {/* upgrade_siren_report ref (read-only) */}
          {form.upgrade_siren_report ? (
            <ReportRefBlock report={form.upgrade_siren_report} />
          ) : null}

          {/* Project */}
          <FieldGroup title="Project">
            <PrefilledTextInput
              label="Name"
              required
              field={form.project.name}
              value={edits.project_name}
              onChange={(v) => setEdits({ ...edits, project_name: v })}
            />
            <PrefilledTextarea
              label="Description (≥ 50 chars)"
              required
              field={form.project.description}
              value={edits.project_description}
              onChange={(v) => setEdits({ ...edits, project_description: v })}
            />
            <PrefilledTextarea
              label="Pitch (10–500 chars)"
              required
              field={{
                value: edits.project_pitch || form.project.pitch.value,
                origin: form.project.pitch.origin,
                sourceLabel: form.project.pitch.sourceLabel,
                locked: false,
              }}
              value={edits.project_pitch}
              onChange={(v) => setEdits({ ...edits, project_pitch: v })}
            />
            <SelectField
              label="Stage"
              required
              value={edits.project_stage}
              options={STAGES}
              onChange={(v) =>
                setEdits({ ...edits, project_stage: v as UmiaProject["stage"] })
              }
            />
          </FieldGroup>

          {/* Project links */}
          <FieldGroup
            title="Project links"
            note="github_repositories must be specific repo URLs (https://github.com/owner/repo). Org URLs go in github_organization."
          >
            <PrefilledTextInput
              label="Website"
              field={form.project.links.website}
              value={edits.links_website}
              onChange={(v) => setEdits({ ...edits, links_website: v })}
            />
            <PrefilledTextarea
              label="GitHub repositories (comma-separated owner/repo URLs)"
              required
              field={{
                value: edits.links_github_repositories,
                origin: form.project.links.github_repositories.origin,
                sourceLabel: form.project.links.github_repositories.sourceLabel,
                locked: false,
              }}
              value={edits.links_github_repositories}
              onChange={(v) =>
                setEdits({ ...edits, links_github_repositories: v })
              }
            />
            <PrefilledTextInput
              label="GitHub organization (URL)"
              field={form.project.links.github_organization}
              value={edits.links_github_organization}
              onChange={(v) =>
                setEdits({ ...edits, links_github_organization: v })
              }
            />
            <PrefilledTextInput
              label="Docs"
              field={form.project.links.docs}
              value={edits.links_docs}
              onChange={(v) => setEdits({ ...edits, links_docs: v })}
            />
            <PrefilledTextInput
              label="Demo"
              field={form.project.links.demo}
              value={edits.links_demo}
              onChange={(v) => setEdits({ ...edits, links_demo: v })}
            />
            <PrefilledTextInput
              label="Twitter"
              field={form.project.links.twitter}
              value={edits.links_twitter}
              onChange={(v) => setEdits({ ...edits, links_twitter: v })}
            />
            <PrefilledTextInput
              label="Telegram"
              field={form.project.links.telegram}
              value={edits.links_telegram}
              onChange={(v) => setEdits({ ...edits, links_telegram: v })}
            />
            <PrefilledTextInput
              label="Discord"
              field={form.project.links.discord}
              value={edits.links_discord}
              onChange={(v) => setEdits({ ...edits, links_discord: v })}
            />
          </FieldGroup>

          {/* Owner contact (canonical schema is array; we seed one) */}
          <FieldGroup
            title="Owner contact (at least one entry, with at least one channel)"
            note="Schema requires email, telegram, twitter, discord, or phone."
          >
            <PrefilledTextInput
              label="Name"
              required
              field={{
                value: edits.contact_name,
                origin: "user",
                sourceLabel: null,
                locked: false,
              }}
              value={edits.contact_name}
              onChange={(v) => setEdits({ ...edits, contact_name: v })}
            />
            <SelectField
              label="Role"
              value={edits.contact_role}
              options={ROLES}
              onChange={(v) =>
                setEdits({ ...edits, contact_role: v as UmiaRole })
              }
            />
            <PrefilledTextInput
              label="Email"
              field={form.owner_contacts[0]?.email ?? emptyPrefilled()}
              value={edits.contact_email}
              onChange={(v) => setEdits({ ...edits, contact_email: v })}
            />
            <PrefilledTextInput
              label="Telegram"
              field={form.owner_contacts[0]?.telegram ?? emptyPrefilled()}
              value={edits.contact_telegram}
              onChange={(v) => setEdits({ ...edits, contact_telegram: v })}
            />
            <PrefilledTextInput
              label="Twitter"
              field={form.owner_contacts[0]?.twitter ?? emptyPrefilled()}
              value={edits.contact_twitter}
              onChange={(v) => setEdits({ ...edits, contact_twitter: v })}
            />
            <PrefilledTextInput
              label="Discord"
              field={form.owner_contacts[0]?.discord ?? emptyPrefilled()}
              value={edits.contact_discord}
              onChange={(v) => setEdits({ ...edits, contact_discord: v })}
            />
            <PrefilledTextInput
              label="Phone"
              field={form.owner_contacts[0]?.phone ?? emptyPrefilled()}
              value={edits.contact_phone}
              onChange={(v) => setEdits({ ...edits, contact_phone: v })}
            />
            <SelectField
              label="Preferred contact"
              value={edits.contact_preferred}
              options={PREFERRED_CONTACTS}
              onChange={(v) =>
                setEdits({
                  ...edits,
                  contact_preferred: v as UmiaPreferredContact,
                })
              }
            />
          </FieldGroup>

          {/* Team — first member */}
          <FieldGroup title="Team member (at least one)">
            <PrefilledTextInput
              label="Name"
              required
              field={{
                value: edits.member_name,
                origin: "user",
                sourceLabel: null,
                locked: false,
              }}
              value={edits.member_name}
              onChange={(v) => setEdits({ ...edits, member_name: v })}
            />
            <SelectField
              label="Role"
              required
              value={edits.member_role}
              options={ROLES}
              onChange={(v) =>
                setEdits({ ...edits, member_role: v as UmiaRole })
              }
            />
            {form.team.members[0] ? (
              <>
                <PrefilledTextInput
                  label="Handle"
                  field={form.team.members[0].handle}
                  value={form.team.members[0].handle.value}
                  onChange={() => undefined}
                />
                <PrefilledTextInput
                  label="Wallet address"
                  field={form.team.members[0].wallet_address}
                  value={form.team.members[0].wallet_address.value}
                  onChange={() => undefined}
                />
                <PrefilledTextInput
                  label="GitHub"
                  field={form.team.members[0].github}
                  value={form.team.members[0].github.value}
                  onChange={() => undefined}
                />
                <PrefilledTextInput
                  label="Twitter"
                  field={form.team.members[0].twitter}
                  value={form.team.members[0].twitter.value}
                  onChange={() => undefined}
                />
              </>
            ) : null}
            <PrefilledTextarea
              label="Bio (optional)"
              field={{
                value: edits.member_bio,
                origin: "user",
                sourceLabel: null,
                locked: false,
              }}
              value={edits.member_bio}
              onChange={(v) => setEdits({ ...edits, member_bio: v })}
            />
          </FieldGroup>

          {/* Submission notes */}
          <FieldGroup
            title="Submission notes"
            note="Auto-filled with the Upgrade Siren report reference. Editable so you can add context for a future Umia adapter."
          >
            <PrefilledTextarea
              label="Notes"
              field={form.submission_notes}
              value={edits.submission_notes}
              onChange={(v) => setEdits({ ...edits, submission_notes: v })}
            />
          </FieldGroup>

          {/* Validation errors */}
          {computed.validation.kind === "error" ? (
            <ul
              data-field="validation-errors"
              className="m-0 list-none p-0"
              style={{
                background: "var(--color-bg)",
                border: "1px solid var(--color-verdict-siren, #c33)",
                padding: "10px 14px",
                fontSize: "11px",
                lineHeight: 1.5,
              }}
            >
              <li
                className="font-mono uppercase text-t3"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.18em",
                  marginBottom: "6px",
                }}
              >
                Schema validation · {computed.validation.errors.length} error
                {computed.validation.errors.length === 1 ? "" : "s"}
              </li>
              {computed.validation.errors.slice(0, 8).map((e, i) => (
                <li key={i}>
                  <code className="text-t1">{e.path}</code>{" "}
                  <span className="text-t2">{e.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p
              data-field="validation-ok"
              className="font-mono text-t3"
              style={{ fontSize: "10px", letterSpacing: "0.04em" }}
            >
              ✓ Schema OK — payload validates against
              umia-venture-apply.schema.json (v0.1.0).
            </p>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between gap-3">
            <span
              className="text-t3"
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
              }}
            >
              Filename: <code className="font-mono">{filename}</code>
            </span>
            <button
              type="button"
              data-action="download-umia-payload"
              disabled={blocked}
              onClick={handleDownload}
              className="border px-3 py-2 font-mono"
              style={{
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                borderColor: blocked ? "var(--color-border)" : "var(--color-t1)",
                color: blocked ? "var(--color-t3)" : "var(--color-t1)",
                background: blocked ? "transparent" : "var(--color-bg)",
                cursor: blocked ? "not-allowed" : "pointer",
              }}
            >
              {blocked
                ? "Fix errors to enable download"
                : "Download Umia application JSON"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ─── helpers ───

function emptyPrefilled(): PrefilledField<string> {
  return { value: "", origin: "user", sourceLabel: null, locked: false };
}

function FieldGroup({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <fieldset
      style={{
        border: "1px dotted var(--color-border)",
        padding: "12px 14px",
        margin: 0,
      }}
    >
      <legend
        className="font-mono uppercase text-t3"
        style={{
          fontSize: "10px",
          letterSpacing: "0.18em",
          padding: "0 6px",
        }}
      >
        {title}
      </legend>
      {note ? (
        <p
          className="text-t3"
          style={{
            fontSize: "10px",
            fontStyle: "italic",
            fontFamily: "var(--font-serif)",
            marginTop: "4px",
            marginBottom: "8px",
          }}
        >
          {note}
        </p>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {children}
      </div>
    </fieldset>
  );
}

function FieldLabel({
  label,
  required,
  field,
}: {
  label: string;
  required?: boolean;
  field: PrefilledField<unknown>;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span
        className="text-t1"
        style={{ fontSize: "11px", letterSpacing: "0.04em" }}
      >
        {label}
        {required ? <span className="text-verdict-siren"> *</span> : null}
      </span>
      {field.sourceLabel ? (
        <span
          className="text-t3"
          style={{
            fontSize: "10px",
            fontStyle: "italic",
            fontFamily: "var(--font-serif)",
          }}
        >
          {field.sourceLabel}
        </span>
      ) : null}
    </div>
  );
}

function PrefilledTextInput({
  label,
  required,
  field,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  field: PrefilledField<string>;
  value: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  const locked = field.locked && field.value !== "";
  return (
    <label data-field={label} data-locked={locked ? "true" : "false"}>
      <FieldLabel label={label} required={required} field={field} />
      <input
        type="text"
        value={locked ? field.value : value}
        readOnly={locked}
        onChange={(e) => {
          if (!locked) onChange(e.target.value);
        }}
        style={{
          width: "100%",
          marginTop: "4px",
          padding: "6px 8px",
          border: "1px solid var(--color-border)",
          background: locked ? "var(--color-bg)" : "var(--color-surface)",
          color: locked ? "var(--color-t2)" : "var(--color-t1)",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
        }}
      />
    </label>
  );
}

function PrefilledTextarea({
  label,
  required,
  field,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  field: PrefilledField<string>;
  value: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  const locked = field.locked && field.value !== "";
  return (
    <label data-field={label} data-locked={locked ? "true" : "false"}>
      <FieldLabel label={label} required={required} field={field} />
      <textarea
        value={locked ? field.value : value}
        readOnly={locked}
        rows={3}
        onChange={(e) => {
          if (!locked) onChange(e.target.value);
        }}
        style={{
          width: "100%",
          marginTop: "4px",
          padding: "6px 8px",
          border: "1px solid var(--color-border)",
          background: locked ? "var(--color-bg)" : "var(--color-surface)",
          color: locked ? "var(--color-t2)" : "var(--color-t1)",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          lineHeight: 1.4,
          resize: "vertical",
        }}
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  required,
  value,
  options,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: T;
  options: ReadonlyArray<T>;
  onChange: (v: T) => void;
}): React.JSX.Element {
  return (
    <label data-field={label}>
      <span
        className="text-t1"
        style={{ fontSize: "11px", letterSpacing: "0.04em" }}
      >
        {label}
        {required ? <span className="text-verdict-siren"> *</span> : null}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        style={{
          width: "100%",
          marginTop: "4px",
          padding: "6px 8px",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-t1)",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
        }}
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReportRefBlock({
  report,
}: {
  report: NonNullable<PrefilledUmiaForm["upgrade_siren_report"]>;
}): React.JSX.Element {
  return (
    <fieldset
      data-section="umia-report-ref"
      style={{
        border: "1px dotted var(--color-border)",
        padding: "12px 14px",
        margin: 0,
        background: "var(--color-bg)",
      }}
    >
      <legend
        className="font-mono uppercase text-t3"
        style={{
          fontSize: "10px",
          letterSpacing: "0.18em",
          padding: "0 6px",
        }}
      >
        Upgrade Siren report (locked)
      </legend>
      <ul
        className="m-0 list-none p-0"
        style={{
          fontSize: "11px",
          fontFamily: "var(--font-mono)",
          lineHeight: 1.5,
        }}
      >
        {report.subject_ens ? (
          <li>subject_ens: <code>{report.subject_ens}</code></li>
        ) : null}
        {report.uid ? <li>uid: <code>{report.uid}</code></li> : null}
        {report.hash ? <li>hash: <code>{report.hash}</code></li> : null}
        {report.url ? <li>url: <code>{report.url}</code></li> : null}
        {report.score_100 !== undefined ? (
          <li>score_100: <code>{report.score_100}</code></li>
        ) : null}
        {report.tier ? <li>tier: <code>{report.tier}</code></li> : null}
      </ul>
      <p
        className="text-t3"
        style={{
          fontSize: "10px",
          fontStyle: "italic",
          fontFamily: "var(--font-serif)",
          marginTop: "8px",
        }}
      >
        Embedded into <code className="font-mono">submission_notes</code> in
        the downloaded JSON so a future Umia adapter can extract it.
      </p>
    </fieldset>
  );
}
