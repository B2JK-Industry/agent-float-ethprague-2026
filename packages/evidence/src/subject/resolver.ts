import { createPublicClient, http, type PublicClient } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

import { AGENT_BENCH_RECORD_KEYS, type AgentBenchRecordKey } from '@upgrade-siren/shared';

import { withRetry, type RetryOptions } from '../network/retry.js';
import type {
  AgentBenchRecordSet,
  AgentBenchResolutionFlags,
  SubjectResolutionError,
  SubjectResolutionResult,
} from './types.js';
import { validateSubjectManifest } from './validate.js';

export interface ResolveSubjectOptions {
  readonly chainId?: number;
  readonly rpcUrl?: string;
  readonly client?: PublicClient;
  readonly retry?: RetryOptions | true;
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
  options: ResolveSubjectOptions,
): PublicClient | SubjectResolutionError {
  if (options.client) return options.client;
  let chain;
  if (chainId === mainnet.id) chain = mainnet;
  else if (chainId === sepolia.id) chain = sepolia;
  else {
    return {
      kind: 'error',
      reason: 'unsupported_chain',
      message: `subject.resolve: unsupported chainId ${chainId}; expected ${mainnet.id} (mainnet) or ${sepolia.id} (sepolia)`,
    };
  }
  return createPublicClient({ chain, transport: http(options.rpcUrl) });
}

async function getText(
  client: PublicClient,
  name: string,
  key: AgentBenchRecordKey,
  retry?: RetryOptions,
): Promise<{ kind: 'ok'; value: string | null } | { kind: 'error'; cause: unknown }> {
  try {
    const call = (): Promise<string | null> =>
      client.getEnsText({ name, key }).then((v) => v ?? null);
    const value = retry ? await withRetry(call, retry) : await call();
    return { kind: 'ok', value };
  } catch (err) {
    return { kind: 'error', cause: err };
  }
}

// Reads the agent-bench:* text records on `name`, parses
// agent-bench:bench_manifest as JSON, and validates it against the
// agent-bench-manifest@1 JSON schema. Three success-shaped outcomes:
//   - `ok` — manifest present and schema-valid; downstream score path runs.
//   - `no_manifest` — name resolves but carries no opt-in record; caller can
//      fall back to public-read (US-112) or render "not opted in".
//   - `error` — invalid name, RPC failure, malformed JSON, or schema breach.
//
// This deliberately does NOT also fetch upgrade-siren:* records — those live
// in the single-contract path (US-017). A subject can carry both namespaces;
// the orchestrator combines results from both resolvers.
export async function resolveSubjectFromEns(
  name: string,
  options: ResolveSubjectOptions = {},
): Promise<SubjectResolutionResult> {
  if (!isPlausibleEnsName(name)) {
    return {
      kind: 'error',
      reason: 'invalid_name',
      message: `subject.resolve: invalid ENS name ${JSON.stringify(name)}`,
    };
  }

  const chainId = options.chainId ?? mainnet.id;
  const clientOrError = resolveClient(chainId, options);
  if ('kind' in clientOrError && clientOrError.kind === 'error') {
    return clientOrError;
  }
  const client = clientOrError as PublicClient;
  const retryOpts = resolveRetryOptions(options.retry);

  const [manifestRead, ownerRead, schemaRead] = await Promise.all([
    getText(client, name, AGENT_BENCH_RECORD_KEYS.benchManifest, retryOpts),
    getText(client, name, AGENT_BENCH_RECORD_KEYS.owner, retryOpts),
    getText(client, name, AGENT_BENCH_RECORD_KEYS.schema, retryOpts),
  ]);

  const reads = [manifestRead, ownerRead, schemaRead] as const;
  const failed = reads.find((r) => r.kind === 'error');
  if (failed && failed.kind === 'error') {
    const cause = failed.cause;
    return {
      kind: 'error',
      reason: 'rpc_error',
      message: `subject.resolve: getEnsText failed - ${cause instanceof Error ? cause.message : String(cause)}`,
      cause,
    };
  }

  const valueOrNull = (
    r: { kind: 'ok'; value: string | null } | { kind: 'error'; cause: unknown },
  ) => (r.kind === 'ok' ? r.value : null);

  const manifestRaw = valueOrNull(manifestRead);
  const ownerValue = valueOrNull(ownerRead);
  const schemaValue = valueOrNull(schemaRead);

  const records: AgentBenchRecordSet = {
    benchManifestRaw: manifestRaw,
    owner: ownerValue,
    schema: schemaValue,
  };
  const flags: AgentBenchResolutionFlags = {
    benchManifestPresent: manifestRaw !== null,
    ownerPresent: ownerValue !== null,
    schemaPresent: schemaValue !== null,
  };

  if (manifestRaw === null) {
    return { kind: 'no_manifest', name, chainId, records, flags };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestRaw);
  } catch (err) {
    return {
      kind: 'error',
      reason: 'parse_error',
      message: `subject.resolve: agent-bench:bench_manifest is not valid JSON - ${err instanceof Error ? err.message : String(err)}`,
      cause: err,
    };
  }

  const validation = validateSubjectManifest(parsed);
  if (validation.kind === 'error') {
    const head = validation.errors[0];
    const summary = head ? `${head.instancePath || '<root>'} ${head.message}` : 'invalid';
    return {
      kind: 'error',
      reason: 'schema_error',
      message: `subject.resolve: agent-bench-manifest@1 schema validation failed - ${summary}`,
      schemaErrors: validation.errors,
    };
  }

  return {
    kind: 'ok',
    name,
    chainId,
    manifest: validation.manifest,
    records,
    flags,
  };
}
