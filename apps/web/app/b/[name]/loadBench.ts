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
  computeScore,
  orchestrateSubject,
  type MultiSourceEvidence,
  type ScoreResult,
} from "@upgrade-siren/evidence";

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
};

export type LoadBenchLoaded = {
  readonly kind: "loaded";
  readonly evidence: MultiSourceEvidence;
  readonly score: ScoreResult;
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

export async function loadBench(
  name: string,
  options: LoadBenchOptions = {},
): Promise<LoadBenchResult> {
  // Demo subjects (siren-agent-demo, *.upgrade-siren-demo.eth) live on
  // Sepolia — DEFAULT_BENCH_CHAIN_ID env override flips the default to
  // 11155111 in production without breaking test fixtures that pin
  // chainId: 1 explicitly. Tester smoke 2026-05-09 21:42 CET caught that
  // /b/{Sepolia subject} silently degraded to public-read tier U because
  // the orchestrator queried mainnet ENS (no manifest there).
  const chainId = options.chainId ?? envDefaultChainId();
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

  // computeScore is pure. Any throw here is a bug in the score engine,
  // not a runtime failure mode — but we still degrade gracefully.
  let score: ScoreResult;
  try {
    score = computeScore(evidence, { nowSeconds });
  } catch (err) {
    return {
      kind: "error",
      reason: "score_throw",
      message: err instanceof Error ? err.message : String(err),
    };
  }

  return { kind: "loaded", evidence, score };
}
