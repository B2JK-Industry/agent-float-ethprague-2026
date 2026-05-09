import type { SubjectManifest } from '@upgrade-siren/shared';

// Raw text-record reads for the agent-bench:* namespace. All three records are
// optional from the protocol's POV: a subject without `bench_manifest` falls
// through to the public-read path (US-112).
export interface AgentBenchRecordSet {
  readonly benchManifestRaw: string | null;
  readonly owner: string | null;
  readonly schema: string | null;
}

export interface AgentBenchResolutionFlags {
  readonly benchManifestPresent: boolean;
  readonly ownerPresent: boolean;
  readonly schemaPresent: boolean;
}

// Why a discriminated result instead of throwing: the caller (US-117 orchestrator,
// US-112 fallback) needs to distinguish "no opt-in manifest, fall back to
// public-read" from "manifest exists but is broken — surface to user". Each
// `kind` maps to a different downstream behaviour.
export type SubjectResolutionFailureReason =
  | 'invalid_name'
  | 'unsupported_chain'
  | 'rpc_error'
  | 'parse_error'
  | 'schema_error';

export interface SubjectResolutionOk {
  readonly kind: 'ok';
  readonly name: string;
  readonly chainId: number;
  readonly manifest: SubjectManifest;
  readonly records: AgentBenchRecordSet;
  readonly flags: AgentBenchResolutionFlags;
}

// `no_manifest` is success-shaped: the ENS name resolved but carries no
// agent-bench:bench_manifest record. Caller decides whether to fall back to
// public-read or surface as "not opted in".
export interface SubjectResolutionNoManifest {
  readonly kind: 'no_manifest';
  readonly name: string;
  readonly chainId: number;
  readonly records: AgentBenchRecordSet;
  readonly flags: AgentBenchResolutionFlags;
}

export interface SubjectResolutionError {
  readonly kind: 'error';
  readonly reason: SubjectResolutionFailureReason;
  readonly message: string;
  readonly cause?: unknown;
  readonly schemaErrors?: ReadonlyArray<SubjectSchemaError>;
}

export interface SubjectSchemaError {
  readonly instancePath: string;
  readonly message: string;
  readonly keyword?: string;
}

export type SubjectResolutionResult =
  | SubjectResolutionOk
  | SubjectResolutionNoManifest
  | SubjectResolutionError;
