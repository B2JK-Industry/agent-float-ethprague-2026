// US-131 — landing mode-detection. The landing-page form posts a name
// here; this handler resolves ENS records server-side and 307-redirects
// to the right surface:
//
//   upgrade-siren:proxy present (sepolia or mainnet) → /r/[name]
//                                                       (existing flow,
//                                                        not broken)
//   neither namespace present                        → /b/[name]
//                                                       (Bench page
//                                                        infers public-read)
//
// Detection of `agent-bench:bench_manifest` happens inside /b/[name]'s
// loadBench (via orchestrateSubject → resolveSubjectFromEns), so this
// handler does not need to read the bench namespace itself. Single
// front door for users; mode is inferred from records, not selected.
//
// RPC env vars match the /r/[name] convention: ALCHEMY_RPC_SEPOLIA,
// ALCHEMY_RPC_MAINNET, ENS_RPC_URL fallback.

import { NextResponse } from "next/server";

import { resolveEnsRecords } from "@upgrade-siren/evidence";

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

async function hasUpgradeSirenRecords(name: string): Promise<boolean> {
  const [sepolia, mainnet] = await Promise.all([
    resolveEnsRecords(name, {
      chainId: SEPOLIA_CHAIN_ID,
      rpcUrl: rpcUrlForChain(SEPOLIA_CHAIN_ID),
    }),
    resolveEnsRecords(name, {
      chainId: MAINNET_CHAIN_ID,
      rpcUrl: rpcUrlForChain(MAINNET_CHAIN_ID),
    }),
  ]);
  if (sepolia.kind === "ok" && sepolia.anyUpgradeSirenRecordPresent) return true;
  if (mainnet.kind === "ok" && mainnet.anyUpgradeSirenRecordPresent) return true;
  return false;
}

type RouteParams = { params: Promise<{ name: string }> };

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);
  let target: string;
  try {
    target = (await hasUpgradeSirenRecords(name))
      ? `/r/${encodeURIComponent(name)}`
      : `/b/${encodeURIComponent(name)}`;
  } catch {
    // ENS resolution threw despite resolveEnsRecords' typed return —
    // fall through to /b which has its own empty/error state. Never
    // 500 the user from the routing layer.
    target = `/b/${encodeURIComponent(name)}`;
  }
  const url = new URL(target, request.url);
  return NextResponse.redirect(url, { status: 307 });
}
