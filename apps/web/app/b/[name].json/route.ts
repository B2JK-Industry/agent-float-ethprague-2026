// Debug-friendly JSON endpoint for /b/[name].json
//
// Returns the raw LoadBenchResult so judges (and Daniel) can re-derive
// any tier/score breakdown by hand from the orchestrator output. Same
// data the page renders, dumped as JSON.
//
// BigInt + Map serialization handled inline so the route never throws
// on shapes the engine pipeline produces (latestBlock as bigint,
// engines as Map<RecordKey, EvaluatorResult>, etc.).

import { loadBench } from "../[name]/loadBench";

type PageProps = {
  params: Promise<{ name: string }>;
};

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Map) return Object.fromEntries(value.entries());
  if (value instanceof Set) return Array.from(value);
  return value;
}

export async function GET(_req: Request, props: PageProps): Promise<Response> {
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
