// Etherscan source-code fallback fetcher.
//
// Many contracts get verified on Etherscan but never on Sourcify
// (e.g. Gitcoin, OpenZeppelin contracts, most DAOs). When Sourcify
// all-chains returns 0 entries for a subject's address but the
// address has on-chain bytecode, the orchestrator calls this fetcher
// as a fallback to surface the verification status from Etherscan.
//
// Etherscan v2 unified API endpoint:
//   https://api.etherscan.io/v2/api?chainid=N&module=contract&action=getsourcecode&address=X&apikey=K
//
// Response shape (chainsupported list at https://docs.etherscan.io/etherscan-v2/contract-verification/multichain-verification):
//   { status: "1", message: "OK", result: [{
//       SourceCode: "...",        // empty string when not verified
//       ABI: "...",               // empty when not verified
//       ContractName: "...",
//       CompilerVersion: "v0.8.20+commit.a1b79de6",
//       OptimizationUsed: "1",
//       Runs: "200",
//       EVMVersion: "default",
//       LicenseType: "MIT",
//       Proxy: "0",
//       Implementation: "",
//   }]}
//
// Score-engine treatment: Etherscan-verified contributes a partial
// boost to compileSuccess (lower trust than Sourcify because we cannot
// reproduce the build deterministically — Etherscan accepts user-
// uploaded source without bytecode-to-source proof in many cases).

import type { Address } from '@upgrade-siren/shared';
import type { FetchLike } from '../../sourcify/types.js';

const ETHERSCAN_V2_BASE = 'https://api.etherscan.io/v2/api';

// Chains we try fallback on. Order matters: mainnet first (most likely),
// then common L2s. Each chainId maps to a Etherscan-supported chain.
export const ETHERSCAN_FALLBACK_CHAINS: ReadonlyArray<number> = [
  1,         // Ethereum mainnet
  11155111,  // Sepolia
  10,        // Optimism
  8453,      // Base
  42161,     // Arbitrum One
  137,       // Polygon
];

export interface EtherscanSourceCodeResult {
  readonly chainId: number;
  readonly address: Address;
  readonly verified: boolean;
  readonly contractName: string | null;
  readonly compilerVersion: string | null;
  readonly optimizationUsed: boolean;
  readonly runs: number | null;
  readonly evmVersion: string | null;
  readonly licenseType: string | null;
  readonly isProxy: boolean;
  readonly implementationAddress: string | null;
  // Source code length (bytes). Useful for "is this a real contract or
  // just a 1-line wrapper" gate. null when not verified.
  readonly sourceCodeLength: number | null;
}

export type EtherscanFallbackFailureReason =
  | 'unsupported_chain'
  | 'rate_limited'
  | 'server_error'
  | 'malformed_response'
  | 'network_error'
  | 'missing_api_key';

export interface EtherscanFallbackOk {
  readonly kind: 'ok';
  // Mirror of value.chainId at top level for ergonomic UI consumption
  // (matches EtherscanFallbackError's discriminator shape).
  readonly chainId: number;
  readonly value: EtherscanSourceCodeResult;
}

export interface EtherscanFallbackError {
  readonly kind: 'error';
  readonly chainId: number;
  readonly reason: EtherscanFallbackFailureReason;
  readonly message: string;
  readonly httpStatus?: number;
}

export type EtherscanFallbackResult = EtherscanFallbackOk | EtherscanFallbackError;

export interface FetchEtherscanSourceCodeOptions {
  readonly apiKey?: string;
  readonly fetchImpl?: FetchLike;
  readonly baseUrl?: string;
  readonly signal?: AbortSignal;
}

interface RawEtherscanSourceResult {
  SourceCode?: string;
  ABI?: string;
  ContractName?: string;
  CompilerVersion?: string;
  OptimizationUsed?: string;
  Runs?: string;
  EVMVersion?: string;
  LicenseType?: string;
  Proxy?: string;
  Implementation?: string;
}

interface RawEtherscanResponse {
  status?: string;
  message?: string;
  result?: RawEtherscanSourceResult[] | string;
}

function parseInt10(raw: string | undefined): number | null {
  if (raw === undefined || raw === '') return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function isContractActuallyVerified(raw: RawEtherscanSourceResult): boolean {
  // Etherscan returns SourceCode="" when not verified, even though the
  // result array always has 1 entry. ABI="Contract source code not verified"
  // is the canonical failure marker.
  const src = raw.SourceCode ?? '';
  if (src.length === 0) return false;
  const abi = raw.ABI ?? '';
  if (abi === 'Contract source code not verified') return false;
  return true;
}

export async function fetchEtherscanSourceCode(
  address: Address,
  chainId: number,
  options: FetchEtherscanSourceCodeOptions = {},
): Promise<EtherscanFallbackResult> {
  if (!ETHERSCAN_FALLBACK_CHAINS.includes(chainId)) {
    return {
      kind: 'error',
      chainId,
      reason: 'unsupported_chain',
      message: `etherscan-fallback: chainId ${chainId} not in supported set`,
    };
  }

  const apiKey = options.apiKey ?? process.env.ETHERSCAN_API_KEY ?? '';
  if (apiKey === '') {
    // Etherscan v2 returns "Missing/Invalid API Key" without a key.
    // Surface it explicitly so the orchestrator can render a helpful
    // hint in the drawer.
    return {
      kind: 'error',
      chainId,
      reason: 'missing_api_key',
      message: 'etherscan-fallback: ETHERSCAN_API_KEY env var not set',
    };
  }

  const fetcher = options.fetchImpl ?? globalThis.fetch;
  const base = options.baseUrl ?? ETHERSCAN_V2_BASE;
  const url = `${base}?chainid=${chainId}&module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;

  let response: Response;
  try {
    const init: RequestInit = options.signal !== undefined ? { signal: options.signal } : {};
    response = await fetcher(url, init) as unknown as Response;
  } catch (err) {
    return {
      kind: 'error',
      chainId,
      reason: 'network_error',
      message: `etherscan-fallback: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (response.status === 429) {
    return { kind: 'error', chainId, reason: 'rate_limited', message: 'etherscan-fallback: HTTP 429', httpStatus: 429 };
  }
  if (response.status >= 500) {
    return { kind: 'error', chainId, reason: 'server_error', message: `etherscan-fallback: HTTP ${response.status}`, httpStatus: response.status };
  }
  if (!response.ok) {
    return { kind: 'error', chainId, reason: 'server_error', message: `etherscan-fallback: HTTP ${response.status}`, httpStatus: response.status };
  }

  let body: RawEtherscanResponse;
  try {
    body = (await response.json()) as RawEtherscanResponse;
  } catch {
    return { kind: 'error', chainId, reason: 'malformed_response', message: 'etherscan-fallback: invalid JSON' };
  }

  // Etherscan returns status="0" + result=string for errors like rate-limit
  // or invalid API key.
  if (body.status === '0' && typeof body.result === 'string') {
    const msg = body.result;
    if (/api key/i.test(msg)) {
      return { kind: 'error', chainId, reason: 'missing_api_key', message: `etherscan-fallback: ${msg}` };
    }
    if (/rate limit/i.test(msg) || /max calls/i.test(msg)) {
      return { kind: 'error', chainId, reason: 'rate_limited', message: `etherscan-fallback: ${msg}` };
    }
    return { kind: 'error', chainId, reason: 'server_error', message: `etherscan-fallback: ${msg}` };
  }

  if (!Array.isArray(body.result) || body.result.length === 0) {
    return { kind: 'error', chainId, reason: 'malformed_response', message: 'etherscan-fallback: result array empty' };
  }

  const raw = body.result[0]!;
  const verified = isContractActuallyVerified(raw);
  const isProxy = raw.Proxy === '1';
  const implementationAddress = isProxy && raw.Implementation && raw.Implementation !== ''
    ? raw.Implementation
    : null;

  return {
    kind: 'ok',
    chainId,
    value: {
      chainId,
      address,
      verified,
      contractName: raw.ContractName ?? null,
      compilerVersion: raw.CompilerVersion ?? null,
      optimizationUsed: raw.OptimizationUsed === '1',
      runs: parseInt10(raw.Runs),
      evmVersion: raw.EVMVersion ?? null,
      licenseType: raw.LicenseType ?? null,
      isProxy,
      implementationAddress,
      sourceCodeLength: verified ? (raw.SourceCode ?? '').length : null,
    },
  };
}

// Etherscan Free tier rate limit: 3 calls/sec. Parallel fan-out across
// 6 chains immediately exceeds this — last 3 calls return rate_limited.
// Sequential fetch with 350ms delay (~2.85 calls/sec, headroom for jitter)
// stays under the limit. Total wall time ≈ 6 * 350ms = 2.1s + per-call
// HTTP latency ≈ 3-4s total — well under the 12s page deadline.
//
// Pro tier (paid) gets 100 req/sec — for that case, parallel fan-out
// would be optimal, but Free tier is the demo default.
const ETHERSCAN_FREE_TIER_DELAY_MS = 350;

export async function fetchEtherscanSourceCodeMultiChain(
  address: Address,
  options: FetchEtherscanSourceCodeOptions & {
    readonly chainIds?: ReadonlyArray<number>;
    readonly parallel?: boolean;  // override for Pro-tier callers
  } = {},
): Promise<ReadonlyArray<EtherscanFallbackResult>> {
  const chains = options.chainIds ?? ETHERSCAN_FALLBACK_CHAINS;
  if (options.parallel === true) {
    return Promise.all(chains.map((chainId) => fetchEtherscanSourceCode(address, chainId, options)));
  }
  // Sequential with rate-limit-safe delay between calls.
  const results: EtherscanFallbackResult[] = [];
  for (let i = 0; i < chains.length; i++) {
    const chainId = chains[i]!;
    const result = await fetchEtherscanSourceCode(address, chainId, options);
    results.push(result);
    if (i < chains.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, ETHERSCAN_FREE_TIER_DELAY_MS));
    }
  }
  return results;
}
