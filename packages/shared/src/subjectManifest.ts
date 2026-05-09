// Canonical Bench Mode subject manifest type. Mirrors
// schemas/agent-bench-manifest-v1.json. See EPIC_BENCH_MODE.md Section 7.
//
// The manifest lives in a single ENS text record `agent-bench:bench_manifest`
// (one JSON object) so related fields cannot desynchronize across multiple
// `setText` calls. Schema chaining via `previousManifestHash` mirrors the
// upgrade-manifest discipline.

import type { Address, Hex32 } from './sirenReport.js';

export const AGENT_BENCH_MANIFEST_SCHEMA_V1 = 'agent-bench-manifest@1';

export const SUBJECT_KINDS = ['ai-agent', 'human-team', 'project'] as const;
export type SubjectKind = (typeof SUBJECT_KINDS)[number];

// ENS text record keys used by Bench Mode. The `agent-bench:*` namespace is
// disjoint from `upgrade-siren:*` so a single ENS name can carry both modes
// without collision (see EPIC Section 7).
export const AGENT_BENCH_RECORD_KEYS = {
  benchManifest: 'agent-bench:bench_manifest',
  owner: 'agent-bench:owner',
  schema: 'agent-bench:schema',
} as const;

export type AgentBenchRecordKey = (typeof AGENT_BENCH_RECORD_KEYS)[keyof typeof AGENT_BENCH_RECORD_KEYS];

export interface SubjectSourcifyEntry {
  readonly chainId: number;
  readonly address: Address;
  readonly label: string;
}

export interface SubjectGithubSource {
  readonly owner: string;
  // v1 always false; the field exists so v2 cross-sign can flip it without
  // a schema migration (EPIC Section 7).
  readonly verified: boolean;
  readonly verificationGist: string | null;
}

export interface SubjectOnchainSource {
  readonly primaryAddress: Address;
  readonly claimedFirstTxHash: Hex32 | null;
}

export interface SubjectEnsInternalSource {
  readonly rootName: string;
}

export interface SubjectSources {
  readonly sourcify?: ReadonlyArray<SubjectSourcifyEntry>;
  readonly github?: SubjectGithubSource;
  readonly onchain?: SubjectOnchainSource;
  readonly ensInternal?: SubjectEnsInternalSource;
}

export interface SubjectManifest {
  readonly schema: typeof AGENT_BENCH_MANIFEST_SCHEMA_V1;
  readonly kind: SubjectKind;
  readonly sources: SubjectSources;
  readonly version: number;
  // First manifest in a chain has previousManifestHash=null; subsequent
  // manifests must keccak-link to the previous via the canonical-JSON hash
  // (same discipline as upgrade-manifest chaining).
  readonly previousManifestHash: Hex32 | null;
}
