// US-124 license + compiler-recency extraction. Pure summary over the
// SourcifyDeep shape (US-113). Per backlog row: data path only, not yet a
// score component in v1 — drawer + future relevance redesign consume.

import type { SourcifyDeep, SourcifyDeepLicense } from './deep.js';

export interface LicenseCount {
  readonly spdx: string;
  readonly count: number;
}

export interface CompilerSummary {
  readonly raw: string;
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly commit: string | null;
  // True when the parsed version carried a prerelease tag (rc, nightly,
  // alpha, beta, etc.) between the patch and the optional `+commit`
  // segment. Audit-round-7 P1 #11: prereleases are NOT release-quality
  // builds and must NOT pass the recency gate at face value, even when
  // their major.minor.patch numerically clears the threshold.
  readonly prerelease: string | null;
  // Computed against the recencyThreshold passed to summarizeLicenseAndCompiler
  // (default solc 0.8.20+ — the OpenZeppelin v5 baseline as of 2025/2026).
  // A prerelease tag forces `recent: false` regardless of the numeric
  // comparison.
  readonly recent: boolean;
}

export interface LicenseCompilerSummary {
  // Licenses ordered by descending count, ties broken alphabetically. Empty
  // when SourcifyDeep returned no `metadata.sources[].license` entries.
  readonly licenses: ReadonlyArray<LicenseCount>;
  // The most-frequent license (head of the sorted list) for one-shot
  // drawer rendering. null when no licenses were detected.
  readonly dominantLicense: string | null;
  // null when SourcifyDeep had no compilation block OR the compilerVersion
  // was unparseable.
  readonly compiler: CompilerSummary | null;
}

export interface CompilerRecencyThreshold {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

const DEFAULT_RECENCY_THRESHOLD: CompilerRecencyThreshold = {
  major: 0,
  minor: 8,
  patch: 20,
};

// audit-round-7 P1 #11: real solc release versions look like
// `0.8.24+commit.abcd` (no `-` segment). Prerelease versions inject a
// `-<tag>` segment between the patch and the optional `+commit` —
// `0.8.24-rc.1`, `0.8.24-nightly.20240101+commit.abcd`,
// `0.8.24-alpha.1+commit.abcd`. The previous regex stopped at end of
// patch and treated the `-tag` as garbage tail, so a nightly build
// passed the recency gate at the same level as the corresponding
// release. Capture the prerelease group explicitly so callers can
// downgrade `recent` when present.
const COMPILER_VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z][0-9A-Za-z.-]*))?(?:\+commit\.([0-9a-f]+))?/i;

function parseCompilerVersion(raw: string): CompilerSummary | null {
  const match = COMPILER_VERSION_RE.exec(raw.trim());
  if (!match) return null;
  const majorStr = match[1];
  const minorStr = match[2];
  const patchStr = match[3];
  if (majorStr === undefined || minorStr === undefined || patchStr === undefined) return null;
  const major = Number(majorStr);
  const minor = Number(minorStr);
  const patch = Number(patchStr);
  if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) return null;
  const prerelease = match[4] ?? null;
  const commit = match[5] ?? null;
  return { raw, major, minor, patch, prerelease, commit, recent: false };
}

function compareSemver(
  a: { major: number; minor: number; patch: number },
  b: { major: number; minor: number; patch: number },
): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function tallyLicenses(entries: ReadonlyArray<SourcifyDeepLicense>): ReadonlyArray<LicenseCount> {
  const counts = new Map<string, number>();
  for (const e of entries) {
    counts.set(e.license, (counts.get(e.license) ?? 0) + 1);
  }
  const out: LicenseCount[] = [];
  for (const [spdx, count] of counts) out.push({ spdx, count });
  out.sort((a, b) => (b.count - a.count) || a.spdx.localeCompare(b.spdx));
  return out;
}

// Summarises the data SourcifyDeep returns into a drawer-friendly shape.
// Compiler `recent` defaults to "solc >= 0.8.20" (OZ v5 baseline). Callers
// override via threshold for stricter / laxer policies.
export function summarizeLicenseAndCompiler(
  deep: SourcifyDeep,
  threshold: CompilerRecencyThreshold = DEFAULT_RECENCY_THRESHOLD,
): LicenseCompilerSummary {
  const licenses = tallyLicenses(deep.licenses ?? []);
  const dominantLicense = licenses.length > 0 ? licenses[0]!.spdx : null;
  let compiler: CompilerSummary | null = null;
  if (deep.compilation?.compilerVersion) {
    const parsed = parseCompilerVersion(deep.compilation.compilerVersion);
    if (parsed !== null) {
      // Numeric semver passes the threshold...
      const numericRecent = compareSemver(parsed, threshold) >= 0;
      // ...but a prerelease tag (rc, nightly, alpha, beta, dev, …)
      // forces recent: false regardless. A prerelease build is by
      // definition not the same as the corresponding release; treating
      // them equivalently was the audit-round-7 P1 #11 regression.
      const recent = numericRecent && parsed.prerelease === null;
      compiler = { ...parsed, recent };
    }
  }
  return { licenses, dominantLicense, compiler };
}
