import { createPublicClient, http, isAddress, type Address as ViemAddress, type PublicClient } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

import type {
  Address,
  SubjectGithubSource,
  SubjectOnchainSource,
  SubjectSourcifyEntry,
} from '@upgrade-siren/shared';

import { withRetry, type RetryOptions } from '../network/retry.js';
import {
  fetchSourcifyAllChains,
  type FetchSourcifyAllChainsOptions,
  type SourcifyAllChainsEntry,
} from '../sourcify/allChains.js';

export type SubjectPublicReadFailureReason =
  | 'invalid_name'
  | 'unsupported_chain'
  | 'rpc_error'
  | 'sourcify_error';

export interface SubjectPublicReadInferredSources {
  // Promoted from Sourcify all-chains lookup. Only entries with a
  // recognised match level land here; the score engine treats this as
  // verified evidence (Sourcify is the verified source per Section 9).
  readonly sourcify: ReadonlyArray<SubjectSourcifyEntry>;
  // null when ENS addr() resolved to zero / no record.
  readonly onchain: SubjectOnchainSource | null;
  // C-13 (audit-round-8) — DEMO-BLOCKER fix: public-read fallback
  // reads standard ENS text records in parallel with addr(). When
  // `com.github` is present, synthesise a SubjectGithubSource so the
  // GitHub source pipeline runs against the inferred owner. Without
  // this, every non-curated ENS subject (vitalik.eth, letadlo.eth,
  // any agent-* name with `com.github` set) returned tier U because
  // the orchestrator only fetched github when an authored manifest
  // claimed it. Always `verified: false` — the user made no signed
  // claim. Trust-discount × 0.6 still applies in the score engine.
  readonly github: SubjectGithubSource | null;
  // ensInternal will be populated by the orchestrator (US-117) from the
  // US-116 fetcher; it is always available regardless of opt-in.
}

export interface SubjectPublicReadInference {
  readonly name: string;
  readonly chainId: number;
  // null when ENS addr() resolved to no value (subject ENS exists but has
  // no addr record). Caller surfaces "U" tier in this case.
  readonly primaryAddress: Address | null;
  readonly sources: SubjectPublicReadInferredSources;
  // C-13: full set of text records read during inference (com.github,
  // description, url, com.twitter, com.discord, org.telegram). Surfaced
  // so the drawer can render the announced metadata as evidence rows
  // ("ENS announced X = Y") without re-reading the chain.
  readonly inferredTexts: Readonly<Record<string, string>>;
}

export interface SubjectPublicReadOk {
  readonly kind: 'ok';
  readonly value: SubjectPublicReadInference;
}

export interface SubjectPublicReadError {
  readonly kind: 'error';
  readonly reason: SubjectPublicReadFailureReason;
  readonly message: string;
  readonly cause?: unknown;
}

export type SubjectPublicReadResolutionResult = SubjectPublicReadOk | SubjectPublicReadError;

export interface InferSubjectFromPublicReadOptions {
  readonly chainId?: number;
  readonly rpcUrl?: string;
  readonly client?: PublicClient;
  readonly retry?: RetryOptions | true;
  readonly sourcifyOptions?: FetchSourcifyAllChainsOptions;
  // Default chains in the all-chains lookup are NOT filtered; we accept
  // every chain Sourcify reports. Callers wanting a narrower view can
  // post-filter the returned entries.
}

const ENS_NAME_RE = /^(?:[a-z0-9_-]+\.)+(?:eth|test)$/i;

function isPlausibleEnsName(name: string): boolean {
  if (typeof name !== 'string' || name.length === 0 || name.length > 255) return false;
  if (!ENS_NAME_RE.test(name)) return false;
  return name.split('.').every((label) => label.length > 0 && label.length <= 63);
}

function resolveRetryOptions(retry: RetryOptions | true | undefined): RetryOptions | undefined {
  if (retry === undefined) return undefined;
  if (retry === true) return {};
  return retry;
}

function resolveClient(
  chainId: number,
  options: InferSubjectFromPublicReadOptions,
): PublicClient | SubjectPublicReadError {
  if (options.client) return options.client;
  let chain;
  if (chainId === mainnet.id) chain = mainnet;
  else if (chainId === sepolia.id) chain = sepolia;
  else {
    return {
      kind: 'error',
      reason: 'unsupported_chain',
      message: `subject.publicRead: unsupported chainId ${chainId}; expected ${mainnet.id} or ${sepolia.id}`,
    };
  }
  return createPublicClient({ chain, transport: http(options.rpcUrl) });
}

function isZeroAddress(addr: string): boolean {
  return addr === '0x0000000000000000000000000000000000000000';
}

// Promotes Sourcify all-chains entries into the SubjectSourcifyEntry shape
// the orchestrator expects. The label is synthesised because public-read
// has no manifest-author intent — it surfaces "Discovered (chain N)" so
// the drawer makes the inference visible.
function promoteEntries(entries: ReadonlyArray<SourcifyAllChainsEntry>): SubjectSourcifyEntry[] {
  return entries.map((e) => ({
    chainId: e.chainId,
    address: e.address,
    label: `Discovered (chain ${e.chainId})`,
  }));
}

// Public-read inference (US-112). Fired when subject ENS name has no
// `agent-bench:bench_manifest` text record. Reads ENS addr() and the
// Sourcify all-chains list to assemble a partial sources object the
// score engine can run against. Caller (US-117 orchestrator) layers the
// US-116 ENS-internal signals on top.
//
// Returns ok-shaped even when primaryAddress is null. The score engine
// caps tier at A in public-read mode regardless (per Section 7); callers
// must surface the public-read banner (`confidence: public-read`).
// C-13 (audit-round-8): standard ENS text records the public-read
// fallback reads in parallel with addr(). com.github is the load-
// bearing key — without it the GitHub source pipeline can't run.
// description / url / com.twitter / com.discord / org.telegram are
// kept for drawer evidence display. Per-key fetch errors degrade
// gracefully (treated as missing); the addr() call is the only one
// whose failure aborts the whole resolution.
export const PUBLIC_READ_TEXT_KEYS = [
  'com.github',
  'description',
  'url',
  'com.twitter',
  'com.discord',
  'org.telegram',
] as const;

// GitHub owner sanity gate. Public-read inference must NOT trust
// arbitrary text content — a malicious / malformed `com.github` value
// can't be allowed to drive a fetch against api.github.com. Mirrors
// GitHub's username + org rules (alphanumeric, single hyphen, no
// leading/trailing hyphen, ≤ 39 chars; we relax to 64 to allow for
// orgs marginally over the canonical limit). Validation lives here in
// the public-read fetcher rather than in the orchestrator so the
// "inferred github source" surface is always well-formed by
// construction.
const GITHUB_OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?$/;

export async function inferSubjectFromPublicRead(
  name: string,
  options: InferSubjectFromPublicReadOptions = {},
): Promise<SubjectPublicReadResolutionResult> {
  if (!isPlausibleEnsName(name)) {
    return { kind: 'error', reason: 'invalid_name', message: `subject.publicRead: invalid ENS name ${JSON.stringify(name)}` };
  }
  const chainId = options.chainId ?? mainnet.id;
  const clientOrError = resolveClient(chainId, options);
  if ('kind' in clientOrError && clientOrError.kind === 'error') return clientOrError;
  const client = clientOrError as PublicClient;
  const retryOpts = resolveRetryOptions(options.retry);

  // Read addr() and the standard text records in parallel. addr()
  // failure is an abort-the-whole-resolution failure (we have nothing
  // else to anchor on); per-key text() failures degrade quietly to
  // "not present" — the discriminating signal is that the absence of
  // a text record is INDISTINGUISHABLE from a transient RPC error,
  // which is fine for the demo path: in either case the record is not
  // safely-readable so we omit the inferred source.
  type TextResult = string | null;
  const callAddr = (): Promise<ViemAddress | null> =>
    client.getEnsAddress({ name }).then((v) => v ?? null);
  const callText = (key: string): Promise<TextResult> =>
    client
      .getEnsText({ name, key })
      .then((v) => (typeof v === 'string' && v.length > 0 ? v : null))
      .catch(() => null);

  let addrRaw: ViemAddress | null;
  const textValues: Array<TextResult> = [];
  try {
    const [addrResult, ...textResults] = await Promise.all([
      retryOpts ? withRetry(callAddr, retryOpts) : callAddr(),
      ...PUBLIC_READ_TEXT_KEYS.map((key) => callText(key)),
    ]);
    addrRaw = addrResult;
    textValues.push(...textResults);
  } catch (err) {
    return {
      kind: 'error',
      reason: 'rpc_error',
      message: `subject.publicRead: getEnsAddress failed - ${err instanceof Error ? err.message : String(err)}`,
      cause: err,
    };
  }

  let primaryAddress: Address | null = null;
  if (addrRaw !== null && isAddress(addrRaw) && !isZeroAddress(addrRaw)) {
    primaryAddress = addrRaw as Address;
  }

  const inferredTexts: Record<string, string> = {};
  PUBLIC_READ_TEXT_KEYS.forEach((key, i) => {
    const v = textValues[i];
    if (typeof v === 'string' && v.length > 0) inferredTexts[key] = v;
  });

  // Synthesise the inferred GitHub source from com.github when the
  // value passes the owner regex. Anything that fails the regex is
  // dropped silently — we'd rather degrade to "no GitHub" than chase
  // a malformed value into a 404 storm.
  let inferredGithub: SubjectGithubSource | null = null;
  const githubOwner = inferredTexts['com.github'];
  if (typeof githubOwner === 'string' && GITHUB_OWNER_RE.test(githubOwner)) {
    inferredGithub = { owner: githubOwner, verified: false, verificationGist: null };
  }

  let sourcifyEntries: ReadonlyArray<SubjectSourcifyEntry> = [];
  if (primaryAddress !== null) {
    const allChainsRes = await fetchSourcifyAllChains(primaryAddress, options.sourcifyOptions);
    if (allChainsRes.kind === 'error') {
      return {
        kind: 'error',
        reason: 'sourcify_error',
        message: `subject.publicRead: sourcify all-chains failed - ${allChainsRes.error.message}`,
        cause: allChainsRes.error,
      };
    }
    sourcifyEntries = promoteEntries(allChainsRes.value);
  }

  const onchain: SubjectOnchainSource | null = primaryAddress !== null
    ? { primaryAddress, claimedFirstTxHash: null }
    : null;

  return {
    kind: 'ok',
    value: {
      name,
      chainId,
      primaryAddress,
      sources: {
        sourcify: sourcifyEntries,
        onchain,
        github: inferredGithub,
      },
      inferredTexts,
    },
  };
}
