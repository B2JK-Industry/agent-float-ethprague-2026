// Server-side EAS attestation lookup. Fronts the easscan.org GraphQL
// endpoints from the same origin so the client doesn't deal with CORS
// or wallet-RPC variability.
//
// GET /api/eas/attestation/[uid]?network=sepolia
//   - uid: 32-byte hex (0x…64 chars). Required.
//   - network: sepolia | mainnet | base | optimism. Optional;
//     when omitted, the fetcher probes networks in order and returns
//     the first match.
//
// Response body:
//   - on hit: FetchedAttestationOk JSON (see lib/eas/fetchAttestation.ts)
//   - on miss / error: FetchedAttestationError with HTTP 404 / 502

import { fetchAttestation } from "../../../../../lib/eas/fetchAttestation";
import type { EasNetwork } from "../../../../../lib/eas/parseAttestationUrl";

type RouteProps = {
  params: Promise<{ uid: string }>;
};

const NETWORKS: ReadonlyArray<EasNetwork> = [
  "sepolia",
  "mainnet",
  "base",
  "optimism",
];

function parseNetworkParam(raw: string | null): EasNetwork | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  for (const n of NETWORKS) {
    if (n === lower) return n;
  }
  return null;
}

export async function GET(req: Request, props: RouteProps): Promise<Response> {
  const { uid } = await props.params;
  if (!/^0x[a-fA-F0-9]{64}$/.test(uid)) {
    return Response.json(
      {
        kind: "error",
        reason: "decode_error",
        message: "uid must be a 32-byte hex (0x…64 chars)",
        triedNetworks: [],
      },
      { status: 400 },
    );
  }
  const url = new URL(req.url);
  const network = parseNetworkParam(url.searchParams.get("network"));

  const result = await fetchAttestation({ uid, network });
  if (result.kind === "ok") {
    return Response.json(result, {
      headers: {
        "cache-control": "s-maxage=60, stale-while-revalidate=300",
      },
    });
  }
  const status = result.reason === "not_found" ? 404 : 502;
  return Response.json(result, { status });
}
