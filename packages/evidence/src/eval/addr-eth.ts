import { formatEther, isAddress } from 'viem';

import type {
  RecordEngine,
  EvaluatorResult,
  EngineParams,
  ResolvedRecord,
  SignalEntry,
  AntiSignalEntry,
  Evidence,
  EvaluatorConfidence,
} from './types.js';

const KEY = 'addr.eth' as const;
const ETHERSCAN_V2 = 'https://api.etherscan.io/v2/api';
const CHAIN_ID_SEPOLIA = 11155111;
const SECONDS_PER_DAY = 86_400;

interface EtherscanTx {
  blockNumber?: string;
  timeStamp?: string;
  hash?: string;
  to?: string;
  from?: string;
  value?: string;
  isError?: string;
  contractAddress?: string;
}

interface EtherscanResp {
  status?: string;
  message?: string;
  result?: EtherscanTx[] | string;
}

interface TxListSummary {
  count: number;
  firstTxTimestamp: number | null;
  lastTxTimestamp: number | null;
  txs30d: number;
  deployedContracts: number;
  uniqueBlocks: number;
  error: string | null;
  source: 'etherscan' | 'unavailable';
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

function weightedSum(items: ReadonlyArray<{ value: number; weight: number }>): number {
  return clamp01(items.reduce((sum, item) => sum + item.value * item.weight, 0));
}

function applyAntiSignals(axisValue: number, anti: ReadonlyArray<AntiSignalEntry>): number {
  const totalPenalty = anti.reduce((s, a) => s + a.penalty, 0);
  return clamp01(axisValue - totalPenalty);
}

function apiKey(): string {
  return process.env.ETHERSCAN_API_KEY ?? '';
}

async function fetchTxList(
  address: `0x${string}`,
  signal: AbortSignal,
  fetcher: Parameters<RecordEngine['evaluate']>[1]['fetch'],
  nowSeconds: number,
): Promise<TxListSummary> {
  const url = `${ETHERSCAN_V2}?chainid=${CHAIN_ID_SEPOLIA}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey()}`;
  let response;
  try {
    response = await fetcher(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal,
    });
  } catch (err) {
    return summaryError(`etherscan: ${err instanceof Error ? err.message : String(err)}`);
  }

  let body: EtherscanResp | null = null;
  try {
    body = (await response.json<EtherscanResp>()) ?? null;
  } catch {
    return summaryError(`etherscan: invalid JSON (${response.status})`);
  }
  if (!response.ok) return summaryError(`etherscan: HTTP ${response.status}`);
  if (!body) return summaryError('etherscan: empty body');

  // status="0" + result string = either "No transactions" (count 0) or
  // an API error (missing key, rate limit). Distinguish.
  if (Array.isArray(body.result)) {
    return summarizeTxs(body.result, nowSeconds);
  }
  if (
    body.status === '0' &&
    typeof body.result === 'string' &&
    /no transactions/i.test(body.result)
  ) {
    return {
      count: 0,
      firstTxTimestamp: null,
      lastTxTimestamp: null,
      txs30d: 0,
      deployedContracts: 0,
      uniqueBlocks: 0,
      error: null,
      source: 'etherscan',
    };
  }
  const msg = typeof body.result === 'string' ? body.result : body.message ?? 'malformed body';
  return summaryError(`etherscan: ${msg}`);
}

function summaryError(error: string): TxListSummary {
  return {
    count: 0,
    firstTxTimestamp: null,
    lastTxTimestamp: null,
    txs30d: 0,
    deployedContracts: 0,
    uniqueBlocks: 0,
    error,
    source: 'unavailable',
  };
}

function summarizeTxs(txs: EtherscanTx[], nowSeconds: number): TxListSummary {
  if (txs.length === 0) {
    return {
      count: 0,
      firstTxTimestamp: null,
      lastTxTimestamp: null,
      txs30d: 0,
      deployedContracts: 0,
      uniqueBlocks: 0,
      error: null,
      source: 'etherscan',
    };
  }
  const cutoff30d = nowSeconds - 30 * SECONDS_PER_DAY;
  const blocks = new Set<string>();
  let firstTs = Number.POSITIVE_INFINITY;
  let lastTs = 0;
  let txs30d = 0;
  let deployed = 0;
  for (const tx of txs) {
    const ts = Number(tx.timeStamp ?? '0');
    if (Number.isFinite(ts) && ts > 0) {
      if (ts < firstTs) firstTs = ts;
      if (ts > lastTs) lastTs = ts;
      if (ts >= cutoff30d) txs30d += 1;
    }
    if (tx.blockNumber) blocks.add(tx.blockNumber);
    // Etherscan represents contract creation with empty `to` and a
    // populated `contractAddress` field on the receipt-style record.
    const isCreation = (!tx.to || tx.to === '') && Boolean(tx.contractAddress);
    if (isCreation) deployed += 1;
  }
  return {
    count: txs.length,
    firstTxTimestamp: Number.isFinite(firstTs) ? firstTs : null,
    lastTxTimestamp: lastTs > 0 ? lastTs : null,
    txs30d,
    deployedContracts: deployed,
    uniqueBlocks: blocks.size,
    error: null,
    source: 'etherscan',
  };
}

async function fetchReverseRecord(
  address: `0x${string}`,
  ctx: Parameters<RecordEngine['evaluate']>[1],
): Promise<{ name: string | null; error: string | null }> {
  // Sepolia primary (demo subjects live there); mainnet fallback.
  for (const client of [ctx.rpc.sepolia, ctx.rpc.mainnet]) {
    try {
      // viem's getEnsName returns string | null; never throws on
      // missing reverse record.
      const name = await client.getEnsName({ address });
      if (name) return { name, error: null };
    } catch (err) {
      // Non-fatal: try next client. Capture last error for surfacing.
      ctx.logger.warn('addr.eth reverse lookup failed', {
        chain: client === ctx.rpc.sepolia ? 'sepolia' : 'mainnet',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { name: null, error: null };
}

export const addrEthEngine: RecordEngine = {
  key: KEY,
  defaultParams: {
    weight: 1,
    trustFloor: 0.7,
    trustCeiling: 1.0,
    timeoutMs: 3000,
    thresholds: {
      maxAgeDays: 730,                  // 2 yrs saturates the age signal
      txCountLogCap: 1000,              // log10 normalization ceiling
      maxDeployed: 20,
      recent30dLogCap: 50,
      staleDays: 90,
      sybilSingleBlockMinTxs: 5,        // < 5 txs cannot sybil-trigger
      dormantBalanceEthThreshold: 1,    // > 1 ETH balance + 0 nonce = dormant
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
    const nowSeconds = Math.floor((record.resolvedAtMs || Date.now()) / 1000);

    const [nonce, balanceWei, txList, reverse] = await Promise.all([
      ctx.rpc.sepolia.getTransactionCount({ address }).catch(() => 0),
      ctx.rpc.sepolia.getBalance({ address }).catch(() => 0n),
      fetchTxList(address, ctx.signal, ctx.fetch, nowSeconds),
      fetchReverseRecord(address, ctx),
    ]);

    const t = params.thresholds;
    const maxAgeDays = t.maxAgeDays ?? 730;
    const txCountLogCap = t.txCountLogCap ?? 1000;
    const maxDeployed = t.maxDeployed ?? 20;
    const recent30dLogCap = t.recent30dLogCap ?? 50;
    const staleDays = t.staleDays ?? 90;
    const sybilMinTxs = t.sybilSingleBlockMinTxs ?? 5;
    const dormantBalanceWei =
      BigInt(Math.floor(t.dormantBalanceEthThreshold ?? 1)) * 10n ** 18n;

    // ---- Seniority signals ----
    // Use Etherscan first-tx timestamp when available; fall back to
    // sqrt(nonce) / 20 baseline when API key absent (calibration parity
    // with merged v1 implementation).
    const ageDays =
      txList.firstTxTimestamp !== null
        ? Math.max(0, (nowSeconds - txList.firstTxTimestamp) / SECONDS_PER_DAY)
        : null;
    const ageSignalValue =
      ageDays !== null
        ? clamp01(ageDays / maxAgeDays)
        : clamp01(Math.sqrt(nonce) / 20);
    const ageSignalName =
      ageDays !== null ? 'address_age_days' : 'sepolia_outbound_nonce_fallback';

    const txCountTotal = txList.source === 'etherscan' ? txList.count : nonce;
    const txCountSignalValue = clamp01(
      Math.log10(txCountTotal + 1) / Math.log10(txCountLogCap + 1),
    );

    const deployedSignalValue =
      txList.source === 'etherscan'
        ? clamp01(txList.deployedContracts / maxDeployed)
        : 0;

    const reverseMatch =
      reverse.name !== null && reverse.name.toLowerCase() === record.ensName.toLowerCase();
    const reverseSignalValue = reverseMatch ? 1 : 0;

    const seniorityBreakdown: SignalEntry[] = [
      {
        name: ageSignalName,
        value: ageSignalValue,
        weight: 0.4,
        raw: ageDays !== null ? Math.round(ageDays) : nonce,
      },
      {
        name: 'tx_count_total',
        value: txCountSignalValue,
        weight: 0.3,
        raw: txCountTotal,
      },
      {
        name: 'deployed_contracts',
        value: deployedSignalValue,
        weight: 0.2,
        raw: txList.deployedContracts,
      },
      {
        name: 'reverse_record_match',
        value: reverseSignalValue,
        weight: 0.1,
        raw: reverse.name ?? null,
      },
    ];

    // ---- Relevance signals ----
    const txCount30dSignalValue =
      txList.source === 'etherscan'
        ? clamp01(Math.log10(txList.txs30d + 1) / Math.log10(recent30dLogCap + 1))
        : 0;

    const lastTxAgeDays =
      txList.lastTxTimestamp !== null
        ? Math.max(0, (nowSeconds - txList.lastTxTimestamp) / SECONDS_PER_DAY)
        : null;
    const lastTxSignalValue =
      lastTxAgeDays !== null
        ? clamp01(1 - lastTxAgeDays / staleDays)
        : 0;

    const balanceNonZeroValue = balanceWei > 0n ? 1 : 0;

    const relevanceBreakdown: SignalEntry[] = [
      {
        name: 'tx_count_30d',
        value: txCount30dSignalValue,
        weight: 0.5,
        raw: txList.txs30d,
      },
      {
        name: 'last_tx_age_days',
        value: lastTxSignalValue,
        weight: 0.3,
        raw: lastTxAgeDays !== null ? Math.round(lastTxAgeDays) : null,
      },
      {
        name: 'balance_non_zero',
        value: balanceNonZeroValue,
        weight: 0.2,
        raw: formatEther(balanceWei),
      },
    ];

    // ---- Anti-signals ----
    const antiSignals: AntiSignalEntry[] = [];
    // Sybil: many txs but very few unique blocks (< 25%).
    if (
      txList.source === 'etherscan' &&
      txList.count >= sybilMinTxs &&
      txList.uniqueBlocks > 0 &&
      txList.uniqueBlocks * 4 < txList.count
    ) {
      antiSignals.push({
        name: 'sybil_block_concentration',
        penalty: 0.2,
        reason: `${txList.count} txs across only ${txList.uniqueBlocks} blocks`,
      });
    }
    // Dormant funded: zero outbound activity but non-trivial balance.
    if (nonce === 0 && balanceWei >= dormantBalanceWei) {
      antiSignals.push({
        name: 'dormant_funded',
        penalty: 0.1,
        reason: `${formatEther(balanceWei)} ETH held, no outbound activity`,
      });
    }
    if (txList.error) {
      // Etherscan unavailable is partial-confidence, not a penalty.
      antiSignals.push({
        name: 'etherscan_degraded',
        penalty: 0,
        reason: txList.error,
      });
    }

    // ---- Trust ----
    const trust = reverseMatch
      ? clamp01(params.trustCeiling)
      : clamp01(params.trustFloor);

    const seniorityRaw = weightedSum(seniorityBreakdown);
    const relevanceRaw = weightedSum(relevanceBreakdown);
    const seniority = applyAntiSignals(seniorityRaw, antiSignals);
    const relevance = applyAntiSignals(relevanceRaw, antiSignals);

    const evidence: Evidence[] = [
      { label: 'addr.eth', value: address, source: 'ENS resolver' },
      { label: 'Sepolia nonce', value: String(nonce), source: 'RPC eth_getTransactionCount' },
      { label: 'Sepolia balance', value: `${formatEther(balanceWei)} ETH`, source: 'RPC eth_getBalance' },
      {
        label: 'Etherscan txlist',
        value:
          txList.source === 'etherscan'
            ? `${txList.count} total · ${txList.txs30d} last 30d · ${txList.deployedContracts} deploys`
            : 'unavailable',
        source: 'Etherscan v2',
        link: `${ETHERSCAN_V2}?chainid=${CHAIN_ID_SEPOLIA}&module=account&action=txlist&address=${address}`,
      },
      {
        label: 'First tx',
        value:
          txList.firstTxTimestamp !== null
            ? `${Math.round((nowSeconds - txList.firstTxTimestamp) / SECONDS_PER_DAY)}d ago`
            : 'unknown (etherscan unavailable)',
      },
      {
        label: 'Last tx',
        value:
          txList.lastTxTimestamp !== null
            ? `${Math.round((nowSeconds - txList.lastTxTimestamp) / SECONDS_PER_DAY)}d ago`
            : 'unknown',
      },
      {
        label: 'Reverse record',
        value: reverseMatch
          ? `matches ${record.ensName} (trust → ${trust.toFixed(2)})`
          : reverse.name
            ? `set to ${reverse.name} (does not match)`
            : 'not set',
      },
    ];

    const errors = txList.error ? [txList.error] : [];
    const confidence: EvaluatorConfidence = errors.length === 0 ? 'complete' : 'partial';

    return {
      recordKey: KEY,
      exists: true,
      validity: 1,
      liveness: nonce > 0 || balanceWei > 0n ? 1 : 0,
      seniority,
      relevance,
      trust,
      weight: params.weight,
      signals: { seniorityBreakdown, relevanceBreakdown, antiSignals },
      evidence,
      confidence,
      durationMs: Date.now() - started,
      cacheHit: false,
      errors,
    };
  },
};
