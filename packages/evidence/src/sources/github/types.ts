// US-114 GitHub source fetcher P0. EPIC Section 8.2 P0 endpoint set
// (narrowed per review 2026-05-09 — CI runs / bug issues / releases /
// SECURITY / dependabot / branch-protection are US-114b).
//
// Components fed at P0:
//   - testPresence  : (count of repos with test*/tests/__tests__/spec dir) /
//                     top-20-repo count
//   - repoHygiene   : README + LICENSE only at P0 (P1 enriches with SECURITY,
//                     dependabot, branch-protection)
//   - githubRecency : computed from per-repo pushed_at — deferred to score
//                     engine (US-118)
//
// All GitHub-derived signals are unverified per Section 9 (trust discount
// 0.6 baked into score-engine math). The fetcher does NOT apply the
// discount; that is a score-engine responsibility.

export interface GithubUser {
  readonly login: string;
  readonly createdAt: string | null;
  readonly publicRepos: number;
  readonly followers: number;
}

export interface GithubRepoP0 {
  readonly name: string;
  readonly fullName: string;
  readonly createdAt: string | null;
  // Drives `relevance.githubRecency`. ISO datetime string from GitHub.
  readonly pushedAt: string | null;
  readonly archived: boolean;
  readonly defaultBranch: string | null;
  readonly license: string | null;
  readonly topics: ReadonlyArray<string>;
  // testPresence numerator: any of test/, tests/, __tests__/, spec/ exists
  // at the repo root.
  readonly hasTestDir: boolean;
  // repoHygiene component: README.md present AND content > 200 chars
  // (per EPIC Section 10.2 repoHygiene definition).
  readonly hasSubstantialReadme: boolean;
  readonly readmeBytes: number | null;
  // repoHygiene component: top-level LICENSE file present.
  readonly hasLicense: boolean;
  // Per-repo fetch outcome. Populated repos always have kind:'ok'; partial
  // failures surface here so the score engine can compute denominators
  // honestly.
  readonly fetchStatus: 'ok' | 'partial' | 'error';
  // Optional reason when fetchStatus !== 'ok'. Useful for the drawer.
  readonly errorReason?: string;

  // ----- US-114b P1 enrichment (optional) -----
  // Populated only when fetchGithubP1Enrichment runs. When absent (the
  // default — orchestrator hasn't invoked the P1 fetcher yet), score
  // components return null_p1 per launch-prompt non-negotiable. Once any
  // of these is present per-repo, the corresponding component flips to
  // computed.

  // ciPassRate signal: success/total over the last 50 workflow runs.
  // null when API errored OR no workflow runs returned (fresh repo).
  readonly ciRuns?: { readonly successful: number; readonly total: number } | null;
  // bugHygiene signal: closed/total over `labels=bug&state=all` issues.
  // 1.0 denominator-zero behaviour is enforced in the score component, not
  // here.
  readonly bugIssues?: { readonly closed: number; readonly total: number } | null;
  // releaseCadence signal: count of releases in last 12 months.
  readonly releasesLast12m?: number | null;
  // repoHygiene P1 enrichments. Each is a binary signal that joins the
  // existing README + LICENSE pair in the score engine's hygiene mean.
  readonly hasSecurity?: boolean;
  readonly hasDependabot?: boolean;
  // 404 from /branches/{default}/protection (non-admin tokens) → false,
  // not error — per EPIC §10.2 repoHygiene table.
  readonly hasBranchProtection?: boolean;
  // Per-enrichment fetch status; failures degrade gracefully.
  readonly p1FetchStatus?: 'ok' | 'partial' | 'error';
  readonly p1ErrorReason?: string;
}

export interface GithubP0Signals {
  readonly owner: string;
  readonly user: GithubUser | null;
  readonly repos: ReadonlyArray<GithubRepoP0>;
}

export type GithubFailureReason =
  | 'missing_pat'
  | 'invalid_owner'
  | 'rate_limited'
  | 'server_error'
  | 'malformed_response'
  | 'network_error'
  | 'not_found';

export interface GithubP0Ok {
  readonly kind: 'ok';
  readonly value: GithubP0Signals;
}

export interface GithubP0Error {
  readonly kind: 'error';
  readonly reason: GithubFailureReason;
  readonly message: string;
  readonly httpStatus?: number;
  readonly cause?: unknown;
}

export type GithubP0Result = GithubP0Ok | GithubP0Error;
