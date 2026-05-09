// US-117 Multi-source orchestrator output shape. The score engine (US-118)
// is pure on this type; everything the engine needs to score a subject
// must end up here, including failures.

import type {
  Address,
  SubjectKind,
  SubjectManifest,
} from '@upgrade-siren/shared';

import type { SourcifyDeep } from '../sourcify/deep.js';
import type { LicenseCompilerSummary } from '../sourcify/licenseCompiler.js';
import type { CrossChainDiscoveryResult } from '../sourcify/crossChainDiscovery.js';

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
  // Aggregate of all top-level failures the orchestrator surfaces. Score
  // engine reads this for "missing source" decisions.
  readonly failures: ReadonlyArray<SourceFailure>;
}
