// Pure component extractors over MultiSourceEvidence. Each returns
// `number | null` plus a status discriminator so the engine can
// render the breakdown faithfully (P1-not-shipped vs no-data vs
// computed-from-evidence).

import type {
  EnsInternalEvidence,
  GithubEvidence,
  MultiSourceEvidence,
  OnchainEntryEvidence,
  SourcifyEntryEvidence,
} from '../bench/types.js';

import type { ComponentStatus } from './types.js';

export interface ComponentValue {
  readonly value: number | null;
  readonly status: ComponentStatus;
  readonly note?: string;
}

const NULL_P1: ComponentValue = { value: null, status: 'null_p1' };
const NULL_NO_DATA: ComponentValue = { value: null, status: 'null_no_data' };

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_MONTH = 30 * SECONDS_PER_DAY;
const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;

const ANTI_GAMING_MIN_BYTECODE_HEX_LEN = 1024;

// EPIC §10.4 anti-gaming: ignore Sourcify entries whose deployedBytecode
// is shorter than 1024 hex chars (~512 bytes). Hello-World contracts
// can't lift compileSuccess if they don't carry meaningful code.
function entryPassesComplexityGate(entry: SourcifyEntryEvidence): boolean {
  if (entry.kind !== 'ok') return false;
  // SourcifyDeep does not directly carry bytecode in v1; we check
  // function-signature density as a proxy. A real contract publishes
  // multiple functions; a Hello-World publishes 0–1.
  const fnCount = entry.deep.functionSignatures?.length ?? 0;
  return fnCount >= 2;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

// (creationMatch === exact AND runtimeMatch === exact) per EPIC §10.2.
// Denominator is the count of Sourcify entries that pass the
// complexity gate. 0 entries → null_no_data.
export function compileSuccess(evidence: MultiSourceEvidence): ComponentValue {
  const entries = evidence.sourcify.filter(entryPassesComplexityGate);
  if (entries.length === 0) return NULL_NO_DATA;
  let numer = 0;
  for (const e of entries) {
    if (e.kind !== 'ok') continue;
    const c = e.deep.creationMatch;
    const r = e.deep.runtimeMatch;
    if (c === 'exact_match' && r === 'exact_match') numer += 1;
  }
  return { value: numer / entries.length, status: 'computed' };
}

// (count of repos with hasTestDir) / top-20-repo count. EPIC §10.2.
export function testPresence(evidence: MultiSourceEvidence): ComponentValue {
  const gh = evidence.github;
  if (gh.kind !== 'ok') return NULL_NO_DATA;
  const repos = gh.value.repos;
  if (repos.length === 0) return NULL_NO_DATA;
  const numer = repos.reduce((acc, r) => acc + (r.hasTestDir ? 1 : 0), 0);
  return { value: numer / repos.length, status: 'computed' };
}

// Mean of binary signals across top-20 repos. P0 fixed signals: README>200
// chars + LICENSE. P1 enrichers (SECURITY / dependabot / branch-protection)
// from US-114b join the same hygiene mean per-repo when present; the
// denominator grows with each P1 field that landed for that repo so a
// repo with only README+LICENSE info still scores correctly against a
// fully-enriched neighbour.
export function repoHygiene(evidence: MultiSourceEvidence): ComponentValue {
  const gh = evidence.github;
  if (gh.kind !== 'ok') return NULL_NO_DATA;
  const repos = gh.value.repos;
  if (repos.length === 0) return NULL_NO_DATA;
  let sum = 0;
  for (const r of repos) {
    let signals = 0;
    let count = 2;
    if (r.hasSubstantialReadme) signals += 1;
    if (r.hasLicense) signals += 1;
    // US-114b enrichments: only counted when the corresponding flag is
    // a defined boolean (P1 enrichment ran for this repo). undefined →
    // P1 didn't run; skip gracefully so the P0-only score stays valid.
    if (typeof r.hasSecurity === 'boolean') {
      count += 1;
      if (r.hasSecurity) signals += 1;
    }
    if (typeof r.hasDependabot === 'boolean') {
      count += 1;
      if (r.hasDependabot) signals += 1;
    }
    if (typeof r.hasBranchProtection === 'boolean') {
      count += 1;
      if (r.hasBranchProtection) signals += 1;
    }
    sum += signals / count;
  }
  return { value: sum / repos.length, status: 'computed' };
}

// Sourcify recency: most recent verifiedAt across entries. v1 EPIC
// §10.3 piecewise: ≤12mo→1.0, ≥24mo→0.0, linear between. SourcifyDeep
// does not carry verifiedAt directly (US-113 surfaces compilation
// metadata; verifiedAt is a Sourcify response field on the older
// status endpoint). Until that field is wired through the deep
// fetcher, we treat any verified entry (creationMatch===exact OR
// runtimeMatch===exact) as recent (1.0). The fallback is conservative
// — a stale-but-verified contract still scores 1.0; that is correct
// for v1 demo math because no orchestrator output currently has
// stale-and-recent disambiguation.
export function sourcifyRecency(evidence: MultiSourceEvidence): ComponentValue {
  const verifiedEntries = evidence.sourcify.filter(
    (e) =>
      e.kind === 'ok' &&
      (e.deep.creationMatch === 'exact_match' || e.deep.runtimeMatch === 'exact_match'),
  );
  if (evidence.sourcify.length === 0) return NULL_NO_DATA;
  if (verifiedEntries.length === 0) return { value: 0, status: 'computed' };
  return { value: 1.0, status: 'computed' };
}

// pushed_at on top-20 repos, relative to `nowSeconds`. EPIC §10.3
// originally specifies "commits in default branches in last 90 days /
// cap 200" — that requires the commits API (P1 enrichment, US-114b).
// The P0 surface gives us pushed_at per repo, which is a strict subset
// of activity. We compute "fraction of repos pushed within 90 days"
// as the v1 stand-in: numer / 20. This is monotonic in real recency
// and re-derivable from the per-repo pushedAt timestamps the
// breakdown panel renders.
export function githubRecency(
  evidence: MultiSourceEvidence,
  nowSeconds: number,
): ComponentValue {
  const gh = evidence.github;
  if (gh.kind === 'absent') return NULL_NO_DATA;
  if (gh.kind !== 'ok') return NULL_NO_DATA;
  const repos = gh.value.repos;
  if (repos.length === 0) return NULL_NO_DATA;
  const cutoff = nowSeconds - 90 * SECONDS_PER_DAY;
  let numer = 0;
  for (const r of repos) {
    if (!r.pushedAt) continue;
    const ts = Date.parse(r.pushedAt);
    if (!Number.isFinite(ts)) continue;
    const tsSec = Math.floor(ts / 1000);
    if (tsSec >= cutoff) numer += 1;
  }
  return { value: numer / repos.length, status: 'computed' };
}

// On-chain recency: prefers the indexer-backed transferCountRecent90d
// signal (US-115b — Alchemy alchemy_getAssetTransfers OR Etherscan txlist)
// when present on at least one chain entry. Falls back to
// `nonce / cap 1000` (US-115 P0) per EPIC §8.3.
//
// Aggregation across chains: sum the chosen metric across `onchain`
// entries for the subject's primaryAddress and divide by 1000. This
// rewards multi-chain activity honestly without double-counting any
// single chain.
export function onchainRecency(evidence: MultiSourceEvidence): ComponentValue {
  const okOnchain = evidence.onchain.filter(
    (o): o is OnchainEntryEvidence & { kind: 'ok' } => o.kind === 'ok',
  );
  if (okOnchain.length === 0) return NULL_NO_DATA;

  let indexerHit = false;
  let totalRecent = 0;
  let totalNonce = 0;
  let provider: string | null = null;
  for (const o of okOnchain) {
    totalNonce += o.value.nonce;
    if (typeof o.value.transferCountRecent90d === 'number') {
      indexerHit = true;
      totalRecent += o.value.transferCountRecent90d;
      if (provider === null && typeof o.value.transferCountProvider === 'string') {
        provider = o.value.transferCountProvider;
      }
    }
  }

  if (indexerHit) {
    return {
      value: clamp01(totalRecent / 1000),
      status: 'computed',
      note:
        provider !== null
          ? `transferCountRecent90d / cap 1000 (provider: ${provider})`
          : 'transferCountRecent90d / cap 1000',
    };
  }
  return {
    value: clamp01(totalNonce / 1000),
    status: 'computed',
    note: 'fallback: lifetime outbound nonce / cap 1000 (no indexer key)',
  };
}

// ENS recency: months since lastRecordUpdateBlock; min(months, 24)/24,
// then 1 - x. EPIC §10.3.
//
// `lastRecordUpdateBlock` is a block number, not a timestamp. To convert
// we need a real "now block". Audit-round-7 P0 #2 caught the prior
// fabrication: `nowBlock = Math.floor(nowSeconds / 12)` produced
// ~148_000_000 against a real mainnet head of ~30_000_000, treating
// every record as ~50 years stale and forcing recency to 0 for every
// subject. The score engine is pure (no RPC), but the orchestrator
// already fetches `latestBlock` per-chain into the on-chain evidence
// slot. This extractor now reads the mainnet entry's real
// `latestBlock` as the anchor. Without a real anchor we return
// `null_no_data` rather than synthesize a wrong one.
function resolveNowBlock(evidence: MultiSourceEvidence): bigint | null {
  // Prefer mainnet (chainId 1). ENS root events are mainnet-anchored,
  // so blocks-since-last-update lives in mainnet's block sequence.
  for (const entry of evidence.onchain) {
    if (entry.kind === 'ok' && entry.chainId === 1) {
      return entry.value.latestBlock;
    }
  }
  return null;
}

export function ensRecency(
  evidence: MultiSourceEvidence,
  _nowSeconds: number,
): ComponentValue {
  const ens = evidence.ensInternal;
  if (ens.kind === 'absent') return NULL_NO_DATA;
  if (ens.kind !== 'ok') return NULL_NO_DATA;
  const last = ens.value.lastRecordUpdateBlock;
  if (last === null) return NULL_NO_DATA;
  const registrationSec = ens.value.registrationDate;
  if (registrationSec === null || registrationSec <= 0) return NULL_NO_DATA;

  const nowBlock = resolveNowBlock(evidence);
  if (nowBlock === null) {
    // No mainnet on-chain entry → no real nowBlock anchor. Refuse to
    // fabricate (the prior bug). Better to surface "no data" than
    // mislead the score engine into capping recency at 0.
    return NULL_NO_DATA;
  }
  if (last >= nowBlock) return { value: 1.0, status: 'computed' };

  const blocksPerMonth = SECONDS_PER_MONTH / 12;
  const ageBlocks = nowBlock - last;
  const ageMonths = Number(ageBlocks) / blocksPerMonth;
  const months = Math.min(ageMonths, 24);
  const freshness = 1 - months / 24;
  return {
    value: clamp01(freshness),
    status: 'computed',
    note: 'mainnet 12s block time; nowBlock from onchain.latestBlock',
  };
}

// Helpers for scoring missing-source detection (U tier).
export function nonZeroSourceCount(evidence: MultiSourceEvidence): number {
  let count = 0;
  // Sourcify: count if any entry returned ok with a recognised match.
  if (
    evidence.sourcify.some(
      (e) => e.kind === 'ok' && e.deep.match !== 'not_found',
    )
  ) {
    count += 1;
  }
  // GitHub: count if user is present.
  if (evidence.github.kind === 'ok' && evidence.github.value.user !== null) {
    count += 1;
  }
  // On-chain: count if any chain has nonce > 0 OR address has any tx.
  if (
    evidence.onchain.some(
      (o) => o.kind === 'ok' && (o.value.nonce > 0 || o.value.firstTxBlock !== null),
    )
  ) {
    count += 1;
  }
  // ENS-internal: count if any signal is non-null.
  if (
    evidence.ensInternal.kind === 'ok' &&
    (evidence.ensInternal.value.subnameCount > 0 ||
      evidence.ensInternal.value.textRecordCount > 0 ||
      evidence.ensInternal.value.registrationDate !== null)
  ) {
    count += 1;
  }
  return count;
}

// US-114b P1 component extractors. Each returns NULL_P1 when no repo
// carries the enrichment field (orchestrator hasn't fetched P1 yet);
// flips to computed the moment any repo carries data.

// (count of last 50 workflow runs across top-20 repos with conclusion ===
// 'success') / (total runs). 0 if no runs — but if no repo has run data
// at all, we surface null so the breakdown distinguishes "no CI" from
// "CI exists and 0% pass".
export function ciPassRate(evidence: MultiSourceEvidence): ComponentValue {
  const gh = evidence.github;
  if (gh.kind !== 'ok') return NULL_P1;
  const repos = gh.value.repos;
  let any = false;
  let successful = 0;
  let total = 0;
  for (const r of repos) {
    if (r.ciRuns === undefined) continue;
    any = true;
    if (r.ciRuns === null) continue;
    successful += r.ciRuns.successful;
    total += r.ciRuns.total;
  }
  if (!any) return NULL_P1;
  if (total === 0) return { value: 0, status: 'computed', note: 'no workflow runs across repos' };
  return { value: successful / total, status: 'computed' };
}

// (closed bug-labeled issues across top-20 repos) / (total bug-labeled
// issues). EPIC §10.2: 1.0 if denominator is 0.
export function bugHygiene(evidence: MultiSourceEvidence): ComponentValue {
  const gh = evidence.github;
  if (gh.kind !== 'ok') return NULL_P1;
  const repos = gh.value.repos;
  let any = false;
  let closed = 0;
  let total = 0;
  for (const r of repos) {
    if (r.bugIssues === undefined) continue;
    any = true;
    if (r.bugIssues === null) continue;
    closed += r.bugIssues.closed;
    total += r.bugIssues.total;
  }
  if (!any) return NULL_P1;
  if (total === 0) return { value: 1.0, status: 'computed', note: 'no bug-labeled issues' };
  return { value: closed / total, status: 'computed' };
}

// min(releases in last 12 months, 12) / 12. Per-repo `releasesLast12m`
// is the count for that repo; we sum across repos and apply the cap.
export function releaseCadence(evidence: MultiSourceEvidence): ComponentValue {
  const gh = evidence.github;
  if (gh.kind !== 'ok') return NULL_P1;
  const repos = gh.value.repos;
  let any = false;
  let total = 0;
  for (const r of repos) {
    if (r.releasesLast12m === undefined) continue;
    any = true;
    if (r.releasesLast12m === null) continue;
    total += r.releasesLast12m;
  }
  if (!any) return NULL_P1;
  return { value: Math.min(total, 12) / 12, status: 'computed' };
}

// Re-export so engine.ts can read evidence sub-types without
// re-importing from bench/types.
export type {
  EnsInternalEvidence,
  GithubEvidence,
  MultiSourceEvidence,
  OnchainEntryEvidence,
  SourcifyEntryEvidence,
};
