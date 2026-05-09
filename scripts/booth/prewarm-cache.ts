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
  const url = `https://sourcify.dev/server/v2/contract/${chainId}/${address}?fields=match,abi,compilation,sources`;
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
  // last 20 bytes are the implementation address; if zero, return null
  const impl = `0x${slotValue.slice(-40)}`;
  return /^0x0+$/.test(impl) ? null : impl;
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

  // 1. EIP-1967 slot (proxy implementation)
  let implementation: string | null = null;
  try {
    implementation = await readEip1967Slot(rpcUrl, target.address);
  } catch (err) {
    console.warn(`  eip1967 read failed for ${target.name}:`, err);
  }

  // 2. Sourcify metadata for proxy AND its current implementation
  const sourcifyProxy = await fetchSourcify(target.chainId, target.address);
  let sourcifyImpl: unknown = null;
  if (implementation) {
    try {
      sourcifyImpl = await fetchSourcify(target.chainId, implementation);
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
    eip1967Implementation: implementation,
    sourcify: {
      proxy: sourcifyProxy,
      currentImpl: sourcifyImpl,
    },
  };

  const repoRoot = path.resolve(import.meta.dirname, "..", "..");
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