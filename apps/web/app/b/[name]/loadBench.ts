// US-131 — server-only data adapter for `/b/[name]`. Bridges Stream B's
// Bench Mode evidence + score primitives (US-117 orchestrator + US-118
// score engine) to the route's render surface.
//
// Two-stage pipeline:
//
//   orchestrateSubject(name, opts)   →   MultiSourceEvidence
//     • subject resolution (manifest mode if `agent-bench:bench_manifest`
//       present; public-read fallback via US-112 otherwise)
//     • per-source fan-out: Sourcify deep + on-chain + GitHub +
//       ENS-internal + cross-chain discovery
//     • Promise.allSettled — never throws
//
//   computeScore(evidence, { nowSeconds })   →   ScoreResult
//     • pure function over evidence
//     • raw-discounted axes (NO normalization to ceiling) — GATE-30
//     • tier ceiling enforcement (public-read → A; unrated U for < 2
//       non-zero sources)
//
// US-132 / US-133 / US-134 PRs render the banner / grid / breakdown
// against the typed shape this module returns; US-131 just wires the
// pipeline and exposes the foundation.
//
// All fetches happen on the server. Env vars consumed:
//   ALCHEMY_RPC_SEPOLIA   — Sepolia chainId 11155111 RPC
//   ALCHEMY_RPC_MAINNET   — mainnet chainId 1 RPC
//   ENS_RPC_URL           — fallback for either
//   GITHUB_PAT            — GitHub source PAT (orchestrator returns
//                           kind:'absent' when missing — score engine
//                           tolerates absent GitHub, capping seniority)
//   GRAPH_API_KEY         — ENS subgraph (Graph Network) key

import {
  computeScore,
  orchestrateSubject,
  type MultiSourceEvidence,
  type ScoreResult,
} from "@upgrade-siren/evidence";

const SEPOLIA_CHAIN_ID = 11155111;
const MAINNET_CHAIN_ID = 1;

function rpcUrlForChain(chainId: number): string | undefined {
  if (chainId === SEPOLIA_CHAIN_ID) {
    return process.env.ALCHEMY_RPC_SEPOLIA ?? process.env.ENS_RPC_URL;
  }
  if (chainId === MAINNET_CHAIN_ID) {
    return process.env.ALCHEMY_RPC_MAINNET ?? process.env.ENS_RPC_URL;
  }
  return process.env.ENS_RPC_URL;
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

export async function loadBench(
  name: string,
  options: LoadBenchOptions = {},
): Promise<LoadBenchResult> {
  const chainId = options.chainId ?? MAINNET_CHAIN_ID;
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);

  // orchestrateSubject is structured to never throw — every source
  // failure is captured in the `failures[]` array and the corresponding
  // per-source slot. We still wrap the call so an unexpected library
  // throw degrades to a typed error rather than a 500.
  let evidence: MultiSourceEvidence;
  try {
    evidence = await orchestrateSubject(name, {
      chainId,
      rpcUrl: rpcUrlForChain(chainId),
      githubPat: process.env.GITHUB_PAT,
      graphApiKey: process.env.GRAPH_API_KEY,
    });
  } catch (err) {
    return {
      kind: "error",
      reason: "orchestrator_throw",
      message: err instanceof Error ? err.message : String(err),
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
