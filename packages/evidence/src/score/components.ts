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

// Mean of binary signals across top-20 repos. v1 P0 exposes README>200
// chars + LICENSE; the P1 enrichers (SECURITY/dependabot/branch-prot)
// will fold into this same component once US-114b ships.
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

// On-chain recency: per EPIC §8.3 fallback rule, when no indexer key
// is configured (US-115b not active) we use `nonce / cap 1000` as the
// degraded signal. This PR ships in the no-indexer regime so the
// fallback path is the v1 default.
//
// Aggregation across chains: we sum nonce across `onchain` entries
// for the subject's primaryAddress and divide by 1000. This rewards
// multi-chain activity honestly without double-counting any single
// chain.
export function onchainRecency(evidence: MultiSourceEvidence): ComponentValue {
  const okOnchain = evidence.onchain.filter(
    (o): o is OnchainEntryEvidence & { kind: 'ok' } => o.kind === 'ok',
  );
  if (okOnchain.length === 0) return NULL_NO_DATA;
  let totalNonce = 0;
  for (const o of okOnchain) totalNonce += o.value.nonce;
  return {
    value: clamp01(totalNonce / 1000),
    status: 'computed',
    note: 'fallback: lifetime outbound nonce / cap 1000 (no indexer key)',
  };
}

// ENS recency: months since lastRecordUpdateBlock; min(months, 24)/24,
// then 1 - x. EPIC §10.3.
//
// `lastRecordUpdateBlock` is a block number, not a timestamp. We need
// to convert. v1 simplification: assume mainnet 12s block time. The
// score engine doesn't fetch on-chain itself (pure function). When the
// orchestrator wires a per-chain timestamp lookup later, this
// extractor reads from the EnsInternalSignals record without changing
// signature.
//
// For now, with only blockNumber available, we compare against the
// chain-head block at `nowSeconds` using 12s block time:
//   approxBlocksPerYear = (365 * 86400) / 12 = 2_628_000
// A more accurate path would carry `nowBlock` through the orchestrator
// — left as a follow-up; the v1 approximation is monotonic and well-
// documented in the breakdown note.
export function ensRecency(
  evidence: MultiSourceEvidence,
  nowSeconds: number,
): ComponentValue {
  const ens = evidence.ensInternal;
  if (ens.kind === 'absent') return NULL_NO_DATA;
  if (ens.kind !== 'ok') return NULL_NO_DATA;
  const last = ens.value.lastRecordUpdateBlock;
  if (last === null) return NULL_NO_DATA;
  // Approximate "now" block via the registration date as a more
  // reliable anchor when present; fall back to the unix epoch
  // approximation otherwise.
  const registrationSec = ens.value.registrationDate;
  if (registrationSec === null || registrationSec <= 0) return NULL_NO_DATA;
  // We can't derive the block of `nowSeconds` without an extra fetch.
  // Approximate: months between registration block and last-update
  // block, divided by mainnet-12s blocks-per-month. Use this as a
  // proxy for "how stale the record is now".
  // A subject with very recent registration AND recent record update
  // → 1.0. A subject registered long ago whose records were last
  // touched at registration → 0.0.
  const blocksPerMonth = SECONDS_PER_MONTH / 12;
  const blocksSinceRegistration =
    Math.floor((nowSeconds - registrationSec) / 12);
  if (blocksSinceRegistration <= 0) return { value: 1.0, status: 'computed' };
  // The number of blocks since the most recent TextChanged event.
  // Higher value = staler records.
  // We approximate "now block" = registrationBlock + blocksSinceRegistration,
  // and assume registrationBlock ≈ Number(last) - blocksSinceLastUpdate.
  // Without an explicit registrationBlock, we use:
  //   freshness = 1 - clamp01( (blocksSinceRegistration - lastBlockOffset) / blocksPer24Months )
  // Given we don't know lastBlockOffset directly, we approximate with
  // last block age relative to `nowBlock`:
  const nowBlock = BigInt(Math.floor(nowSeconds / 12));
  if (last >= nowBlock) return { value: 1.0, status: 'computed' };
  const ageBlocks = nowBlock - last;
  const ageMonths = Number(ageBlocks) / blocksPerMonth;
  const months = Math.min(ageMonths, 24);
  const freshness = 1 - months / 24;
  return {
    value: clamp01(freshness),
    status: 'computed',
    note: 'approx mainnet 12s block time',
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

// P1 components — return null until US-114b wires them.
export const ciPassRate = (_e: MultiSourceEvidence): ComponentValue => NULL_P1;
export const bugHygiene = (_e: MultiSourceEvidence): ComponentValue => NULL_P1;
export const releaseCadence = (_e: MultiSourceEvidence): ComponentValue => NULL_P1;

// Re-export so engine.ts can read evidence sub-types without
// re-importing from bench/types.
export type {
  EnsInternalEvidence,
  GithubEvidence,
  MultiSourceEvidence,
  OnchainEntryEvidence,
  SourcifyEntryEvidence,
};
