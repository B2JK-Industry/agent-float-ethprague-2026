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

export async function GET(_req: Request, props: RouteProps): Promise<Response> {
  const { name: rawName } = await props.params;
  const name = decodeURIComponent(rawName);
  const result = await loadBench(name);
  const body = JSON.stringify(result, jsonReplacer, 2);
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "s-maxage=60, stale-while-revalidate=300",
    },
  });
}
