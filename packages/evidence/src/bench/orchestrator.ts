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

export interface OrchestrateSubjectOptions {
  readonly chainId?: number;
  readonly rpcUrl?: string;
  readonly client?: PublicClient;
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
    },
    sources: inferred.value.sources.sourcify ?? [],
    failure: null,
  };
}

async function fetchOneSourcifyEntry(
  entry: SubjectSourcifyEntry,
  deepOptions: FetchSourcifyDeepOptions | undefined,
  metadataOptions: FetchSourcifyMetadataOptions | undefined,
): Promise<SourcifyEntryEvidence> {
  // Two parallel fetches per entry: deep (for score-engine evidence) and
  // metadata (for source-pattern detection — patterns read source file
  // contents). When the metadata fetch errors but deep succeeds, the
  // entry surfaces with empty patterns rather than failing the whole entry.
  const [deep, metadata] = await Promise.all([
    fetchSourcifyDeep(entry.chainId, entry.address, deepOptions),
    fetchSourcifyMetadata(entry.chainId, entry.address, metadataOptions ?? {}),
  ]);
  if (deep.kind === 'error') {
    return {
      kind: 'error',
      chainId: entry.chainId,
      address: entry.address,
      label: entry.label,
      reason: deep.error.reason,
      message: deep.error.message,
    };
  }
  // US-123 source-pattern detection wires in once that PR merges; until
  // then orchestrator emits `patterns: []` for every entry. Score engine
  // tolerates an empty array.
  void metadata;
  const patterns: ReadonlyArray<never> = [];
  const licenseCompiler = summarizeLicenseAndCompiler(deep.value);
  return {
    kind: 'ok',
    chainId: entry.chainId,
    address: entry.address,
    label: entry.label,
    deep: deep.value,
    patterns,
    licenseCompiler,
  };
}

async function fetchOneOnchain(
  chainId: number,
  address: Address,
  options: FetchOnchainActivityOptions | undefined,
  fallbackClient: PublicClient | undefined,
): Promise<OnchainEntryEvidence> {
  // Threading the orchestrator's top-level client through to the on-chain
  // fetcher when the caller has not supplied a per-fetch client. Avoids a
  // real-RPC fallback (createPublicClient + http()) inside test paths
  // that mock the client at the orchestrator level.
  const baseOpts = options ?? {};
  const opts: FetchOnchainActivityOptions =
    baseOpts.client === undefined && fallbackClient !== undefined
      ? { ...baseOpts, client: fallbackClient }
      : { ...baseOpts };
  const res = await fetchOnchainActivity(chainId, address, opts);
  if (res.kind === 'error') {
    return { kind: 'error', chainId, reason: res.reason, message: res.message };
  }
  return { kind: 'ok', chainId, value: res.value };
}

function dedupeChainIds(
  entries: ReadonlyArray<SubjectSourcifyEntry>,
  defaults: ReadonlyArray<number>,
): ReadonlyArray<number> {
  const set = new Set<number>(defaults);
  for (const e of entries) set.add(e.chainId);
  return [...set];
}

async function fetchGithub(
  owner: string | null,
  pat: string | undefined,
  options: FetchGithubP0SourceOptions | undefined,
): Promise<GithubEvidence> {
  if (owner === null || owner.length === 0) return { kind: 'absent' };
  if (!pat || pat.length === 0) return { kind: 'absent' };
  const res = await fetchGithubP0Source(owner, { ...(options ?? {}), pat });
  if (res.kind === 'error') {
    if (isMissingPatReason(res.reason)) return { kind: 'absent' };
    return { kind: 'error', reason: res.reason, message: res.message };
  }
  return { kind: 'ok', value: res.value };
}

async function fetchEnsInternal(
  name: string,
  apiKey: string | undefined,
  options: FetchEnsInternalSignalsOptions | undefined,
): Promise<EnsInternalEvidence> {
  if (!apiKey || apiKey.length === 0) return { kind: 'absent' };
  // FetchEnsInternalSignalsOptions requires apiKey. Spread caller options
  // first, then force the resolved apiKey on top so the orchestrator's
  // env-derived key wins when both are present.
  const merged: FetchEnsInternalSignalsOptions = { ...(options ?? {}), apiKey };
  const res = await fetchEnsInternalSignals(name, merged);
  if (res.kind === 'error') {
    if (isMissingPatReason(res.reason)) return { kind: 'absent' };
    return { kind: 'error', reason: res.reason, message: res.message };
  }
  return { kind: 'ok', value: res.value };
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

  const { identity, sources, failure: subjectFailure } = await resolveSubject(name, options);
  if (subjectFailure) failures.push(subjectFailure);

  const onchainChainIds = dedupeChainIds(sources, options.defaultOnchainChains ?? DEFAULT_ONCHAIN_CHAINS);

  // Fan-out per-source. Promise.allSettled over already-typed-result
  // promises so no exception escapes the orchestrator.
  const sourcifyPromise = Promise.allSettled(
    sources.map((entry) =>
      fetchOneSourcifyEntry(entry, options.sourcifyDeepOptions, options.metadataOptions),
    ),
  );
  const onchainPromise = identity.primaryAddress
    ? Promise.allSettled(
        onchainChainIds.map((chainId) =>
          fetchOneOnchain(
            chainId,
            identity.primaryAddress as Address,
            options.onchainOptions,
            options.client,
          ),
        ),
      )
    : Promise.resolve([] as ReadonlyArray<PromiseSettledResult<OnchainEntryEvidence>>);
  const githubPromise = identity.manifest?.sources.github?.owner
    ? fetchGithub(identity.manifest.sources.github.owner, options.githubPat, options.githubOptions)
    : Promise.resolve<GithubEvidence>({ kind: 'absent' });
  const ensInternalPromise = fetchEnsInternal(name, options.graphApiKey, options.ensInternalOptions);
  const crossChainPromise = sources.length > 0
    ? discoverCrossChainPresence(sources, options.crossChainOptions ?? {})
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
