// GET /api/sourcify/health
//
// Lightweight uptime ping against Sourcify v2 server. Lets the bench
// page render a "Sourcify · live · 240ms" status indicator beside the
// SourcifyEvidencePanel — judges can see in one glance that we're
// hitting the real Sourcify server, not a cached snapshot.
//
// Returns:
//   { ok: true, latencyMs: number, version: string | null, sample: { chainId, address, match } }
//   { ok: false, reason: "..." }

import { fetchSourcifyDeep } from "@upgrade-siren/evidence";

// Probe a known-good verified contract: USDC implementation on
// Ethereum mainnet (chainId 1). Stable, public, definitely verified
// on Sourcify, and fetched as a smoke check rather than for evidence.
const PROBE_CHAIN_ID = 1;
const PROBE_ADDRESS = "0x43506849D7C04F9138D1A2050bbF3A0c054402dd" as const;

export async function GET(): Promise<Response> {
  const start = Date.now();
  try {
    const result = await fetchSourcifyDeep(PROBE_CHAIN_ID, PROBE_ADDRESS, {
      fields: ["creationMatch", "runtimeMatch"],
    });
    const latencyMs = Date.now() - start;
    if (result.kind === "error") {
      return Response.json(
        {
          ok: false,
          reason: result.error.reason,
          message: result.error.message,
          latencyMs,
        },
        {
          status: 502,
          headers: { "cache-control": "no-store" },
        },
      );
    }
    return Response.json(
      {
        ok: true,
        latencyMs,
        endpoint: "https://sourcify.dev/server/v2",
        sample: {
          chainId: PROBE_CHAIN_ID,
          address: PROBE_ADDRESS,
          match: result.value.match,
          creationMatch: result.value.creationMatch,
          runtimeMatch: result.value.runtimeMatch,
        },
      },
      {
        headers: {
          // Cache for 30s so a dashboard polling every few seconds
          // doesn't hammer Sourcify.
          "cache-control": "s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
    return Response.json(
      {
        ok: false,
        reason: "throw",
        message: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - start,
      },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
