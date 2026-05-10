// US-131 — server-only data adapter for `/b/[name]`. Bridges Stream B's
// Bench Mode evidence + score primitives (US-117 orchestrator + US-118
// score engine) to the route's render surface.
//
// HOTFIX 2026-05-09 (US-117-hotfix-timeout): Vercel function returns
// HTTP 000 / 70s timeout / 0-byte body on /b/<any-public-read-subject>
// (e.g. /b/vitalik.eth). Root cause: orchestrator US-117 uses
// Promise.allSettled for per-source fan-out but ENFORCES NO PER-SOURCE
// DEADLINE; one slow source (likely Sourcify all-chains lookup or ENS
// subgraph) blocks the entire 60s Vercel function budget.
//
// Page-level fix: wrap orchestrateSubject() in a 12s deadline. If the
// orchestrator misses the budget, /b/[name] renders a typed error
// surface ("orchestrator_timeout") instead of a 60s blank page. The
// product still degrades gracefully — judges see "Bench evaluation
// failed · timeout 12000ms" with the subject name, not a hung tab.
//
// Per-source timeouts INSIDE the orchestrator are the cleaner long-
// term fix (preserve partial results from sources that DID respond)
// and live in Stream B's domain. Tracking ticket: US-117-orchestrator-
// per-source-timeout (Stream B follow-up).
//
// Two-stage pipeline:
//
//   orchestrateSubject(name, opts)   →   MultiSourceEvidence
//     • subject resolution (manifest mode if `agent-bench:bench_manifest`
//       present; public-read fallback via US-112 otherwise)
//     • per-source fan-out: Sourcify deep + on-chain + GitHub +
//       ENS-internal + cross-chain discovery
//     • Promise.allSettled — never throws (BUT: no per-source deadline)
//     • [HOTFIX] page-level 12s deadline via withTimeout()
//
//   computeScore(evidence, { nowSeconds })   →   ScoreResult
//     • pure function over evidence
//     • raw-discounted axes (NO normalization to ceiling) — GATE-30
//     • tier ceiling enforcement (public-read → A; unrated U for < 2
//       non-zero sources)
//
// All fetches happen on the server. Env vars consumed:
//   ALCHEMY_RPC_SEPOLIA   — Sepolia chainId 11155111 RPC
//   ALCHEMY_RPC_MAINNET   — mainnet chainId 1 RPC
//   ENS_RPC_URL           — fallback for either
//   GITHUB_PAT            — GitHub source PAT
//   GRAPH_API_KEY         — ENS subgraph (Graph Network) key

import {
  aggregateEngines,
  ensureEnginesRegistered,
  isSourceEngine,
  listRegisteredEngines,
  orchestrateSubject,
  resolvedRecordsFromEvidence,
  runEngines,
  type EngineContribution,
  type EngineId,
  type EngineParams,
  type MultiSourceEvidence,
  type ScoreResult,
} from "@upgrade-siren/evidence";
import { createPublicClient, http } from "viem";
import { mainnet, sepolia } from "viem/chains";

import { getDemoMock } from "../../../lib/demoMocks";

const SEPOLIA_CHAIN_ID = 11155111;
const MAINNET_CHAIN_ID = 1;

// HOTFIX: Vercel function budget is 60s; orchestrator must complete
// well under that to leave headroom for page render + Suspense
// resolution. 12s leaves ~48s of margin for everything downstream.
const DEFAULT_ORCHESTRATOR_TIMEOUT_MS = 12_000;

function rpcUrlForChain(chainId: number): string | undefined {
  if (chainId === SEPOLIA_CHAIN_ID) {
    return process.env.ALCHEMY_RPC_SEPOLIA ?? process.env.ENS_RPC_URL;
  }
  if (chainId === MAINNET_CHAIN_ID) {
    return process.env.ALCHEMY_RPC_MAINNET ?? process.env.ENS_RPC_URL;
  }
  return process.env.ENS_RPC_URL;
}

// ENS subgraph IDs are per-network. The default constant
// (ENS_SUBGRAPH_ID in packages/evidence/src/sources/ens-internal/types.ts)
// targets mainnet. For Sepolia subjects we need a Sepolia subgraph ID;
// it ships via env override so prod can flip it without a code change.
// When the per-chain env is unset we fall back to the mainnet default —
// in that case Sepolia ENS-internal queries return empty domains
// (mainnet subgraph has no record of Sepolia names) and the source
// surfaces as kind:'absent' / null_no_data, which the score engine
// already tolerates.
function ensSubgraphIdForChain(chainId: number): string | undefined {
  if (chainId === SEPOLIA_CHAIN_ID) {
    return process.env.ENS_SUBGRAPH_ID_SEPOLIA;
  }
  if (chainId === MAINNET_CHAIN_ID) {
    return process.env.ENS_SUBGRAPH_ID_MAINNET;
  }
  return undefined;
}

/**
 * Race a promise against a deadline. Throws an Error labelled
 * `<label> timeout <ms>ms` when the deadline fires first. The pending
 * promise is intentionally NOT cancelled — we only need to unblock
 * the caller. The orchestrator's downstream fetches will eventually
 * settle and be GC'd.
 */
async function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race<T>([
      p,
      new Promise<T>((_, rej) => {
        timer = setTimeout(
          () => rej(new Error(`${label} timeout ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export type LoadBenchOptions = {
  /**
   * Unix-seconds anchor passed through to the score engine. Tests pin
   * this for determinism; production callers omit it (current time).
   */
  readonly nowSeconds?: number;
  /**
   * Default chain id used by the subject resolver when no `chainId` is
   * inferred from the manifest. mainnet at production; tests can pin.
   */
  readonly chainId?: number;
  /**
   * Hotfix knob: page-level orchestrator deadline (ms). Default 12s
   * leaves headroom under the 60s Vercel budget. Tests pin shorter.
   */
  readonly orchestratorTimeoutMs?: number;
  /**
   * Booth-demo bypass: when explicitly false, skip the demoMocks map
   * even for the four canonical landing subjects. Defaults to true so
   * the four landing tiles always render their tuned story.
   */
  readonly useDemoMock?: boolean;
};

export type LoadBenchLoaded = {
  readonly kind: "loaded";
  readonly evidence: MultiSourceEvidence;
  readonly score: ScoreResult;
  /**
   * Per-engine contributions from the unified Engine pipeline. Includes
   * both source engines (sourcify/github/onchain/ens) and record
   * engines (addr.eth/description/url). Score is aggregated from these
   * — they are not an overlay; they ARE the score.
   */
  readonly engines: ReadonlyArray<EngineContribution>;
};

export type LoadBenchError = {
  readonly kind: "error";
  readonly reason: string;
  readonly message: string;
};

export type LoadBenchResult = LoadBenchLoaded | LoadBenchError;

function envDefaultChainId(): number {
  const raw = process.env.DEFAULT_BENCH_CHAIN_ID;
  if (raw === undefined || raw === '') return MAINNET_CHAIN_ID;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return MAINNET_CHAIN_ID;
  return parsed;
}

// Smart per-name routing (Refactor 2026-05-10). Demo subjects under
// `*.upgrade-siren-demo.eth` (and the standalone `siren-agent-demo.eth`)
// live on Sepolia; everything else is mainnet by default. This avoids
// the dual-chain retry cascade in the orchestrator (Sepolia ENS resolve
// → fail → mainnet retry → publicRead → fan-out) that pushed real
// mainnet names like sbo3lagent.eth past the 12s page deadline.
function chainIdForName(name: string, fallback: number): number {
  const lower = name.toLowerCase();
  if (lower.endsWith('.upgrade-siren-demo.eth')) return SEPOLIA_CHAIN_ID;
  if (lower === 'siren-agent-demo.eth') return SEPOLIA_CHAIN_ID;
  return fallback;
}

export async function loadBench(
  name: string,
  options: LoadBenchOptions = {},
): Promise<LoadBenchResult> {
  // Booth demo subjects (the four /b/[name] tiles on the landing page)
  // short-circuit to a frozen mocked LoadBenchResult so the tile's
  // predicted tier always matches what the page renders. Without this,
  // live RPC / Sourcify / GitHub variance can drift the score across
  // sessions and blow up the booth narrative.
  // Bypass with `?live=true` query param if needed.
  if (options.useDemoMock !== false) {
    const mock = getDemoMock(name);
    if (mock) return mock;
  }

  // Smart routing: Sepolia for demo subjects, mainnet for everything else.
  // Caller-supplied chainId still wins (debug ?chain= override).
  // We DON'T use envDefaultChainId() as the fallback because prod sets
  // DEFAULT_BENCH_CHAIN_ID=11155111 (Sepolia) for demo tiles — applying
  // that to non-demo names sends real mainnet ENS through Sepolia first,
  // which fails fast but still adds latency that pushes past the 12s
  // page deadline. Hard-code mainnet for the non-demo branch.
  const chainId = options.chainId ?? chainIdForName(name, MAINNET_CHAIN_ID);
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const orchestratorTimeoutMs =
    options.orchestratorTimeoutMs ?? DEFAULT_ORCHESTRATOR_TIMEOUT_MS;

  // orchestrateSubject is structured to never throw — every source
  // failure is captured in the `failures[]` array and the corresponding
  // per-source slot. HOTFIX: but it does NOT enforce a per-source
  // deadline, so one slow source (Sourcify all-chains, ENS subgraph)
  // can hang for >60s. Wrap with a page-level 12s deadline so the
  // /b/[name] route surfaces a typed error rather than a 70s blank
  // page when any source upstream is wedged.
  const subgraphIdOverride = ensSubgraphIdForChain(chainId);
  let evidence: MultiSourceEvidence;
  try {
    evidence = await withTimeout(
      orchestrateSubject(name, {
        chainId,
        rpcUrl: rpcUrlForChain(chainId),
        githubPat: process.env.GITHUB_PAT,
        graphApiKey: process.env.GRAPH_API_KEY,
        ...(subgraphIdOverride
          ? {
              ensInternalOptions: {
                apiKey: process.env.GRAPH_API_KEY ?? "",
                subgraphId: subgraphIdOverride,
              },
            }
          : {}),
      }),
      orchestratorTimeoutMs,
      "orchestrator",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Distinguish "timeout fired" from any other library throw so the
    // UI / observability layer can flag wedged-source incidents.
    const isTimeout = msg.startsWith("orchestrator timeout ");
    return {
      kind: "error",
      reason: isTimeout ? "orchestrator_timeout" : "orchestrator_throw",
      message: msg,
    };
  }

  // Unified Engine pipeline (refactor 2026-05-09): one runner spawns
  // every registered engine in parallel — source engines wrapping
  // existing fetchers (sourcify/github/onchain/ens) AND record engines
  // (addr.eth/description/url). aggregateEngines sums their
  // contributions into the same ScoreResult shape the score engine
  // produced before, so consumers stay unchanged.
  ensureEnginesRegistered();
  const engineRecords = resolvedRecordsFromEvidence(evidence, nowSeconds * 1000);
  const engineParams = buildEngineParams();
  let engines: ReadonlyArray<EngineContribution> = [];
  let score: ScoreResult;
  try {
    const runResult = await runEngines({
      evidence,
      records: engineRecords,
      params: engineParams,
      context: buildEngineContext(chainId),
    });
    engines = Array.from(runResult.contributions.values());
    score = aggregateEngines(engines, { evidence, nowSeconds });
  } catch (err) {
    return {
      kind: "error",
      reason: "score_throw",
      message: err instanceof Error ? err.message : String(err),
    };
  }

  return { kind: "loaded", evidence, score, engines };
}

// Builds the EngineContext the runner passes to every engine. Source
// engines mostly ignore RPC + fetch (they read from MultiSourceEvidence
// which the orchestrator already populated). Record engines (addr.eth,
// description, url) need real RPC + fetch.
function buildEngineContext(
  chainId: number,
): Parameters<typeof runEngines>[0]['context'] {
  const sepoliaUrl = rpcUrlForChain(11155111);
  const mainnetUrl = rpcUrlForChain(1);
  const cache = new Map<string, { value: unknown; expiresAt: number }>();
  return {
    rpc: {
      mainnet: createPublicClient({
        chain: mainnet,
        transport: mainnetUrl ? http(mainnetUrl) : http(),
      }),
      sepolia: createPublicClient({
        chain: sepolia,
        transport: sepoliaUrl ? http(sepoliaUrl) : http(),
      }),
    },
    fetch: async (url, init) => {
      const response = await fetch(url, init);
      return {
        ok: response.ok,
        status: response.status,
        headers: response.headers,
        text: () => response.text(),
        async json<T = unknown>(): Promise<T> {
          return (await response.json()) as T;
        },
      };
    },
    cache: {
      get<T>(key: string): T | undefined {
        const entry = cache.get(key);
        if (!entry) return undefined;
        if (entry.expiresAt < Date.now()) {
          cache.delete(key);
          return undefined;
        }
        return entry.value as T;
      },
      set<T>(key: string, value: T, ttlMs: number): void {
        cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      },
    },
    logger: {
      debug: () => {},
      warn: (msg, ctx) => {
        // eslint-disable-next-line no-console
        console.warn(`[engine] ${msg}`, ctx ?? {});
      },
    },
  };
}

// Builds the engine params map for the runner. Each engine carries
// its own defaultParams (per-engine EPIC weights for source engines,
// tunable thresholds for record engines).
function buildEngineParams(): Map<EngineId, EngineParams> {
  const params = new Map<EngineId, EngineParams>();
  for (const engine of listRegisteredEngines()) {
    const id: EngineId = isSourceEngine(engine) ? engine.id : engine.key;
    params.set(id, engine.defaultParams);
  }
  return params;
}
