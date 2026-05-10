// Debug-friendly JSON endpoint: /api/bench/[name]
//
// Returns raw LoadBenchResult so judges (and Daniel) can re-derive
// any tier/score breakdown by hand from the orchestrator output.
//
// Why /api/bench/[name] and NOT /b/[name].json:
// Next.js App Router parses dotted segments as part of the dynamic
// param — `[name].json` matched into `[name]` with name="*.json"
// rather than registering as its own route. Standard /api/* path
// avoids that ambiguity.
//
// BigInt + Map serialization handled inline so the route never throws
// on shapes the engine pipeline produces.

import { loadBench } from "../../../b/[name]/loadBench";

type RouteProps = {
  params: Promise<{ name: string }>;
};

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Map) return Object.fromEntries(value.entries());
  if (value instanceof Set) return Array.from(value);
  return value;
}

export async function GET(req: Request, props: RouteProps): Promise<Response> {
  const { name: rawName } = await props.params;
  const name = decodeURIComponent(rawName);
  const url = new URL(req.url);
  const chainParam = url.searchParams.get("chain");
  const chainId = chainParam ? Number(chainParam) : undefined;
  // 2026-05-10: API now defaults to LIVE so judges hitting
  // /api/bench/[name] get re-derivable evidence (the route comment
  // promises that). Only the page render path keeps frozen booth
  // mocks for visual consistency on the landing tiles.
  // Pass `?mock=true` to opt into the curated booth mock.
  const mockParam = url.searchParams.get("mock");
  const useMock = mockParam === "true" || mockParam === "1";
  const opts: { chainId?: number; useDemoMock?: false } = {};
  if (chainId !== undefined && Number.isFinite(chainId) && chainId > 0) {
    opts.chainId = chainId;
  }
  if (!useMock) {
    opts.useDemoMock = false;
  }
  const result = await loadBench(name, opts);
  const body = JSON.stringify(result, jsonReplacer, 2);
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "s-maxage=60, stale-while-revalidate=300",
    },
  });
}
