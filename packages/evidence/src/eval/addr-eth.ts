import { formatEther, isAddress } from 'viem';

import type { RecordEngine, EvaluatorResult, EngineParams, ResolvedRecord } from './types.js';

const KEY = 'addr.eth' as const;
const ETHERSCAN_V2 = 'https://api.etherscan.io/v2/api';
const CHAIN_ID = 11155111;

interface EtherscanBody {
  status?: string;
  message?: string;
  result?: unknown;
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

function scoreFromBreakdown(items: ReadonlyArray<{ value: number; weight: number }>): number {
  return clamp01(items.reduce((sum, item) => sum + item.value * item.weight, 0));
}

function apiKey(): string {
  return process.env.ETHERSCAN_API_KEY ?? '';
}

function txCountFromEtherscan(body: EtherscanBody): number | null {
  if (Array.isArray(body.result)) return body.result.length;
  if (
    body.status === '0' &&
    typeof body.result === 'string' &&
    /no transactions/i.test(body.result)
  ) {
    return 0;
  }
  return null;
}

async function fetchEtherscanTxCount(
  address: `0x${string}`,
  signal: AbortSignal,
  fetcher: Parameters<RecordEngine['evaluate']>[1]['fetch'],
): Promise<{ count: number | null; error: string | null; body: EtherscanBody | null }> {
  const url = `${ETHERSCAN_V2}?chainid=${CHAIN_ID}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey()}`;
  const response = await fetcher(url, { method: 'GET', headers: { accept: 'application/json' }, signal });
  let body: EtherscanBody | null = null;
  try {
    body = (await response.json<EtherscanBody>()) ?? null;
  } catch {
    return { count: null, error: `etherscan: invalid JSON (${response.status})`, body: null };
  }
  if (!response.ok) return { count: null, error: `etherscan: HTTP ${response.status}`, body };
  const count = txCountFromEtherscan(body);
  if (count !== null) return { count, error: null, body };
  const msg = typeof body.result === 'string' ? body.result : body.message ?? 'malformed body';
  return { count: null, error: `etherscan: ${msg}`, body };
}

export const addrEthEngine: RecordEngine = {
  key: KEY,
  defaultParams: {
    weight: 1,
    trustFloor: 0.7,
    trustCeiling: 0.7,
    timeoutMs: 2000,
    thresholds: {
      txSqrtDivisor: 20,
      relevanceTxDivisor: 32,
    },
  },
  async evaluate(record: ResolvedRecord, ctx, params: EngineParams): Promise<EvaluatorResult> {
    const started = Date.now();
    if (!record.raw || !isAddress(record.raw)) {
      return {
        recordKey: KEY,
        exists: false,
        validity: 0,
        liveness: 0,
        seniority: 0,
        relevance: 0,
        trust: 0,
        weight: params.weight,
        signals: { seniorityBreakdown: [], relevanceBreakdown: [], antiSignals: [] },
        evidence: [],
        confidence: 'complete',
        durationMs: Date.now() - started,
        cacheHit: false,
        errors: ['addr.eth is absent or not an EVM address'],
      };
    }

    const address = record.raw;
    const [nonce, balanceWei, scan] = await Promise.all([
      ctx.rpc.sepolia.getTransactionCount({ address }),
      ctx.rpc.sepolia.getBalance({ address }),
      fetchEtherscanTxCount(address, ctx.signal, ctx.fetch).catch((err: unknown) => ({
        count: null,
        error: `etherscan: ${err instanceof Error ? err.message : String(err)}`,
        body: null,
      })),
    ]);

    const txSqrtDivisor = params.thresholds.txSqrtDivisor ?? 20;
    const relevanceTxDivisor = params.thresholds.relevanceTxDivisor ?? 32;
    const activityCount = scan.count ?? nonce;
    const seniorityBreakdown = [
      {
        name: 'sepolia_outbound_nonce',
        value: clamp01(Math.sqrt(nonce) / txSqrtDivisor),
        weight: 1,
        raw: nonce,
      },
    ];
    const relevanceBreakdown = [
      {
        name: scan.count === null ? 'sepolia_nonce_fallback' : 'etherscan_tx_count',
        value: clamp01(activityCount / relevanceTxDivisor),
        weight: 1,
        raw: activityCount,
      },
    ];
    const errors = scan.error ? [scan.error] : [];
    const trust = Math.max(params.trustFloor, Math.min(params.trustCeiling, params.trustFloor));

    return {
      recordKey: KEY,
      exists: true,
      validity: 1,
      liveness: nonce > 0 || balanceWei > 0n ? 1 : 0,
      seniority: scoreFromBreakdown(seniorityBreakdown),
      relevance: scoreFromBreakdown(relevanceBreakdown),
      trust,
      weight: params.weight,
      signals: {
        seniorityBreakdown,
        relevanceBreakdown,
        antiSignals: errors.map((reason) => ({ name: 'etherscan_degraded', penalty: 0, reason })),
      },
      evidence: [
        { label: 'addr.eth', value: address, source: 'ENS resolver' },
        { label: 'Sepolia nonce', value: String(nonce), source: 'RPC eth_getTransactionCount' },
        { label: 'Sepolia balance', value: `${formatEther(balanceWei)} ETH`, source: 'RPC eth_getBalance' },
        {
          label: 'Etherscan txlist',
          value: scan.count === null ? 'unavailable' : String(scan.count),
          source: 'Etherscan v2',
          link: `${ETHERSCAN_V2}?chainid=${CHAIN_ID}&module=account&action=txlist&address=${address}`,
        },
      ],
      confidence: errors.length === 0 ? 'complete' : 'partial',
      durationMs: Date.now() - started,
      cacheHit: false,
      errors,
    };
  },
};
