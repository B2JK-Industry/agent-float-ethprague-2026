// US-117 Multi-source orchestrator output shape. The score engine (US-118)
// is pure on this type; everything the engine needs to score a subject
// must end up here, including failures.

import type {
  Address,
  SubjectGithubSource,
  SubjectKind,
  SubjectManifest,
} from '@upgrade-siren/shared';

import type { SourcifyDeep } from '../sourcify/deep.js';
import type { LicenseCompilerSummary } from '../sourcify/licenseCompiler.js';
import type { CrossChainDiscoveryResult } from '../sourcify/crossChainDiscovery.js';
import type { EtherscanFallbackResult } from '../sources/etherscan/sourceCode.js';

// US-123 source-pattern detection ships separately. Until that PR merges,
// orchestrator emits `patterns: []` for every Sourcify entry. The shape is
// kept here so the score engine and drawer can consume it once US-123 is
// wired in. `pattern` literals come from the EPIC drawer-badge list:
// pausable | ownable | uups | access_control | reentrancy_guard | initializable.
export interface SourcePatternMatch {
  readonly pattern: string;
  readonly label: string;
  readonly evidence: ReadonlyArray<string>;
  readonly openzeppelin: boolean;
}
import type { EnsInternalSignals } from '../sources/ens-internal/types.js';
import type { GithubP0Signals } from '../sources/github/types.js';
import type { OnchainActivity } from '../sources/onchain/types.js';

// Subject resolution mode. `manifest` carries the agent-bench-manifest@1
// payload; `public-read` carries the inferred sources from US-112 fallback.
// Score engine caps tier at A in `public-read` mode regardless of axis sums.
export type SubjectMode = 'manifest' | 'public-read';

export interface SubjectIdentity {
  readonly name: string;
  readonly chainId: number;
  readonly mode: SubjectMode;
  // Always present for `manifest`; null for `public-read` when the ENS
  // name has no addr() record.
  readonly primaryAddress: Address | null;
  // Subject `kind` — taken from manifest when present; null in
  // `public-read` mode (the score engine treats null as "project").
  readonly kind: SubjectKind | null;
  // Full manifest reference for traceability. null when in public-read.
  readonly manifest: SubjectManifest | null;
  // C-13 (audit-round-8): public-read fallback now reads standard ENS
  // text records in parallel with addr(). When `com.github` is present
  // we synthesise a SubjectGithubSource (verified=false) so the
  // GitHub source pipeline runs against the inferred owner. Always
  // null in `manifest` mode — the manifest is authoritative there.
  readonly inferredGithub?: SubjectGithubSource | null;
  // The full set of text records read during public-read inference.
  // Surfaced for drawer evidence display ("ENS announced X = Y").
  // Empty record in manifest mode.
  readonly inferredTexts?: Readonly<Record<string, string>>;
  // Refactor 2026-05-10: when subject ENS has sparse records but addr
  // resolves to a wallet whose primary name (reverse-record) carries
  // richer profile data, the public-read resolver follows the primary
  // and merges its records. Set to the primary name when the merge
  // happened. UI surfaces this as "via primary name X" badge.
  readonly primaryNameUsed?: string | null;
  // contentHash decoded as URL when present (ipfs://, swarm://, etc).
  // Surfaced for drawer rendering — score-neutral in v1.
  readonly contentHash?: string | null;
}

// Per-source failure shape. Reason is a free-form string from the
// underlying fetcher (each source has its own discriminated union — we
// flatten to a string here so the score engine doesn't need to know
// every fetcher's vocabulary).
export interface SourceFailure {
  readonly kind: 'error';
  readonly source:
    | 'sourcify'
    | 'github'
    | 'onchain'
    | 'ens-internal'
    | 'cross-chain'
    | 'subject-resolve';
  readonly reason: string;
  readonly message: string;
  // When the failure is per-Sourcify-entry, identifies which entry.
  readonly sourcifyChainId?: number;
  readonly sourcifyAddress?: Address;
  // When the failure is per-on-chain-fetch, identifies which chain.
  readonly chainId?: number;
}

// Per-Sourcify-entry evidence. One of these per item in the manifest's
// (or inferred) sourcify[] list.
export interface SourcifyEntryOk {
  readonly kind: 'ok';
  readonly chainId: number;
  readonly address: Address;
  readonly label: string;
  readonly deep: SourcifyDeep;
  readonly patterns: ReadonlyArray<SourcePatternMatch>;
  readonly licenseCompiler: LicenseCompilerSummary;
}

export interface SourcifyEntryError {
  readonly kind: 'error';
  readonly chainId: number;
  readonly address: Address;
  readonly label: string;
  readonly reason: string;
  readonly message: string;
}

export type SourcifyEntryEvidence = SourcifyEntryOk | SourcifyEntryError;

// Per-chain on-chain activity record. The orchestrator fans out one
// fetchOnchainActivity per chain found in the manifest's sourcify[]
// (deduped by chainId), plus mainnet + sepolia by default.
export interface OnchainEntryOk {
  readonly kind: 'ok';
  readonly chainId: number;
  readonly value: OnchainActivity;
}

export interface OnchainEntryError {
  readonly kind: 'error';
  readonly chainId: number;
  readonly reason: string;
  readonly message: string;
}

export type OnchainEntryEvidence = OnchainEntryOk | OnchainEntryError;

export type GithubEvidence =
  | { readonly kind: 'ok'; readonly value: GithubP0Signals }
  | { readonly kind: 'error'; readonly reason: string; readonly message: string }
  | { readonly kind: 'absent' };

export type EnsInternalEvidence =
  | { readonly kind: 'ok'; readonly value: EnsInternalSignals }
  | { readonly kind: 'error'; readonly reason: string; readonly message: string }
  | { readonly kind: 'absent' };

export interface MultiSourceEvidence {
  readonly subject: SubjectIdentity;
  readonly sourcify: ReadonlyArray<SourcifyEntryEvidence>;
  readonly github: GithubEvidence;
  // One record per chain. `manifest`-mode populates from manifest entry
  // chainIds + primaryAddress's mainnet+sepolia base set.
  readonly onchain: ReadonlyArray<OnchainEntryEvidence>;
  readonly ensInternal: EnsInternalEvidence;
  readonly crossChain: CrossChainDiscoveryResult | null;
  // Refactor 2026-05-10: Etherscan source-code fallback. When Sourcify
  // all-chains returns 0 verified entries for the subject's address but
  // the address has on-chain bytecode, the orchestrator queries
  // Etherscan v2 across major chains (mainnet, Sepolia, Optimism, Base,
  // Arbitrum, Polygon). Catches contracts verified on Etherscan but
  // not on Sourcify (Gitcoin, OZ, most DAO governors).
  // Empty array (or omitted) when not invoked or no contract code present.
  readonly etherscanFallback?: ReadonlyArray<EtherscanFallbackResult>;
  // Aggregate of all top-level failures the orchestrator surfaces. Score
  // engine reads this for "missing source" decisions.
  readonly failures: ReadonlyArray<SourceFailure>;
}
