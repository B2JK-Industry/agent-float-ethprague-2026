import { createPublicClient, http, type PublicClient } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

import { withRetry, type RetryOptions } from '../network/retry.js';
import {
  ENSIP_26_RECORD_KEYS,
  UPGRADE_SIREN_RECORD_KEYS,
  type EnsRecordSet,
  type EnsResolutionError,
  type EnsResolutionFlags,
  type EnsResolutionResult,
  type Ensip26RecordKey,
  type UpgradeSirenRecordKey,
} from './types.js';

// Codex #51: opt-in retry on transient ENS RPC errors via `retry` option.
export interface ResolveEnsRecordsOptions {
  readonly chainId?: number;
  readonly rpcUrl?: string;
  readonly client?: PublicClient;
  readonly retry?: RetryOptions | true;
}

function resolveRetryOptions(retry: RetryOptions | true | undefined): RetryOptions | undefined {
  if (retry === undefined) return undefined;
  if (retry === true) return {};
  return retry;
}

const ENS_NAME_RE = /^(?:[a-z0-9_-]+\.)+(?:eth|test)$/i;

function isPlausibleEnsName(name: string): boolean {
  if (typeof name !== 'string' || name.length === 0 || name.length > 255) return false;
  if (!ENS_NAME_RE.test(name)) return false;
  const labels = name.split('.');
  return labels.every((label) => label.length > 0 && label.length <= 63);
}

function resolveClient(chainId: number, options: ResolveEnsRecordsOptions): PublicClient | EnsResolutionError {
  if (options.client) return options.client;
  let chain;
  if (chainId === mainnet.id) chain = mainnet;
  else if (chainId === sepolia.id) chain = sepolia;
  else {
    return {
      kind: 'error',
      reason: 'unsupported_chain',
      message: `ens.resolve: unsupported chainId ${chainId}; expected ${mainnet.id} (mainnet) or ${sepolia.id} (sepolia)`,
    };
  }
  return createPublicClient({ chain, transport: http(options.rpcUrl) });
}

async function getText(
  client: PublicClient,
  name: string,
  key: UpgradeSirenRecordKey | Ensip26RecordKey,
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

export async function resolveEnsRecords(
  name: string,
  options: ResolveEnsRecordsOptions = {},
): Promise<EnsResolutionResult> {
  if (!isPlausibleEnsName(name)) {
    return {
      kind: 'error',
      reason: 'invalid_name',
      message: `ens.resolve: invalid ENS name ${JSON.stringify(name)}`,
    };
  }

  const chainId = options.chainId ?? mainnet.id;
  const clientOrError = resolveClient(chainId, options);
  if ('kind' in clientOrError && clientOrError.kind === 'error') {
    return clientOrError;
  }
  const client = clientOrError as PublicClient;

  const retryOpts = resolveRetryOptions(options.retry);
  const [
    chainIdRead,
    proxyRead,
    ownerRead,
    schemaRead,
    manifestRead,
    agentContextRead,
    agentEndpointWebRead,
    agentEndpointMcpRead,
  ] = await Promise.all([
    getText(client, name, UPGRADE_SIREN_RECORD_KEYS.chainId, retryOpts),
    getText(client, name, UPGRADE_SIREN_RECORD_KEYS.proxy, retryOpts),
    getText(client, name, UPGRADE_SIREN_RECORD_KEYS.owner, retryOpts),
    getText(client, name, UPGRADE_SIREN_RECORD_KEYS.schema, retryOpts),
    getText(client, name, UPGRADE_SIREN_RECORD_KEYS.upgradeManifest, retryOpts),
    getText(client, name, ENSIP_26_RECORD_KEYS.agentContext, retryOpts),
    getText(client, name, ENSIP_26_RECORD_KEYS.agentEndpointWeb, retryOpts),
    getText(client, name, ENSIP_26_RECORD_KEYS.agentEndpointMcp, retryOpts),
  ]);

  const reads = [
    chainIdRead,
    proxyRead,
    ownerRead,
    schemaRead,
    manifestRead,
    agentContextRead,
    agentEndpointWebRead,
    agentEndpointMcpRead,
  ] as const;
  const failed = reads.find((r) => r.kind === 'error');
  if (failed && failed.kind === 'error') {
    const cause = failed.cause;
    return {
      kind: 'error',
      reason: 'rpc_error',
      message: `ens.resolve: getEnsText failed - ${cause instanceof Error ? cause.message : String(cause)}`,
      cause,
    };
  }

  const valueOrNull = (r: { kind: 'ok'; value: string | null } | { kind: 'error'; cause: unknown }) =>
    r.kind === 'ok' ? r.value : null;

  const chainIdValue = valueOrNull(chainIdRead);
  const proxyValue = valueOrNull(proxyRead);
  const ownerValue = valueOrNull(ownerRead);
  const schemaValue = valueOrNull(schemaRead);
  const manifestValue = valueOrNull(manifestRead);
  const agentContextValue = valueOrNull(agentContextRead);
  const agentEndpointWebValue = valueOrNull(agentEndpointWebRead);
  const agentEndpointMcpValue = valueOrNull(agentEndpointMcpRead);

  const records: EnsRecordSet = {
    chainId: chainIdValue,
    proxy: proxyValue,
    owner: ownerValue,
    schema: schemaValue,
    upgradeManifestRaw: manifestValue,
  };

  const flags: EnsResolutionFlags = {
    chainIdPresent: chainIdValue !== null,
    proxyPresent: proxyValue !== null,
    ownerPresent: ownerValue !== null,
    schemaPresent: schemaValue !== null,
    upgradeManifestPresent: manifestValue !== null,
    agentContextPresent: agentContextValue !== null,
    agentEndpointWebPresent: agentEndpointWebValue !== null,
    agentEndpointMcpPresent: agentEndpointMcpValue !== null,
  };

  const anyPresent =
    flags.chainIdPresent ||
    flags.proxyPresent ||
    flags.ownerPresent ||
    flags.schemaPresent ||
    flags.upgradeManifestPresent;

  return {
    kind: 'ok',
    name,
    chainId,
    records,
    flags,
    anyUpgradeSirenRecordPresent: anyPresent,
    agentContext: agentContextValue,
    agentEndpointWeb: agentEndpointWebValue,
    agentEndpointMcp: agentEndpointMcpValue,
  };
}
