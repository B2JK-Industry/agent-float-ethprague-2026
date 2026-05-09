// US-115b on-chain transfer-count enrichment. EPIC §8.3 P1 signals:
//
//   transferCountRecent90d : Σ outbound + inbound transfers in 90 days
//   transferCountTotal     : lifetime total transfer count
//
// Two backends. Caller picks one (or both with provider preference) by
// passing the env-keyed configuration. When neither is configured, the
// orchestrator falls back to score-engine's `nonce / cap 1000` rule.

import type { Address } from '@upgrade-siren/shared';

import { NetworkUnavailable, retryableFetch, type RetryOptions } from '../../network/retry.js';
import type { FetchLike } from '../../sourcify/types.js';

export type TransferCountProvider = 'alchemy' | 'etherscan';

export interface TransferCountsResult {
  readonly chainId: number;
  readonly address: Address;
  readonly transferCountRecent90d: number;
  readonly transferCountTotal: number;
  readonly provider: TransferCountProvider;
}

export type TransferCountsFailureReason =
  | 'no_provider_configured'
  | 'unsupported_chain'
  | 'rate_limited'
  | 'server_error'
  | 'malformed_response'
  | 'network_error';

export interface TransferCountsOk {
  readonly kind: 'ok';
  readonly value: TransferCountsResult;
}

export interface TransferCountsError {
  readonly kind: 'error';
  readonly reason: TransferCountsFailureReason;
  readonly message: string;
  readonly httpStatus?: number;
}

export type TransferCountsFetchResult = TransferCountsOk | TransferCountsError;

export interface FetchTransferCountsOptions {
  // Anchor for the 90-day window. Pure-function discipline.
  readonly nowSeconds: number;
  // audit-round-7 P1 #14: real chain head, used to anchor the
  // `fromBlock` for Alchemy's recent-90d window. Without this, the
  // previous code computed `fromBlock = cutoffSec / 12` ≈ 148M (treating
  // every unix second since epoch as a 12s mainnet block) — far above
  // the real mainnet head ~22M, so Alchemy returned 0 transfers for
  // every address. Callers (orchestrator) inject the real `latestBlock`
  // they already fetched in fetchOnchainActivity.
  readonly nowBlock?: bigint;
  // Optional indexer backend selection. When neither key is present,
  // returns kind:'error' reason:'no_provider_configured' so the
  // orchestrator falls back to the nonce path.
  readonly alchemyApiKey?: string;
  readonly etherscanApiKey?: string;
  // Default order is alchemy → etherscan. When alchemy errors, we cascade
  // to etherscan if its key is configured. Both errored → first error
  // surfaces.
  readonly providerOrder?: ReadonlyArray<TransferCountProvider>;
  readonly fetchImpl?: FetchLike;
  readonly retry?: RetryOptions | true;
  readonly alchemyBaseUrl?: string;
  readonly etherscanBaseUrl?: string;
  // Block cutoff for the 90-day window. When set, takes precedence over
  // nowBlock-derived computation. Tests use this for determinism.
  readonly fromBlockOverride?: bigint;
}

const SECONDS_PER_DAY = 86_400;
const MAINNET_BLOCK_TIME_SECONDS = 12;
const DEFAULT_ALCHEMY_BASE = 'https://eth-mainnet.g.alchemy.com/v2';
// audit-round-7 P1 #14 (V1 vs V2): Etherscan's multichain endpoint is
// served at `/v2/api` with a `chainid=` query parameter. The previous
// `/api` path was Etherscan v1 (chain-specific subdomains, no chainid).
// Hybridising — v1 path with v2 chainid query — works for mainnet by
// luck on the fallback to api.etherscan.io but fails for sepolia and
// produces inconsistent rate-limit and key handling.
const DEFAULT_ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';

function resolveRetryOptions(retry: RetryOptions | true | undefined): RetryOptions | undefined {
  if (retry === undefined) return undefined;
  if (retry === true) return {};
  return retry;
}

function alchemyChainSubdomain(chainId: number): string | null {
  if (chainId === 1) return 'eth-mainnet';
  if (chainId === 11155111) return 'eth-sepolia';
  return null;
}

function etherscanChainParam(chainId: number): number | null {
  // Etherscan v2 uses ?chainid=... — pass through.
  if (chainId === 1 || chainId === 11155111) return chainId;
  return null;
}

interface AlchemyTransfersBody {
  readonly result?: {
    readonly transfers?: ReadonlyArray<unknown>;
  };
}

function parseAlchemyTransferCount(raw: unknown): number | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as AlchemyTransfersBody;
  const transfers = body.result?.transfers;
  if (!Array.isArray(transfers)) return null;
  return transfers.length;
}

interface EtherscanTxlistBody {
  readonly status?: string;
  readonly result?: ReadonlyArray<unknown> | string;
}

function parseEtherscanTxlistCount(raw: unknown, nowCutoffSec?: number): number | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as EtherscanTxlistBody;
  // Etherscan returns status:'1' on success, status:'0' with result string
  // on "no records found" — that's a count of 0, not an error.
  if (body.status === '0') {
    if (typeof body.result === 'string' && /no transactions/i.test(body.result)) return 0;
    return null;
  }
  if (!Array.isArray(body.result)) return null;
  if (nowCutoffSec === undefined) return body.result.length;
  let count = 0;
  for (const item of body.result) {
    if (!item || typeof item !== 'object') continue;
    const ts = (item as { timeStamp?: unknown }).timeStamp;
    if (typeof ts !== 'string') continue;
    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum)) continue;
    if (tsNum >= nowCutoffSec) count += 1;
  }
  return count;
}

// audit-round-7 P1 #14 (outbound-only): Alchemy's
// `alchemy_getAssetTransfers` filters by `fromAddress` OR `toAddress`,
// not both at once. The previous implementation only sent `fromAddress`,
// missing every inbound transfer. EPIC §8.3 mandates Σ outbound +
// inbound. Issue two RPC calls per category and sum the results. Two
// extra RPC trips per address but still well under the per-source
// budget; the score quality bump for inbound-heavy addresses (every
// receiver-style contract) is significant.
async function alchemyTransferCountForDirection(
  url: string,
  fromBlockHex: string,
  filterField: 'fromAddress' | 'toAddress',
  filterValue: Address,
  fetchImpl: FetchLike,
): Promise<{ kind: 'count'; value: number } | TransferCountsError> {
  const params = {
    [filterField]: filterValue,
    category: ['external', 'erc20', 'erc721', 'erc1155'],
    withMetadata: false,
    excludeZeroValue: false,
    maxCount: '0x3e8',
    fromBlock: fromBlockHex,
  };
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [params],
      }),
    });
  } catch (err) {
    if (err instanceof NetworkUnavailable) {
      return { kind: 'error', reason: 'network_error', message: `alchemy: ${err.message}` };
    }
    return { kind: 'error', reason: 'network_error', message: `alchemy: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (response.status === 429) return { kind: 'error', reason: 'rate_limited', message: 'alchemy: 429', httpStatus: 429 };
  if (response.status >= 500) return { kind: 'error', reason: 'server_error', message: `alchemy: ${response.status}`, httpStatus: response.status };
  if (response.status < 200 || response.status >= 300) return { kind: 'error', reason: 'server_error', message: `alchemy: ${response.status}`, httpStatus: response.status };
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { kind: 'error', reason: 'malformed_response', message: 'alchemy: invalid JSON' };
  }
  const count = parseAlchemyTransferCount(body);
  if (count === null) return { kind: 'error', reason: 'malformed_response', message: 'alchemy: missing result.transfers' };
  return { kind: 'count', value: count };
}

async function fetchAlchemyAssetTransfers(
  chainId: number,
  address: Address,
  fromBlock: bigint,
  apiKey: string,
  fetchImpl: FetchLike,
  baseUrl: string,
  category: 'recent' | 'total',
): Promise<{ kind: 'count'; value: number } | TransferCountsError> {
  const subdomain = alchemyChainSubdomain(chainId);
  if (subdomain === null) {
    return { kind: 'error', reason: 'unsupported_chain', message: `alchemy: unsupported chainId ${chainId}` };
  }
  const url = `${baseUrl.replace('eth-mainnet', subdomain)}/${apiKey}`;
  const fromBlockHex = category === 'recent' ? `0x${fromBlock.toString(16)}` : '0x0';

  // Issue two RPCs in parallel: outbound (fromAddress) + inbound
  // (toAddress). Sum the results — bidirectional transfer count.
  const [outRes, inRes] = await Promise.all([
    alchemyTransferCountForDirection(url, fromBlockHex, 'fromAddress', address, fetchImpl),
    alchemyTransferCountForDirection(url, fromBlockHex, 'toAddress', address, fetchImpl),
  ]);
  if (outRes.kind === 'error') return outRes;
  if (inRes.kind === 'error') return inRes;
  return { kind: 'count', value: outRes.value + inRes.value };
}

async function fetchEtherscanTxlist(
  chainId: number,
  address: Address,
  apiKey: string,
  fetchImpl: FetchLike,
  baseUrl: string,
  nowCutoffSec: number | undefined,
): Promise<{ kind: 'count'; value: number } | TransferCountsError> {
  const chainParam = etherscanChainParam(chainId);
  if (chainParam === null) {
    return { kind: 'error', reason: 'unsupported_chain', message: `etherscan: unsupported chainId ${chainId}` };
  }
  const url = `${baseUrl}?chainid=${chainParam}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
  let response: Response;
  try {
    response = await fetchImpl(url, { method: 'GET', headers: { accept: 'application/json' } });
  } catch (err) {
    if (err instanceof NetworkUnavailable) {
      return { kind: 'error', reason: 'network_error', message: `etherscan: ${err.message}` };
    }
    return { kind: 'error', reason: 'network_error', message: `etherscan: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (response.status === 429) return { kind: 'error', reason: 'rate_limited', message: 'etherscan: 429', httpStatus: 429 };
  if (response.status >= 500) return { kind: 'error', reason: 'server_error', message: `etherscan: ${response.status}`, httpStatus: response.status };
  if (response.status < 200 || response.status >= 300) return { kind: 'error', reason: 'server_error', message: `etherscan: ${response.status}`, httpStatus: response.status };
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { kind: 'error', reason: 'malformed_response', message: 'etherscan: invalid JSON' };
  }
  const count = parseEtherscanTxlistCount(body, nowCutoffSec);
  if (count === null) return { kind: 'error', reason: 'malformed_response', message: 'etherscan: malformed body' };
  return { kind: 'count', value: count };
}

// Fetches both recent-90d and total transfer counts. Per EPIC §8.3 the
// recent count powers `relevance.onchainRecency`; total is surfaced for
// the drawer.
//
// Provider precedence (default): alchemy → etherscan. When alchemy
// errors, cascades to etherscan if configured. Both error → returns the
// alchemy error verbatim. No keys configured → no_provider_configured.
export async function fetchOnchainTransferCounts(
  chainId: number,
  address: Address,
  options: FetchTransferCountsOptions,
): Promise<TransferCountsFetchResult> {
  const baseFetch: FetchLike = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const retryOpts = resolveRetryOptions(options.retry);
  const fetchImpl: FetchLike = retryOpts ? retryableFetch(baseFetch, retryOpts) : baseFetch;

  const order: ReadonlyArray<TransferCountProvider> = options.providerOrder ?? ['alchemy', 'etherscan'];
  const cutoffSec = options.nowSeconds - 90 * SECONDS_PER_DAY;
  // audit-round-7 P1 #14 (nowBlock): when caller supplies a real
  // `nowBlock` (the latest block they observed in fetchOnchainActivity),
  // derive `fromBlock = nowBlock - (90 days / 12s)`. Without that
  // anchor the previous formula `cutoffSec / 12` ≈ 148M dwarfed real
  // mainnet head ~22M, so the Alchemy filter never matched any blocks
  // and recent-90d transfer counts came back as 0 even for active
  // contracts. fromBlockOverride still wins (test determinism).
  const blocksPerWindow = BigInt(Math.floor((90 * SECONDS_PER_DAY) / MAINNET_BLOCK_TIME_SECONDS));
  const fromBlockFromNowBlock = options.nowBlock !== undefined
    ? (options.nowBlock > blocksPerWindow ? options.nowBlock - blocksPerWindow : 0n)
    : undefined;
  const fromBlockFromCutoff = BigInt(Math.max(0, Math.floor(cutoffSec / MAINNET_BLOCK_TIME_SECONDS)));
  const fromBlock =
    options.fromBlockOverride ?? fromBlockFromNowBlock ?? fromBlockFromCutoff;

  let firstError: TransferCountsError | null = null;

  for (const provider of order) {
    if (provider === 'alchemy' && options.alchemyApiKey && options.alchemyApiKey.length > 0) {
      const recentRes = await fetchAlchemyAssetTransfers(
        chainId,
        address,
        fromBlock,
        options.alchemyApiKey,
        fetchImpl,
        options.alchemyBaseUrl ?? DEFAULT_ALCHEMY_BASE,
        'recent',
      );
      if (recentRes.kind === 'error') {
        firstError = firstError ?? recentRes;
        continue;
      }
      const totalRes = await fetchAlchemyAssetTransfers(
        chainId,
        address,
        0n,
        options.alchemyApiKey,
        fetchImpl,
        options.alchemyBaseUrl ?? DEFAULT_ALCHEMY_BASE,
        'total',
      );
      if (totalRes.kind === 'error') {
        firstError = firstError ?? totalRes;
        continue;
      }
      return {
        kind: 'ok',
        value: {
          chainId,
          address,
          transferCountRecent90d: recentRes.value,
          transferCountTotal: totalRes.value,
          provider: 'alchemy',
        },
      };
    }
    if (provider === 'etherscan' && options.etherscanApiKey && options.etherscanApiKey.length > 0) {
      const recentRes = await fetchEtherscanTxlist(
        chainId,
        address,
        options.etherscanApiKey,
        fetchImpl,
        options.etherscanBaseUrl ?? DEFAULT_ETHERSCAN_BASE,
        cutoffSec,
      );
      if (recentRes.kind === 'error') {
        firstError = firstError ?? recentRes;
        continue;
      }
      const totalRes = await fetchEtherscanTxlist(
        chainId,
        address,
        options.etherscanApiKey,
        fetchImpl,
        options.etherscanBaseUrl ?? DEFAULT_ETHERSCAN_BASE,
        undefined,
      );
      if (totalRes.kind === 'error') {
        firstError = firstError ?? totalRes;
        continue;
      }
      return {
        kind: 'ok',
        value: {
          chainId,
          address,
          transferCountRecent90d: recentRes.value,
          transferCountTotal: totalRes.value,
          provider: 'etherscan',
        },
      };
    }
  }

  if (firstError !== null) return firstError;
  return {
    kind: 'error',
    reason: 'no_provider_configured',
    message: 'onchain.transferCounts: neither ALCHEMY_API_KEY nor ETHERSCAN_API_KEY configured',
  };
}
