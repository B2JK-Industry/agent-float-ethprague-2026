// US-136 — GitHub source drawer for `/b/[name]`. Per launch prompt:
// "top-20 repo card grid using v3 §C-04 Trust Pills + §C-09 Heartbeat
//  for activity. Now that US-114b shipped P1 enrichment, render
//  ciPassRate / bugHygiene / releaseCadence values (no longer
//  null_p1)."
//
// Anatomy compliance:
//   • v3 §C-04 Trust Pill — `× 0.00..× 1.00` OR `INVALID`, never both;
//     currentColor border + tabular-nums + 1-decimal precision.
//   • v3 §C-09 Heartbeat Dot — 8×8, 2s ease-out infinite pulse, max
//     ONE per surface. The drawer puts a single heartbeat next to the
//     "live activity" header to signal the pushedAt freshness.
//   • v3 §C-05 Source Row layout (dot + name + sub + trust pill +
//     weight) — applied per repo card.
//
// The drawer uses native <details>/<summary> for the open/close state
// (no JS, no a11y bug surface). Trigger button = the GitHub tile from
// US-133's SourceGrid. Until those wire together (separate PR), this
// drawer renders standalone in the route page below the grid.
//
// Tokens (no hex literals): --color-src-verified/partial/discounted
// /missing/degraded, --color-tier-*, --color-t1/t2/t3, --color-border,
// --color-border-strong, --color-bg, --color-surface, --color-raised,
// --color-accent, --font-mono, --font-display, --font-serif.

import type {
  GithubEvidence,
  GithubRepoP0,
} from "@upgrade-siren/evidence";

import { TrustPill, type TrustPillVariant } from "../primitives/TrustPill";
import { HeartbeatDot } from "../primitives/HeartbeatDot";

export type GitHubDrawerProps = {
  readonly github: GithubEvidence;
  /** Initial open state (foundation: closed). Tests pin true. */
  readonly initialOpen?: boolean;
};

const REPO_CAP = 20;

function ciPassRatePill(repo: GithubRepoP0): {
  variant: TrustPillVariant;
  label: string;
} {
  // Three CI states (audit-round-7 P0 #4 differentiated):
  //   1. ciRuns absent (null/undefined) — fetcher couldn't enumerate
  //      workflow runs (no workflows, missing PAT scope, transient
  //      probe failure). Variant `missing` — dashed-border "no data"
  //      treatment.
  //   2. ciRuns present, total === 0 — fetcher saw workflows but no
  //      runs have occurred yet (newly created repo, all runs older
  //      than the 90-day window). Variant `discounted` — solid border
  //      with the discounted hue, signaling "computed, signal is
  //      structurally zero". Crucially distinct from `missing` so a
  //      repo with no signal is not visually conflated with a repo
  //      whose data we couldn't fetch.
  //   3. ciRuns.total > 0 — real pass-rate ratio.
  if (!repo.ciRuns) {
    return { variant: "missing", label: "× 0.00" };
  }
  if (repo.ciRuns.total === 0) {
    return { variant: "discounted", label: "× 0.00" };
  }
  const ratio = repo.ciRuns.successful / repo.ciRuns.total;
  return {
    variant: trustVariantFromRatio(ratio),
    label: `× ${ratio.toFixed(2)}`,
  };
}

function bugHygienePill(repo: GithubRepoP0): {
  variant: TrustPillVariant;
  label: string;
} {
  if (!repo.bugIssues) {
    return { variant: "missing", label: "× 0.00" };
  }
  // EPIC §10.2 carry-rule: denom 0 → 1.0 (no bugs filed = clean).
  if (repo.bugIssues.total === 0) {
    return { variant: "verified", label: "× 1.00" };
  }
  const ratio = repo.bugIssues.closed / repo.bugIssues.total;
  return {
    variant: trustVariantFromRatio(ratio),
    label: `× ${ratio.toFixed(2)}`,
  };
}

function releaseCadenceLabel(repo: GithubRepoP0): string {
  if (repo.releasesLast12m === undefined || repo.releasesLast12m === null) {
    return "—";
  }
  return String(repo.releasesLast12m);
}

function trustVariantFromRatio(ratio: number): TrustPillVariant {
  if (ratio >= 0.8) return "verified";
  if (ratio >= 0.5) return "partial";
  return "discounted";
}

function shortPushedAt(iso: string | null): string {
  if (iso === null) return "never";
  // ISO 2026-05-09T18:12:33Z → 2026-05-09. Avoid Date parsing for SSR
  // stability (no locale variance).
  const idx = iso.indexOf("T");
  if (idx === -1) return iso;
  return iso.slice(0, idx);
}

function RepoCard({ repo }: { repo: GithubRepoP0 }): React.JSX.Element {
  const ci = ciPassRatePill(repo);
  const bug = bugHygienePill(repo);
  return (
    <article
      data-repo={repo.fullName}
      data-archived={repo.archived}
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        padding: "14px 16px",
        display: "grid",
        gap: "10px",
      }}
    >
      <header className="flex items-baseline justify-between gap-2">
        <span
          data-field="repo-name"
          className="font-mono"
          style={{
            color: "var(--color-accent)",
            fontSize: "12px",
            letterSpacing: "0.04em",
            wordBreak: "break-all",
          }}
        >
          {repo.fullName}
        </span>
        <span
          data-field="repo-pushed"
          className="font-mono text-t3"
          style={{
            fontSize: "10px",
            letterSpacing: "0.04em",
          }}
        >
          {shortPushedAt(repo.pushedAt)}
        </span>
      </header>

      <div
        className="grid items-center gap-x-3 gap-y-1 font-mono text-t2"
        style={{
          gridTemplateColumns: "minmax(80px, auto) 1fr 80px",
          fontSize: "10px",
          letterSpacing: "0.04em",
        }}
      >
        <span data-field="ci-label" className="text-t3 uppercase">
          CI
        </span>
        <span data-field="ci-meta">
          {repo.ciRuns
            ? `${repo.ciRuns.successful}/${repo.ciRuns.total} runs`
            : "no workflow data"}
        </span>
        <TrustPill variant={ci.variant} label={ci.label} />

        <span data-field="bug-label" className="text-t3 uppercase">
          BUGS
        </span>
        <span data-field="bug-meta">
          {repo.bugIssues
            ? repo.bugIssues.total === 0
              ? "no bug issues"
              : `${repo.bugIssues.closed}/${repo.bugIssues.total} closed`
            : "no bug data"}
        </span>
        <TrustPill variant={bug.variant} label={bug.label} />

        <span data-field="releases-label" className="text-t3 uppercase">
          RELEASES (12m)
        </span>
        <span data-field="releases-meta">{releaseCadenceLabel(repo)}</span>
        <span aria-hidden="true" />
      </div>

      <div
        data-block="hygiene-row"
        className="flex flex-wrap gap-2 font-mono text-t3"
        style={{
          fontSize: "9px",
          letterSpacing: "0.1em",
        }}
      >
        <HygieneFlag label="README" present={repo.hasSubstantialReadme} />
        <HygieneFlag label="LICENSE" present={repo.hasLicense} />
        <HygieneFlag label="SECURITY" present={repo.hasSecurity ?? false} />
        <HygieneFlag label="DEPENDABOT" present={repo.hasDependabot ?? false} />
        <HygieneFlag
          label="BRANCH-PROT"
          present={repo.hasBranchProtection ?? false}
        />
        <HygieneFlag label="TESTS" present={repo.hasTestDir} />
        {repo.archived ? (
          <span
            data-field="archived-flag"
            style={{
              color: "var(--color-src-discounted)",
              border: "1px solid currentColor",
              padding: "2px 6px",
              textTransform: "uppercase",
            }}
          >
            archived
          </span>
        ) : null}
      </div>
    </article>
  );
}

function HygieneFlag({
  label,
  present,
}: {
  readonly label: string;
  readonly present: boolean;
}): React.JSX.Element {
  return (
    <span
      data-hygiene={label}
      data-present={present}
      style={{
        color: present ? "var(--color-src-verified)" : "var(--color-src-missing)",
        border: present
          ? "1px solid currentColor"
          : "1px dashed var(--color-border-strong)",
        padding: "2px 6px",
        textTransform: "uppercase",
      }}
    >
      {present ? "✓ " : "· "}
      {label}
    </span>
  );
}

export function GitHubDrawer({
  github,
  initialOpen = false,
}: GitHubDrawerProps): React.JSX.Element {
  // Empty / error states first — the drawer must communicate "absent"
  // honestly per EPIC §10.5 + GATE-14.
  if (github.kind === "absent") {
    return (
      <details
        data-section="github-drawer"
        data-state="absent"
        open={initialOpen}
        style={{
          border: "1px dashed var(--color-border-strong)",
          background: "var(--color-raised)",
          padding: "14px 20px",
        }}
      >
        <summary
          className="font-mono uppercase text-t3"
          style={{
            fontSize: "10px",
            letterSpacing: "0.18em",
            cursor: "pointer",
          }}
        >
          GitHub · absent
        </summary>
        <p
          className="mt-3 font-mono text-t3"
          style={{
            fontSize: "11px",
            letterSpacing: "0.04em",
            lineHeight: 1.5,
          }}
        >
          No GitHub claim in subject manifest, or PAT not configured.
          GitHub-derived score components return null_p1 from the engine.
        </p>
      </details>
    );
  }

  if (github.kind === "error") {
    return (
      <details
        data-section="github-drawer"
        data-state="error"
        open={initialOpen}
        style={{
          border: "1px solid var(--color-o-block)",
          background: "var(--color-raised)",
          padding: "14px 20px",
        }}
      >
        <summary
          className="font-mono uppercase"
          style={{
            color: "var(--color-o-block)",
            fontSize: "10px",
            letterSpacing: "0.18em",
            cursor: "pointer",
          }}
        >
          GitHub · invalid · {github.reason}
        </summary>
        <p
          className="mt-3 font-mono text-t2"
          style={{
            fontSize: "11px",
            letterSpacing: "0.04em",
            lineHeight: 1.5,
          }}
        >
          {github.message}
        </p>
      </details>
    );
  }

  const { value } = github;
  const repos = value.repos.slice(0, REPO_CAP);

  return (
    <details
      data-section="github-drawer"
      data-state="ok"
      data-owner={value.owner}
      open={initialOpen}
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-raised)",
      }}
    >
      <summary
        data-block="drawer-trigger"
        className="flex flex-wrap items-baseline justify-between gap-3"
        style={{
          padding: "14px 20px",
          cursor: "pointer",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span
          className="inline-flex items-center gap-3 font-mono text-t1"
          style={{
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <HeartbeatDot
            state="ok"
            label={`live · ${repos.length} repo${repos.length === 1 ? "" : "s"}`}
          />
          GitHub · {value.owner}
        </span>
        <span
          className="font-mono text-t3"
          style={{
            fontSize: "10px",
            letterSpacing: "0.06em",
          }}
        >
          {value.user
            ? `${value.user.publicRepos} public · ${value.user.followers} followers`
            : "user meta absent"}
        </span>
      </summary>

      <div
        data-block="repo-grid"
        className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
        style={{
          padding: "20px",
        }}
      >
        {repos.length === 0 ? (
          <p
            data-field="no-repos"
            className="font-mono text-t3"
            style={{ fontSize: "11px", letterSpacing: "0.04em" }}
          >
            No repos returned (account may be brand-new or all archived).
          </p>
        ) : (
          repos.map((repo) => <RepoCard key={repo.fullName} repo={repo} />)
        )}
      </div>

      <p
        data-field="drawer-meta"
        className="font-mono text-t3"
        style={{
          padding: "12px 20px 16px",
          fontSize: "10px",
          letterSpacing: "0.04em",
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          background: "var(--color-bg)",
        }}
      >
        Top {repos.length} of {value.repos.length} repos by recent activity.
        GitHub source is unverified — every signal counts × 0.6 until cross-
        signed (EPIC §9 trust-discount mechanic).
      </p>
    </details>
  );
}
