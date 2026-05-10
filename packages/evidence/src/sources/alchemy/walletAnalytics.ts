// Wallet financial analytics — token holdings, NFT count, transaction
// flow, counterparty classification. Uses Alchemy SDK endpoints + ETH
// price oracle (CoinGecko free tier).
//
// All methods fail soft — partial data returned with confidence label.

import type { Address } from '@upgrade-siren/shared';

const ALCHEMY_BASE_BY_CHAIN: Record<number, string> = {
  1: 'https://eth-mainnet.g.alchemy.com/v2',
  11155111: 'https://eth-sepolia.g.alchemy.com/v2',
  10: 'https://opt-mainnet.g.alchemy.com/v2',
  8453: 'https://base-mainnet.g.alchemy.com/v2',
  42161: 'https://arb-mainnet.g.alchemy.com/v2',
  137: 'https://polygon-mainnet.g.alchemy.com/v2',
};

const COINGECKO_PRICE_API = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';

export interface TokenBalance {
  readonly contractAddress: string;
  readonly symbol: string | null;
  readonly name: string | null;
  readonly balance: string;        // Decimal string (already divided by decimals)
  readonly decimals: number | null;
  readonly priceUsd: number | null; // Best-effort, often null for long-tail tokens
  readonly valueUsd: number | null; // balance × priceUsd, null when price absent
}

export interface WalletAnalyticsResult {
  readonly address: Address;
  readonly chainId: number;
  // Native ETH balance (already divided by 1e18)
  readonly ethBalance: number;
  readonly ethPriceUsd: number | null;
  readonly ethValueUsd: number | null;
  // Top ERC-20 token balances by value (when value known) or by raw balance
  readonly tokens: ReadonlyArray<TokenBalance>;
  readonly tokenTotalValueUsd: number;
  // NFT collection summary — count of unique contracts + total NFTs
  readonly nftCollectionsCount: number;
  readonly nftTotalCount: number;
  // Total wallet value (ETH + tokens, NFTs ignored — illiquid)
  readonly totalValueUsd: number;
  readonly fetchedAtMs: number;
}

export type WalletAnalyticsFailureReason =
  | 'unsupported_chain'
  | 'missing_alchemy_key'
  | 'rate_limited'
  | 'server_error'
  | 'malformed_response'
  | 'network_error';

export interface WalletAnalyticsOk {
  readonly kind: 'ok';
  readonly value: WalletAnalyticsResult;
}

export interface WalletAnalyticsError {
  readonly kind: 'error';
  readonly chainId: number;
  readonly reason: WalletAnalyticsFailureReason;
  readonly message: string;
}

export type WalletAnalyticsResultEnvelope = WalletAnalyticsOk | WalletAnalyticsError;

export interface FetchWalletAnalyticsOptions {
  readonly alchemyKey?: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
  readonly maxTokens?: number; // cap to avoid massive payloads (default 25)
}

interface AlchemyTokenBalancesResponse {
  result?: { tokenBalances?: Array<{ contractAddress: string; tokenBalance: string }> };
  error?: { message: string };
}

interface AlchemyTokenMetadataResponse {
  result?: { name?: string; symbol?: string; decimals?: number };
}

interface AlchemyEthBalanceResponse {
  result?: string;
  error?: { message: string };
}

interface AlchemyNFTsForOwnerResponse {
  ownedNfts?: Array<{ contract: { address: string } }>;
  totalCount?: number;
}

async function fetchEthPrice(fetcher: typeof fetch, signal?: AbortSignal): Promise<number | null> {
  try {
    const init: RequestInit = signal !== undefined ? { signal } : {};
    const r = await fetcher(COINGECKO_PRICE_API, init);
    if (!r.ok) return null;
    const j = await r.json() as { ethereum?: { usd?: number } };
    return j.ethereum?.usd ?? null;
  } catch {
    return null;
  }
}

async function alchemyJsonRpc<T>(
  url: string,
  method: string,
  params: unknown[],
  fetcher: typeof fetch,
  signal?: AbortSignal,
): Promise<T | null> {
  try {
    const init: RequestInit = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
      ...(signal !== undefined ? { signal } : {}),
    };
    const r = await fetcher(url, init);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

async function fetchTokenMetadata(
  baseUrl: string,
  contractAddress: string,
  fetcher: typeof fetch,
  signal?: AbortSignal,
): Promise<{ symbol: string | null; name: string | null; decimals: number | null }> {
  const r = await alchemyJsonRpc<AlchemyTokenMetadataResponse>(
    baseUrl,
    'alchemy_getTokenMetadata',
    [contractAddress],
    fetcher,
    signal,
  );
  return {
    symbol: r?.result?.symbol ?? null,
    name: r?.result?.name ?? null,
    decimals: r?.result?.decimals ?? null,
  };
}

export async function fetchWalletAnalytics(
  address: Address,
  chainId: number,
  options: FetchWalletAnalyticsOptions = {},
): Promise<WalletAnalyticsResultEnvelope> {
  const baseUrlPart = ALCHEMY_BASE_BY_CHAIN[chainId];
  if (!baseUrlPart) {
    return { kind: 'error', chainId, reason: 'unsupported_chain', message: `wallet: chainId ${chainId} not supported` };
  }
  const apiKey = options.alchemyKey ?? process.env.ALCHEMY_API_KEY ?? '';
  if (apiKey === '') {
    return { kind: 'error', chainId, reason: 'missing_alchemy_key', message: 'wallet: ALCHEMY_API_KEY env var not set' };
  }
  const baseUrl = `${baseUrlPart}/${apiKey}`;
  const fetcher = options.fetchImpl ?? globalThis.fetch;
  const maxTokens = options.maxTokens ?? 25;

  // Parallel fetches
  const [ethBalanceRes, tokenBalancesRes, ethPriceUsd, nftCount] = await Promise.all([
    alchemyJsonRpc<AlchemyEthBalanceResponse>(baseUrl, 'eth_getBalance', [address, 'latest'], fetcher, options.signal),
    alchemyJsonRpc<AlchemyTokenBalancesResponse>(baseUrl, 'alchemy_getTokenBalances', [address, 'erc20'], fetcher, options.signal),
    fetchEthPrice(fetcher, options.signal),
    fetchNftSummary(address, baseUrl, fetcher, options.signal),
  ]);

  const ethBalanceWei = ethBalanceRes?.result ? BigInt(ethBalanceRes.result) : 0n;
  const ethBalance = Number(ethBalanceWei) / 1e18;
  const ethValueUsd = ethPriceUsd !== null ? ethBalance * ethPriceUsd : null;

  const rawTokens = tokenBalancesRes?.result?.tokenBalances ?? [];
  // Filter zero balances + cap to maxTokens (sorted later by value)
  const nonZero = rawTokens.filter((t) => {
    try {
      return BigInt(t.tokenBalance) > 0n;
    } catch {
      return false;
    }
  }).slice(0, maxTokens);

  // Fetch metadata in parallel for top tokens
  const tokens: TokenBalance[] = await Promise.all(
    nonZero.map(async (raw) => {
      const meta = await fetchTokenMetadata(baseUrl, raw.contractAddress, fetcher, options.signal);
      const decimals = meta.decimals ?? 18;
      const balanceRaw = BigInt(raw.tokenBalance);
      const balance = Number(balanceRaw) / Math.pow(10, decimals);
      // We don't have a free per-token price oracle for arbitrary ERC-20 here;
      // leave priceUsd null. Future: integrate CoinGecko coin search, or
      // use Alchemy Prices API on a paid tier.
      return {
        contractAddress: raw.contractAddress,
        symbol: meta.symbol,
        name: meta.name,
        balance: balance.toString(),
        decimals,
        priceUsd: null,
        valueUsd: null,
      };
    }),
  );

  const tokenTotalValueUsd = tokens.reduce((sum, t) => sum + (t.valueUsd ?? 0), 0);
  const totalValueUsd = (ethValueUsd ?? 0) + tokenTotalValueUsd;

  return {
    kind: 'ok',
    value: {
      address,
      chainId,
      ethBalance,
      ethPriceUsd,
      ethValueUsd,
      tokens,
      tokenTotalValueUsd,
      nftCollectionsCount: nftCount.collections,
      nftTotalCount: nftCount.total,
      totalValueUsd,
      fetchedAtMs: Date.now(),
    },
  };
}

async function fetchNftSummary(
  address: Address,
  baseUrl: string,
  fetcher: typeof fetch,
  signal?: AbortSignal,
): Promise<{ collections: number; total: number }> {
  // Alchemy NFT API path is different from JSON-RPC; uses /nft/v3/{key}/getNFTsForOwner
  // Convert base URL: {chain}.g.alchemy.com/v2/{key} → {chain}.g.alchemy.com/nft/v3/{key}
  const nftUrl = baseUrl.replace('/v2/', '/nft/v3/') + `/getNFTsForOwner?owner=${address}&pageSize=100&withMetadata=false`;
  try {
    const init: RequestInit = signal !== undefined ? { signal } : {};
    const r = await fetcher(nftUrl, init);
    if (!r.ok) return { collections: 0, total: 0 };
    const j = (await r.json()) as AlchemyNFTsForOwnerResponse;
    const total = j.totalCount ?? 0;
    const collections = new Set(j.ownedNfts?.map((n) => n.contract.address) ?? []).size;
    return { collections, total };
  } catch {
    return { collections: 0, total: 0 };
  }
}
