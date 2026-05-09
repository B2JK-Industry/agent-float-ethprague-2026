import type { PublicClient } from 'viem';

export type RecordKey =
  | 'addr.eth'
  | 'com.github'
  | 'description'
  | 'url'
  | 'ens-registration';

export interface ResolvedRecord {
  key: RecordKey;
  ensName: string;
  raw: string | null;
  resolvedAtBlock: number;
  resolvedAtMs: number;
}

export interface EngineLogger {
  debug(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
}

export interface SharedFetchResponse {
  ok: boolean;
  status: number;
  headers: Headers;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
}

export interface SharedFetchInit {
  method?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface SharedFetch {
  (url: string, init?: SharedFetchInit): Promise<SharedFetchResponse>;
}

export interface TtlCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
}

export interface EngineContext {
  rpc: { mainnet: PublicClient; sepolia: PublicClient };
  fetch: SharedFetch;
  cache: TtlCache;
  logger: EngineLogger;
  signal: AbortSignal;
  peerResults?: Map<RecordKey, EvaluatorResult>;
}

export interface SignalEntry {
  name: string;
  value: number;
  weight: number;
  raw?: unknown;
}

export interface AntiSignalEntry {
  name: string;
  penalty: number;
  reason: string;
}

export interface Evidence {
  label: string;
  value: string;
  source?: string;
  link?: string;
}

export type EvaluatorConfidence = 'complete' | 'partial' | 'degraded';

export interface EvaluatorResult {
  recordKey: RecordKey;
  exists: boolean;
  validity: 0 | 1;
  liveness: 0 | 1;

  seniority: number;
  relevance: number;
  trust: number;
  weight: number;

  signals: {
    seniorityBreakdown: SignalEntry[];
    relevanceBreakdown: SignalEntry[];
    antiSignals: AntiSignalEntry[];
  };

  evidence: Evidence[];
  confidence: EvaluatorConfidence;
  durationMs: number;
  cacheHit: boolean;
  errors: string[];
}

export interface EngineParams {
  weight: number;
  trustFloor: number;
  trustCeiling: number;
  timeoutMs: number;
  thresholds: Record<string, number>;
}

export interface RecordEngine {
  key: RecordKey;
  defaultParams: EngineParams;
  evaluate(
    record: ResolvedRecord,
    ctx: EngineContext,
    params: EngineParams,
  ): Promise<EvaluatorResult>;
}

export const RECORD_KEYS: readonly RecordKey[] = [
  'addr.eth',
  'com.github',
  'description',
  'url',
  'ens-registration',
] as const;

export const EMPTY_RESULT = (
  key: RecordKey,
  weight: number,
  durationMs: number,
  errors: string[] = [],
): EvaluatorResult => ({
  recordKey: key,
  exists: false,
  validity: 0,
  liveness: 0,
  seniority: 0,
  relevance: 0,
  trust: 0,
  weight,
  signals: { seniorityBreakdown: [], relevanceBreakdown: [], antiSignals: [] },
  evidence: [],
  confidence: 'complete',
  durationMs,
  cacheHit: false,
  errors,
});
