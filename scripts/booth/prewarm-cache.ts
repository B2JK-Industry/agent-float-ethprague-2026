#!/usr/bin/env -S pnpm tsx
/**
 * Booth fallback: pre-warm Sourcify + ENS responses for the demo
 * targets so the booth-day app can serve them from disk if upstream
 * APIs are slow or unreachable.
 *
 * Targets:
 *   1. Four Sepolia demo subnames provisioned by Stream A (PR #68):
 *      vault.upgrade-siren-demo.eth, safe.upgrade-siren-demo.eth,
 *      dangerous.upgrade-siren-demo.eth, unverified.upgrade-siren-demo.eth
 *   2. Six curated mainnet protocols for the public-read live scenario:
 *      Aave V3 Pool, Lido stETH, Compound v3 USDC Comet,
 *      Optimism L1StandardBridge, EigenLayer DelegationManager,
 *      ENS Public Resolver
 *
 * Output: apps/web/public/cache/<chainId>/<address>.json — JSON with
 *   { fetchedAt, sourcify, manifestRaw, eip1967Slot }.
 *
 * Run:
 *   ALCHEMY_RPC_SEPOLIA=... ALCHEMY_RPC_MAINNET=... pnpm tsx scripts/booth/prewarm-cache.ts
 *
 * Reading these caches is the responsibility of apps/web in fallback
 * mode — set NEXT_PUBLIC_BOOTH_FALLBACK=1 to prefer cache over live
 * fetch (consumed by US-068 live verdict pipeline).
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// `import.meta.dirname` is unreliable under tsx in some Node configurations
// (returns undefined). Fall back to deriving the script directory from
// `import.meta.url` so the repo-root resolution below works regardless.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SEPOLIA_CHAIN_ID = 11155111;
const MAINNET_CHAIN_ID = 1;

type Target = {
  readonly name: string;
  readonly chainId: number;
  readonly address: `0x${string}`;
  readonly ensName?: string;
  readonly note: string;
};

const TARGETS: readonly Target[] = [
  // Sepolia demo subnames + their proxy
  {
    name: "demo-proxy",
    chainId: SEPOLIA_CHAIN_ID,
    address: "0x8391fa804d3755493e3C9D362D49c339C4469388",
    ensName: "vault.upgrade-siren-demo.eth",
    note: "Demo proxy (Stream A US-009 broadcast)",
  },
  // Six curated mainnet protocols
  {
    name: "aave-v3-pool",
    chainId: MAINNET_CHAIN_ID,
    address: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
    note: "Aave V3 Pool — flagship public-read demo target",
  },
  {
    name: "lido-steth",
    chainId: MAINNET_CHAIN_ID,
    address: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
    note: "Lido stETH — largest TVL upgradeable proxy",
  },
  {
    name: "compound-v3-usdc",
    chainId: MAINNET_CHAIN_ID,
    address: "0xc3d688B66703497DAA19211EEdff47f25384cdc3",
    note: "Compound v3 USDC Comet — modern proxy pattern",
  },
  {
    name: "optimism-l1-bridge",
    chainId: MAINNET_CHAIN_ID,
    address: "0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1",
    note: "Optimism L1StandardBridge — frequent OPCM upgrades",
  },
  {
    name: "eigenlayer-delegation",
    chainId: MAINNET_CHAIN_ID,
    address: "0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A",
    note: "EigenLayer DelegationManager — recent restaking protocol",
  },
  {
    name: "ens-public-resolver",
    chainId: MAINNET_CHAIN_ID,
    address: "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63",
    note: "ENS Public Resolver — reflexive demo (ENS itself)",
  },
];

const EIP1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

async function rpcCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`${method} HTTP ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(`${method}: ${json.error.message}`);
  return json.result as T;
}

async function fetchSourcify(chainId: number, address: string): Promise<unknown> {
  // Note: do not pass `?fields=match,...` — Sourcify v2 rejects `match` as a
  // field selector with HTTP 400 invalid_parameter. The `match` field is
  // returned by default in the canonical response. We don't need ABI/sources
  // at prewarm time; loadReport reads only `entry.sourcify.match`.
  const url = `https://sourcify.dev/server/v2/contract/${chainId}/${address}`;
  const res = await fetch(url);
  if (res.status === 404) return { status: "not_found" };
  if (!res.ok) {
    return { status: "server_error", httpStatus: res.status };
  }
  return res.json();
}

async function readEip1967Slot(rpcUrl: string, address: string): Promise<string | null> {
  const slotValue = await rpcCall<string>(rpcUrl, "eth_getStorageAt", [
    address,
    EIP1967_IMPLEMENTATION_SLOT,
    "latest",
  ]);
  // Return the FULL 32-byte slot value as 0x + 64 hex. loadReport.ts's
  // cachedSlotImplementation() does the .slice(-40) extraction itself, and
  // returning the raw slot lets it distinguish an empty slot (all-zero) from
  // a populated one. Returning the truncated address here breaks loadReport.
  if (typeof slotValue !== "string" || !slotValue.startsWith("0x")) return null;
  return slotValue;
}

function extractMatchLevel(sourcifyResp: unknown): "exact_match" | "match" | "not_found" | null {
  if (!sourcifyResp || typeof sourcifyResp !== "object") return null;
  const r = sourcifyResp as Record<string, unknown>;
  // 404 path the sourcify fetcher already normalises to { status: "not_found" }
  if (r.status === "not_found") return "not_found";
  if (typeof r.match === "string") {
    if (r.match === "exact_match" || r.match === "match" || r.match === "not_found") {
      return r.match;
    }
  }
  return null;
}

async function prewarmTarget(target: Target): Promise<void> {
  const rpcUrl =
    target.chainId === SEPOLIA_CHAIN_ID
      ? process.env.ALCHEMY_RPC_SEPOLIA
      : process.env.ALCHEMY_RPC_MAINNET;
  if (!rpcUrl) {
    throw new Error(
      `RPC env var missing for chain ${target.chainId}: set ALCHEMY_RPC_SEPOLIA + ALCHEMY_RPC_MAINNET`,
    );
  }

  // 1. EIP-1967 slot — store the full 32-byte slot value, not an extracted
  //    address. loadReport.ts (apps/web/app/r/[name]/loadReport.ts) reads
  //    `entry.eip1967Slot` and does the .slice(-40) extraction itself.
  let eip1967Slot: string | null = null;
  try {
    eip1967Slot = await readEip1967Slot(rpcUrl, target.address);
  } catch (err) {
    console.warn(`  eip1967 read failed for ${target.name}:`, err);
  }

  const implementation = eip1967Slot && eip1967Slot.length >= 42
    ? `0x${eip1967Slot.slice(-40)}`
    : null;

  // 2. Sourcify metadata for the proxy. loadReport.ts reads
  //    `entry.sourcify.match` (one of "exact_match" | "match" | "not_found"),
  //    not the full Sourcify response object. Store just the match level so
  //    cachedSourcifyMatch() resolves correctly.
  const sourcifyProxyResp = await fetchSourcify(target.chainId, target.address);
  const proxyMatch = extractMatchLevel(sourcifyProxyResp);

  // The current implementation's match level is also useful for diagnostic
  // observability though loadReport doesn't read it directly.
  let implMatch: "exact_match" | "match" | "not_found" | null = null;
  if (implementation && /^0x[0-9a-fA-F]{40}$/.test(implementation)) {
    try {
      const sourcifyImplResp = await fetchSourcify(target.chainId, implementation);
      implMatch = extractMatchLevel(sourcifyImplResp);
    } catch (err) {
      console.warn(`  sourcify impl fetch failed for ${target.name}:`, err);
    }
  }

  const cache = {
    fetchedAt: new Date().toISOString(),
    chainId: target.chainId,
    proxyAddress: target.address,
    ensName: target.ensName ?? null,
    note: target.note,
    eip1967Slot,
    sourcify: {
      // loadReport.cachedSourcifyMatch() reads `match`. We surface the proxy's
      // match level here because the cache file is keyed by the proxy address.
      match: proxyMatch,
      // implementation match level is observational, not consumed by loadReport.
      implementationMatch: implMatch,
    },
  };

  const repoRoot = path.resolve(__dirname, "..", "..");
  const outDir = path.join(
    repoRoot,
    "apps",
    "web",
    "public",
    "cache",
    String(target.chainId),
  );
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `${target.address.toLowerCase()}.json`);
  await writeFile(outFile, JSON.stringify(cache, null, 2) + "\n");

  console.log(
    `  ${target.name} (${target.chainId}/${target.address.slice(0, 10)}...) -> ${outFile.split("/").slice(-3).join("/")}`,
  );
}

async function main(): Promise<void> {
  console.log(`Pre-warming ${TARGETS.length} targets...`);
  for (const target of TARGETS) {
    await prewarmTarget(target);
  }
  console.log("Done. Cache files under apps/web/public/cache/.");
  console.log(
    "Set NEXT_PUBLIC_BOOTH_FALLBACK=1 in apps/web/.env.local to prefer cache over live fetch.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});