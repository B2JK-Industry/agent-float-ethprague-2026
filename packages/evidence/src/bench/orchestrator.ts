import type { PublicClient } from 'viem';

import type {
  Address,
  SubjectKind,
  SubjectManifest,
  SubjectSourcifyEntry,
} from '@upgrade-siren/shared';

import {
  resolveSubjectFromEns,
  type ResolveSubjectOptions,
} from '../subject/resolver.js';
import {
  inferSubjectFromPublicRead,
  type InferSubjectFromPublicReadOptions,
} from '../subject/publicRead.js';
import {
  fetchSourcifyDeep,
  type FetchSourcifyDeepOptions,
} from '../sourcify/deep.js';
import { summarizeLicenseAndCompiler } from '../sourcify/licenseCompiler.js';
import {
  discoverCrossChainPresence,
  type DiscoverCrossChainOptions,
} from '../sourcify/crossChainDiscovery.js';
import {
  fetchOnchainActivity,
  type FetchOnchainActivityOptions,
} from '../sources/onchain/activity.js';
import {
  fetchEnsInternalSignals,
  type FetchEnsInternalSignalsOptions,
} from '../sources/ens-internal/fetch.js';
import {
  fetchGithubP0Source,
  type FetchGithubP0SourceOptions,
} from '../sources/github/fetch.js';
import { fetchSourcifyMetadata } from '../sourcify/metadata.js';
import type { FetchLike } from '../sourcify/types.js';

// fetchSourcifyMetadata's options interface isn't exported; inline the
// caller-facing subset so OrchestrateSubjectOptions stays expressive.
type FetchSourcifyMetadataOptions = Parameters<typeof fetchSourcifyMetadata>[2];
import type {
  EnsInternalEvidence,
  GithubEvidence,
  MultiSourceEvidence,
  OnchainEntryEvidence,
  SourceFailure,
  SourcifyEntryEvidence,
  SubjectIdentity,
} from './types.js';

// ─── Per-source timeout budgets (US-117 follow-up, Stream B carry-rule v2 §2B) ───
//
// PR #137 added a 12s page-level deadline. That works for fast subjects but
// drops "evaluation failed" on /b/vitalik.eth-style public-read subjects
// where one slow source (ENS subgraph cold start, GitHub rate-limit cool-
// down, Sourcify all-chains scan) burns the whole budget. Per-source
// budgets let the orchestrator return a partial verdict with `kind:'error'
// reason:'source_timeout'` on the slow tile while delivering the fast
// tiles to the renderer.
//
// Budgets are belt-and-braces under the 12s page cap — page-level race
// stays in apps/web. These values cap individual source contribution to
// the page budget.
export const DEFAULT_PER_SOURCE_BUDGETS_MS = {
  sourcifyDeep: 4_000,
  sourcifyAllChains: 6_000,
  github: 6_000,
  onchain: 4_000,
  // Sepolia subgraph response variance 1.5-6.7s (gateway.thegraph.com),
  // mainnet ~1-2s. 8s budget covers worst-case Sepolia query without
  // breaching the 12s page cap when other sources also fire in parallel.
  ensInternal: 8_000,
  crossChain: 4_000,
} as const;

export type PerSourceBudgetKey = keyof typeof DEFAULT_PER_SOURCE_BUDGETS_MS;
export type PerSourceBudgetsMs = { readonly [K in PerSourceBudgetKey]: number };

// Internal sentinel error so the orchestrator can distinguish "fetch
// returned typed error" from "we aborted past the per-source budget".
class SourceTimeoutError extends Error {
  constructor(
    readonly label: string,
    readonly ms: number,
  ) {
    super(`${label}: per-source timeout ${ms}ms`);
    this.name = 'SourceTimeoutError';
  }
}

// Race a thunk against an AbortController-backed timeout. The thunk
// receives the signal so HTTP-based fetchers can thread it into the
// underlying fetch call (true cancellation). For viem-based callers
// the race still wins → orchestrator returns; the underlying RPC
// settles in the background and is GC'd on the next response cycle.
async function withSourceTimeout<T>(
  thunk: (signal: AbortSignal) => Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await Promise.race([
      thunk(ctrl.signal),
      new Promise<T>((_, reject) => {
        // If the signal already fired before .race() got here, reject
        // synchronously on the next microtask; the addEventListener
        // path is the common case.
        if (ctrl.signal.aborted) {
          reject(new SourceTimeoutError(label, ms));
          return;
        }
        ctrl.signal.addEventListener('abort', () => {
          reject(new SourceTimeoutError(label, ms));
        });
      }),
    ]);
  } finally {
    clearTimeout(timer);
    if (!ctrl.signal.aborted) ctrl.abort();
  }
}

// Wrap a FetchLike so every call carries the timeout's AbortSignal. When
// the orchestrator times out, in-flight fetch requests are aborted at
// the transport layer rather than left dangling on the event loop.
function injectSignal(fetchImpl: FetchLike | undefined, signal: AbortSignal): FetchLike {
  const base: FetchLike = fetchImpl ?? globalThis.fetch.bind(globalThis);
  return (input, init) => base(input, { ...(init ?? {}), signal });
}

function resolveBudgets(opts?: Partial<PerSourceBudgetsMs>): PerSourceBudgetsMs {
  if (opts === undefined) return DEFAULT_PER_SOURCE_BUDGETS_MS;
  return { ...DEFAULT_PER_SOURCE_BUDGETS_MS, ...opts };
}

export interface OrchestrateSubjectOptions {
  readonly chainId?: number;
  readonly rpcUrl?: string;
  readonly client?: PublicClient;
  // Per-chain client map. When the on-chain fan-out hits a chain present
  // in this map, that chain's client is used. Without this map, the
  // legacy `client` field is only honored when its `chain.id` matches the
  // queried chain — otherwise resolveClient() in the activity fetcher
  // builds a fresh per-chain client. This prevents the prior wrong-chain
  // routing where a single mainnet `client` was used for the sepolia
  // fan-out leg, silently reading mainnet nonces against a sepolia
  // address (audit-round-7 P0 #1).
  readonly clients?: ReadonlyMap<number, PublicClient>;
  readonly subjectOptions?: ResolveSubjectOptions;
  readonly publicReadOptions?: InferSubjectFromPublicReadOptions;
  readonly sourcifyDeepOptions?: FetchSourcifyDeepOptions;
  readonly metadataOptions?: FetchSourcifyMetadataOptions;
  readonly crossChainOptions?: DiscoverCrossChainOptions;
  readonly onchainOptions?: FetchOnchainActivityOptions;
  // Both required env keys for the related fetchers. When omitted (or
  // empty string), the underlying fetcher returns kind:'error'
  // reason:'missing_pat' / 'missing_api_key' which the orchestrator
  // surfaces as `kind: 'absent'` so the score engine knows the source was
  // never attempted (vs failed mid-flight).
  readonly githubPat?: string;
  readonly graphApiKey?: string;
  readonly githubOptions?: FetchGithubP0SourceOptions;
  readonly ensInternalOptions?: FetchEnsInternalSignalsOptions;
  // Default chains that always get an on-chain activity fetch in addition
  // to the chains the manifest declares.
  readonly defaultOnchainChains?: ReadonlyArray<number>;
  // Per-source timeout budgets in milliseconds (US-117 carry-rule v2 §2B).
  // Defaults match `DEFAULT_PER_SOURCE_BUDGETS_MS`. Tests inject smaller
  // values for deterministic assertions.
  readonly perSourceBudgetsMs?: Partial<PerSourceBudgetsMs>;
  // C-14 (audit-round-8): skip on-chain fan-out legs for chains that
  // have NO configured RPC. Without this, the default fan-out always
  // includes mainnet+sepolia; in production with only one RPC configured
  // the other leg falls through to viem's public default and reliably
  // hits the per-source timeout, cluttering `failures` with noise.
  // Default `true` — opt-out via `false` for tests that intentionally
  // want both legs to attempt without explicit clients.
  readonly skipUnconfiguredOnchainChains?: boolean;
  // C-14: per-chain RPC URL map for on-chain fans. When a chainId is
  // present here, the chain is treated as "configured" and its RPC URL
  // is threaded into the on-chain fetcher. When absent and no client is
  // injected, the chain's leg is skipped (under `skipUnconfiguredOnchainChains`).
  // Tests pass this map to assert per-chain routing without depending
  // on real env vars.
  readonly onchainRpcUrls?: Readonly<Record<number, string>>;
}

const DEFAULT_ONCHAIN_CHAINS: ReadonlyArray<number> = [1, 11155111];

function isMissingPatReason(reason: string): boolean {
  return reason === 'missing_pat' || reason === 'missing_api_key';
}

async function resolveSubject(
  name: string,
  options: OrchestrateSubjectOptions,
): Promise<{ identity: SubjectIdentity; sources: ReadonlyArray<SubjectSourcifyEntry>; failure: SourceFailure | null }> {
  const subjectOpts: ResolveSubjectOptions = {
    ...(options.chainId !== undefined ? { chainId: options.chainId } : {}),
    ...(options.rpcUrl !== undefined ? { rpcUrl: options.rpcUrl } : {}),
    ...(options.client !== undefined ? { client: options.client } : {}),
    ...(options.subjectOptions ?? {}),
  };
  const ensRes = await resolveSubjectFromEns(name, subjectOpts);
  if (ensRes.kind === 'ok') {
    const m: SubjectManifest = ensRes.manifest;
    const primary = m.sources.onchain?.primaryAddress ?? null;
    const kind: SubjectKind = m.kind;
    const identity: SubjectIdentity = {
      name,
      chainId: ensRes.chainId,
      mode: 'manifest',
      primaryAddress: primary,
      kind,
      manifest: m,
    };
    return { identity, sources: m.sources.sourcify ?? [], failure: null };
  }
  if (ensRes.kind === 'error') {
    // Manifest fetch outright failed → propagate as subject-resolve failure
    // and produce a degraded identity. Caller still gets a typed shape.
    const failure: SourceFailure = {
      kind: 'error',
      source: 'subject-resolve',
      reason: ensRes.reason,
      message: ensRes.message,
    };
    const identity: SubjectIdentity = {
      name,
      chainId: options.chainId ?? 1,
      mode: 'public-read',
      primaryAddress: null,
      kind: null,
      manifest: null,
    };
    return { identity, sources: [], failure };
  }

  // ensRes.kind === 'no_manifest' → public-read fallback (US-112).
  const publicReadOpts: InferSubjectFromPublicReadOptions = {
    ...(options.chainId !== undefined ? { chainId: options.chainId } : {}),
    ...(options.rpcUrl !== undefined ? { rpcUrl: options.rpcUrl } : {}),
    ...(options.client !== undefined ? { client: options.client } : {}),
    ...(options.publicReadOptions ?? {}),
  };
  const inferred = await inferSubjectFromPublicRead(name, publicReadOpts);
  if (inferred.kind === 'error') {
    return {
      identity: {
        name,
        chainId: ensRes.chainId,
        mode: 'public-read',
        primaryAddress: null,
        kind: null,
        manifest: null,
      },
      sources: [],
      failure: {
        kind: 'error',
        source: 'subject-resolve',
        reason: inferred.reason,
        message: inferred.message,
      },
    };
  }
  return {
    identity: {
      name,
      chainId: inferred.value.chainId,
      mode: 'public-read',
      primaryAddress: inferred.value.primaryAddress,
      kind: null,
      manifest: null,
      // C-13 (audit-round-8): propagate the public-read inferences so
      // the orchestrator's GitHub fan-out can run against the inferred
      // owner. Without this, every non-curated ENS subject with a
      // valid `com.github` text record returned tier U because the
      // GitHub branch only fired on `manifest.sources.github`.
      inferredGithub: inferred.value.sources.github,
      inferredTexts: inferred.value.inferredTexts,
    },
    sources: inferred.value.sources.sourcify ?? [],
    failure: null,
  };
}

async function fetchOneSourcifyEntry(
  entry: SubjectSourcifyEntry,
  deepOptions: FetchSourcifyDeepOptions | undefined,
  metadataOptions: FetchSourcifyMetadataOptions | undefined,
  budgetMs: number,
): Promise<SourcifyEntryEvidence> {
  const label = `sourcify-deep:${entry.chainId}:${entry.address}`;
  try {
    return await withSourceTimeout(
      async (signal) => {
        // Inject AbortSignal into both per-entry fetches so an orchestrator
        // timeout aborts at the transport layer (vs leaving requests
        // dangling).
        const deepWithSignal: FetchSourcifyDeepOptions = {
          ...(deepOptions ?? {}),
          fetchImpl: injectSignal(deepOptions?.fetchImpl, signal),
        };
        const metaWithSignal: FetchSourcifyMetadataOptions = {
          ...(metadataOptions ?? {}),
          fetchImpl: injectSignal(metadataOptions?.fetchImpl, signal),
        };
        // Two parallel fetches per entry: deep (for score-engine evidence)
        // and metadata (for source-pattern detection — patterns read source
        // file contents). When metadata errors but deep succeeds, the entry
        // surfaces with empty patterns rather than failing the whole entry.
        const [deep, metadata] = await Promise.all([
          fetchSourcifyDeep(entry.chainId, entry.address, deepWithSignal),
          fetchSourcifyMetadata(entry.chainId, entry.address, metaWithSignal),
        ]);
        if (deep.kind === 'error') {
          return {
            kind: 'error' as const,
            chainId: entry.chainId,
            address: entry.address,
            label: entry.label,
            reason: deep.error.reason,
            message: deep.error.message,
          };
        }
        // US-123 source-pattern detection wires in once that PR merges;
        // until then orchestrator emits `patterns: []`.
        void metadata;
        const patterns: ReadonlyArray<never> = [];
        const licenseCompiler = summarizeLicenseAndCompiler(deep.value);
        return {
          kind: 'ok' as const,
          chainId: entry.chainId,
          address: entry.address,
          label: entry.label,
          deep: deep.value,
          patterns,
          licenseCompiler,
        };
      },
      budgetMs,
      label,
    );
  } catch (err) {
    if (err instanceof SourceTimeoutError) {
      return {
        kind: 'error',
        chainId: entry.chainId,
        address: entry.address,
        label: entry.label,
        reason: 'source_timeout',
        message: err.message,
      };
    }
    throw err;
  }
}

async function fetchOneOnchain(
  chainId: number,
  address: Address,
  options: FetchOnchainActivityOptions | undefined,
  fallbackClient: PublicClient | undefined,
  clients: ReadonlyMap<number, PublicClient> | undefined,
  budgetMs: number,
): Promise<OnchainEntryEvidence> {
  const label = `onchain:${chainId}:${address}`;
  try {
    return await withSourceTimeout(
      // viem PublicClient does not expose a per-call AbortSignal; the
      // race wins on timeout but the underlying RPC settles in the
      // background and is GC'd. Best-effort cancellation; the demo
      // outcome (orchestrator returns within budget) is preserved.
      async (_signal) => {
        // Per-chain client resolution (audit-round-7 P0 #1):
        //   1. baseOpts.client — explicit per-fetch override (rare).
        //   2. clients[chainId] — caller pre-built per-chain map.
        //   3. fallbackClient IFF its chain.id matches chainId. The
        //      legacy single-client option is only honored when the
        //      chain matches; otherwise the prior bug fired (mainnet
        //      client injected into the sepolia fan-out leg, returning
        //      mainnet nonces against a sepolia address).
        //   4. undefined → fetchOnchainActivity's resolveClient() builds
        //      a fresh per-chain viem client via http(rpcUrl).
        const baseOpts = options ?? {};
        let resolved: PublicClient | undefined;
        if (baseOpts.client !== undefined) {
          resolved = baseOpts.client;
        } else if (clients !== undefined && clients.has(chainId)) {
          resolved = clients.get(chainId);
        } else if (
          fallbackClient !== undefined &&
          fallbackClient.chain?.id === chainId
        ) {
          resolved = fallbackClient;
        } else {
          resolved = undefined;
        }
        const opts: FetchOnchainActivityOptions =
          resolved !== undefined ? { ...baseOpts, client: resolved } : { ...baseOpts };
        const res = await fetchOnchainActivity(chainId, address, opts);
        if (res.kind === 'error') {
          return { kind: 'error' as const, chainId, reason: res.reason, message: res.message };
        }
        return { kind: 'ok' as const, chainId, value: res.value };
      },
      budgetMs,
      label,
    );
  } catch (err) {
    if (err instanceof SourceTimeoutError) {
      return { kind: 'error', chainId, reason: 'source_timeout', message: err.message };
    }
    throw err;
  }
}

function dedupeChainIds(
  entries: ReadonlyArray<SubjectSourcifyEntry>,
  defaults: ReadonlyArray<number>,
): ReadonlyArray<number> {
  const set = new Set<number>(defaults);
  for (const e of entries) set.add(e.chainId);
  return [...set];
}

// C-14 (audit-round-8): per-chain RPC env var map. Production reads
// `ALCHEMY_RPC_MAINNET` for chainId 1 and `ALCHEMY_RPC_SEPOLIA` for
// 11155111. Other chains are intentionally not env-discoverable in v1;
// the test path uses `onchainRpcUrls` instead.
const CHAIN_ID_TO_RPC_ENV: Readonly<Record<number, string>> = {
  1: 'ALCHEMY_RPC_MAINNET',
  11155111: 'ALCHEMY_RPC_SEPOLIA',
};

function rpcEnvFor(chainId: number): string | undefined {
  // Read off `process.env` so tests that don't set env vars consistently
  // skip those chains. We tolerate a missing `process` (e.g. an edge
  // runtime) by returning undefined.
  const env = (typeof process !== 'undefined' ? process.env : undefined) as
    | Readonly<Record<string, string | undefined>>
    | undefined;
  if (env === undefined) return undefined;
  const envName = CHAIN_ID_TO_RPC_ENV[chainId];
  if (envName === undefined) return undefined;
  const direct = env[envName];
  if (direct !== undefined && direct.length > 0) return direct;
  // Mainnet has a long-standing `ENS_RPC_URL` fallback (Epic 1 single-
  // contract path uses it). Honor that here so a deploy with only
  // `ENS_RPC_URL` set still treats mainnet as configured.
  if (chainId === 1) {
    const ensRpc = env['ENS_RPC_URL'];
    if (ensRpc !== undefined && ensRpc.length > 0) return ensRpc;
  }
  return undefined;
}

// A chain is "configured" iff at least one of:
//   - explicit per-chain client provided in `options.clients`
//   - legacy single client whose `chain.id` matches
//   - per-chain RPC URL provided in `options.onchainRpcUrls`
//   - process env exposes a Alchemy RPC URL for this chainId
// Anything else is filtered out before fan-out so the per-source budget
// isn't burned on a leg that will fall through to viem's public default
// and almost certainly time out.
function chainHasConfiguredRpc(
  chainId: number,
  options: OrchestrateSubjectOptions,
): boolean {
  if (options.clients?.has(chainId)) return true;
  if (options.client?.chain?.id === chainId) return true;
  if (options.onchainRpcUrls?.[chainId]) return true;
  const envUrl = rpcEnvFor(chainId);
  if (envUrl !== undefined && envUrl.length > 0) return true;
  return false;
}

async function fetchGithub(
  owner: string | null,
  pat: string | undefined,
  options: FetchGithubP0SourceOptions | undefined,
  budgetMs: number,
): Promise<GithubEvidence> {
  if (owner === null || owner.length === 0) return { kind: 'absent' };
  if (!pat || pat.length === 0) return { kind: 'absent' };
  const label = `github:${owner}`;
  try {
    return await withSourceTimeout(
      async (signal) => {
        const opts: FetchGithubP0SourceOptions = {
          ...(options ?? {}),
          pat,
          fetchImpl: injectSignal(options?.fetchImpl, signal),
        };
        const res = await fetchGithubP0Source(owner, opts);
        if (res.kind === 'error') {
          if (isMissingPatReason(res.reason)) return { kind: 'absent' as const };
          return { kind: 'error' as const, reason: res.reason, message: res.message };
        }
        return { kind: 'ok' as const, value: res.value };
      },
      budgetMs,
      label,
    );
  } catch (err) {
    if (err instanceof SourceTimeoutError) {
      return { kind: 'error', reason: 'source_timeout', message: err.message };
    }
    throw err;
  }
}

async function fetchEnsInternal(
  name: string,
  apiKey: string | undefined,
  options: FetchEnsInternalSignalsOptions | undefined,
  budgetMs: number,
): Promise<EnsInternalEvidence> {
  if (!apiKey || apiKey.length === 0) return { kind: 'absent' };
  const label = `ens-internal:${name}`;
  try {
    return await withSourceTimeout(
      async (signal) => {
        // FetchEnsInternalSignalsOptions requires apiKey. Spread caller
        // options first, force apiKey on top so the orchestrator's env-
        // derived key wins, then inject signal on the fetchImpl.
        const merged: FetchEnsInternalSignalsOptions = {
          ...(options ?? {}),
          apiKey,
          fetchImpl: injectSignal(options?.fetchImpl, signal),
        };
        const res = await fetchEnsInternalSignals(name, merged);
        if (res.kind === 'error') {
          if (isMissingPatReason(res.reason)) return { kind: 'absent' as const };
          return { kind: 'error' as const, reason: res.reason, message: res.message };
        }
        return { kind: 'ok' as const, value: res.value };
      },
      budgetMs,
      label,
    );
  } catch (err) {
    if (err instanceof SourceTimeoutError) {
      return { kind: 'error', reason: 'source_timeout', message: err.message };
    }
    throw err;
  }
}

// US-117 multi-source orchestrator. Per launch prompt non-negotiables:
// - Promise.allSettled over per-source fan-out; never throws.
// - Per-source failure recorded as discriminated SourceFailure. Score
//   engine handles missing sources without inflating values.
// - Both env-keyed sources (GitHub PAT, Graph API key) degrade to
//   `kind: 'absent'` when their key is missing, so the orchestrator can
//   surface a typed missing-key signal vs an in-flight failure.
//
// Failure isolation pattern: every source-level call is wrapped in a
// safeFetch helper that converts thrown exceptions into typed errors so
// allSettled is structurally redundant — but we keep allSettled as a
// belt-and-braces guarantee against unexpected library throws.
export async function orchestrateSubject(
  name: string,
  options: OrchestrateSubjectOptions = {},
): Promise<MultiSourceEvidence> {
  const failures: SourceFailure[] = [];
  const budgets = resolveBudgets(options.perSourceBudgetsMs);

  const { identity, sources, failure: subjectFailure } = await resolveSubject(name, options);
  if (subjectFailure) failures.push(subjectFailure);

  const allChainIds = dedupeChainIds(sources, options.defaultOnchainChains ?? DEFAULT_ONCHAIN_CHAINS);
  // C-14: pre-filter chains lacking any configured RPC so the on-chain
  // fan-out doesn't burn its per-source budget on a leg that will fall
  // through to viem's public default and reliably time out. Skipped
  // chains surface as a `failures[]` entry with reason
  // `rpc_unconfigured` so the drawer can render the missing tile
  // honestly instead of pretending nothing was attempted.
  const skipUnconfigured = options.skipUnconfiguredOnchainChains ?? true;
  const onchainChainIds = skipUnconfigured
    ? allChainIds.filter((id) => chainHasConfiguredRpc(id, options))
    : allChainIds;
  if (skipUnconfigured) {
    for (const id of allChainIds) {
      if (!onchainChainIds.includes(id)) {
        failures.push({
          kind: 'error',
          source: 'onchain',
          reason: 'rpc_unconfigured',
          message: `onchain: no configured RPC for chainId ${id} — leg skipped (set ALCHEMY_RPC_* env or pass clients/onchainRpcUrls)`,
          chainId: id,
        });
      }
    }
  }

  // Fan-out per-source. Promise.allSettled over already-typed-result
  // promises so no exception escapes the orchestrator. Each per-source
  // helper is wrapped in withSourceTimeout — slow tiles surface as
  // kind:'error' reason:'source_timeout' so the renderer can show a
  // dashed-border missing pill (carry-rule v2 §2B) without the whole
  // request blocking on the slowest fetch.
  const sourcifyPromise = Promise.allSettled(
    sources.map((entry) =>
      fetchOneSourcifyEntry(
        entry,
        options.sourcifyDeepOptions,
        options.metadataOptions,
        budgets.sourcifyDeep,
      ),
    ),
  );
  const onchainPromise = identity.primaryAddress
    ? Promise.allSettled(
        onchainChainIds.map((chainId) => {
          // C-14: per-chain RPC URL flows from options.onchainRpcUrls
          // (test path) or from env (production). Threading it into
          // onchainOptions.rpcUrl ensures fetchOnchainActivity's
          // resolveClient builds a real per-chain client even when no
          // explicit client was injected.
          const rpcUrl = options.onchainRpcUrls?.[chainId] ?? rpcEnvFor(chainId);
          const onchainOpts: FetchOnchainActivityOptions = {
            ...(options.onchainOptions ?? {}),
            ...(rpcUrl !== undefined && rpcUrl.length > 0 ? { rpcUrl } : {}),
          };
          return fetchOneOnchain(
            chainId,
            identity.primaryAddress as Address,
            onchainOpts,
            options.client,
            options.clients,
            budgets.onchain,
          );
        }),
      )
    : Promise.resolve([] as ReadonlyArray<PromiseSettledResult<OnchainEntryEvidence>>);
  // C-13 (audit-round-8): GitHub fan-out reads the manifest's
  // authored owner first; in public-read mode falls back to the
  // inferred owner from `com.github` ENS text. Trust-discount × 0.6
  // still applies in the score engine since `verified: false` either
  // way until v2 cross-sign lands.
  const githubOwnerSource =
    identity.manifest?.sources.github?.owner ?? identity.inferredGithub?.owner ?? null;
  const githubPromise = githubOwnerSource
    ? fetchGithub(
        githubOwnerSource,
        options.githubPat,
        options.githubOptions,
        budgets.github,
      )
    : Promise.resolve<GithubEvidence>({ kind: 'absent' });
  const ensInternalPromise = fetchEnsInternal(
    name,
    options.graphApiKey,
    options.ensInternalOptions,
    budgets.ensInternal,
  );
  const crossChainPromise = sources.length > 0
    ? withSourceTimeout(
        async (signal) => {
          const opts: DiscoverCrossChainOptions = {
            ...(options.crossChainOptions ?? {}),
            fetchImpl: injectSignal(options.crossChainOptions?.fetchImpl, signal),
          };
          return discoverCrossChainPresence(sources, opts);
        },
        budgets.crossChain,
        'cross-chain',
      ).catch((err: unknown) => {
        if (err instanceof SourceTimeoutError) {
          // Surface the cross-chain timeout as a non-fatal failure on the
          // result; the orchestrator returns null for the discovery block
          // so the renderer marks the cross-chain badge missing rather
          // than dropping the whole bench card.
          failures.push({
            kind: 'error',
            source: 'cross-chain',
            reason: 'source_timeout',
            message: err.message,
          });
          return null;
        }
        throw err;
      })
    : Promise.resolve(null);

  const [sourcifySettled, onchainSettled, github, ensInternal, crossChain] = await Promise.all([
    sourcifyPromise,
    onchainPromise,
    githubPromise,
    ensInternalPromise,
    crossChainPromise,
  ]);

  const sourcifyEvidence: SourcifyEntryEvidence[] = [];
  for (let i = 0; i < sourcifySettled.length; i++) {
    const settled = sourcifySettled[i];
    const entry = sources[i];
    if (!settled || !entry) continue;
    if (settled.status === 'fulfilled') {
      sourcifyEvidence.push(settled.value);
      if (settled.value.kind === 'error') {
        failures.push({
          kind: 'error',
          source: 'sourcify',
          reason: settled.value.reason,
          message: settled.value.message,
          sourcifyChainId: settled.value.chainId,
          sourcifyAddress: settled.value.address,
        });
      }
    } else {
      const reason = 'unexpected_throw';
      const msg = settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
      sourcifyEvidence.push({
        kind: 'error',
        chainId: entry.chainId,
        address: entry.address,
        label: entry.label,
        reason,
        message: msg,
      });
      failures.push({
        kind: 'error',
        source: 'sourcify',
        reason,
        message: msg,
        sourcifyChainId: entry.chainId,
        sourcifyAddress: entry.address,
      });
    }
  }

  const onchainEvidence: OnchainEntryEvidence[] = [];
  for (let i = 0; i < onchainSettled.length; i++) {
    const settled = onchainSettled[i];
    const chainId = onchainChainIds[i];
    if (!settled || chainId === undefined) continue;
    if (settled.status === 'fulfilled') {
      onchainEvidence.push(settled.value);
      if (settled.value.kind === 'error') {
        failures.push({
          kind: 'error',
          source: 'onchain',
          reason: settled.value.reason,
          message: settled.value.message,
          chainId: settled.value.chainId,
        });
      }
    } else {
      const reason = 'unexpected_throw';
      const msg = settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
      onchainEvidence.push({ kind: 'error', chainId, reason, message: msg });
      failures.push({ kind: 'error', source: 'onchain', reason, message: msg, chainId });
    }
  }

  if (github.kind === 'error') {
    failures.push({ kind: 'error', source: 'github', reason: github.reason, message: github.message });
  }
  if (ensInternal.kind === 'error') {
    failures.push({ kind: 'error', source: 'ens-internal', reason: ensInternal.reason, message: ensInternal.message });
  }
  if (crossChain && crossChain.failures.length > 0) {
    for (const f of crossChain.failures) {
      failures.push({ kind: 'error', source: 'cross-chain', reason: f.reason, message: f.message });
    }
  }

  return {
    subject: identity,
    sourcify: sourcifyEvidence,
    github,
    onchain: onchainEvidence,
    ensInternal,
    crossChain,
    failures,
  };
}
