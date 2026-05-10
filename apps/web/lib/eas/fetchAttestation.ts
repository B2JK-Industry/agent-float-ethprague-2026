// Fetches an EAS attestation via the easscan.org GraphQL endpoint and
// decodes the Bench schema fields into a typed shape the diff layer
// can consume.
//
// Bench schema string (constant across networks):
//   address subject, bytes32 ensNamehash, uint16 score, string tier,
//   uint64 computedAt, bytes32 reportHash, string reportUri
//
// Server-side only. No browser CORS, no wallet dependency. Each
// network has its own GraphQL endpoint; we hit one (or fall back across
// all when the input was a bare UID).

import type { EasNetwork } from "./parseAttestationUrl";

const GRAPHQL_BY_NETWORK: Record<EasNetwork, string> = {
  mainnet: "https://easscan.org/graphql",
  sepolia: "https://sepolia.easscan.org/graphql",
  base: "https://base.easscan.org/graphql",
  optimism: "https://optimism.easscan.org/graphql",
};

const QUERY = `
  query GetAttestation($uid: String!) {
    attestation(where: { id: $uid }) {
      id
      schemaId
      attester
      recipient
      decodedDataJson
      timeCreated
      revoked
      revocationTime
      txid
      isOffchain
    }
  }
`;

interface RawDecodedField {
  readonly name: string;
  readonly type: string;
  readonly value:
    | { value?: string | number; type?: string; hex?: string }
    | string
    | number
    | boolean
    | null;
}

interface RawAttestation {
  readonly id: string;
  readonly schemaId: string;
  readonly attester: string;
  readonly recipient: string;
  readonly decodedDataJson: string;
  readonly timeCreated: number;
  readonly revoked: boolean;
  readonly revocationTime: number | null;
  readonly txid: string | null;
  readonly isOffchain: boolean;
}

interface GqlResponse {
  data?: { attestation: RawAttestation | null };
  errors?: Array<{ message: string }>;
}

export interface BenchAttestationDecoded {
  readonly subject: `0x${string}`;
  readonly ensNamehash: `0x${string}`;
  readonly score: number;
  readonly tier: string;
  readonly computedAt: number;
  readonly reportHash: `0x${string}`;
  readonly reportUri: string;
}

export interface FetchedAttestationOk {
  readonly kind: "ok";
  readonly uid: `0x${string}`;
  readonly network: EasNetwork;
  readonly attester: `0x${string}`;
  readonly recipient: `0x${string}`;
  readonly schemaId: `0x${string}`;
  readonly timeCreated: number; // unix seconds
  readonly revoked: boolean;
  readonly revocationTime: number | null;
  readonly txid: string | null;
  readonly isOffchain: boolean;
  readonly decoded: BenchAttestationDecoded | null;
  readonly explorerUrl: string;
}

export interface FetchedAttestationError {
  readonly kind: "error";
  readonly reason:
    | "not_found"
    | "network_error"
    | "graphql_error"
    | "decode_error";
  readonly message: string;
  readonly triedNetworks: ReadonlyArray<EasNetwork>;
}

export type FetchedAttestation = FetchedAttestationOk | FetchedAttestationError;

function explorerUrl(network: EasNetwork, uid: string): string {
  if (network === "sepolia") return `https://sepolia.easscan.org/attestation/view/${uid}`;
  if (network === "base") return `https://base.easscan.org/attestation/view/${uid}`;
  if (network === "optimism") return `https://optimism.easscan.org/attestation/view/${uid}`;
  return `https://easscan.org/attestation/view/${uid}`;
}

function tryDecodeBench(decodedDataJson: string): BenchAttestationDecoded | null {
  try {
    const arr = JSON.parse(decodedDataJson) as RawDecodedField[];
    const byName = new Map<string, RawDecodedField>();
    for (const f of arr) byName.set(f.name, f);

    const readString = (name: string): string => {
      const f = byName.get(name);
      if (!f) return "";
      const v = f.value;
      if (typeof v === "string") return v;
      if (v && typeof v === "object" && typeof v.value === "string") return v.value;
      return "";
    };
    const readNumber = (name: string): number => {
      const f = byName.get(name);
      if (!f) return 0;
      const v = f.value;
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      }
      if (v && typeof v === "object") {
        if (typeof v.value === "number") return v.value;
        if (typeof v.value === "string") {
          const n = Number(v.value);
          return Number.isFinite(n) ? n : 0;
        }
        if (typeof v.hex === "string") {
          const n = Number(BigInt(v.hex));
          return Number.isFinite(n) ? n : 0;
        }
      }
      return 0;
    };
    const readHex = (name: string): `0x${string}` => {
      const s = readString(name);
      return (s || "0x") as `0x${string}`;
    };

    const subject = readHex("subject");
    const ensNamehash = readHex("ensNamehash");
    const score = readNumber("score");
    const tier = readString("tier");
    const computedAt = readNumber("computedAt");
    const reportHash = readHex("reportHash");
    const reportUri = readString("reportUri");

    return { subject, ensNamehash, score, tier, computedAt, reportHash, reportUri };
  } catch {
    return null;
  }
}

async function fetchOne(
  network: EasNetwork,
  uid: string,
): Promise<FetchedAttestation> {
  const endpoint = GRAPHQL_BY_NETWORK[network];
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { uid } }),
    });
  } catch (err) {
    return {
      kind: "error",
      reason: "network_error",
      message: `${network}: ${err instanceof Error ? err.message : String(err)}`,
      triedNetworks: [network],
    };
  }
  if (!response.ok) {
    return {
      kind: "error",
      reason: "graphql_error",
      message: `${network}: HTTP ${response.status}`,
      triedNetworks: [network],
    };
  }
  let body: GqlResponse;
  try {
    body = (await response.json()) as GqlResponse;
  } catch {
    return {
      kind: "error",
      reason: "decode_error",
      message: `${network}: invalid JSON from GraphQL`,
      triedNetworks: [network],
    };
  }
  if (body.errors && body.errors.length > 0) {
    return {
      kind: "error",
      reason: "graphql_error",
      message: `${network}: ${body.errors.map((e) => e.message).join("; ")}`,
      triedNetworks: [network],
    };
  }
  const a = body.data?.attestation ?? null;
  if (!a) {
    return {
      kind: "error",
      reason: "not_found",
      message: `${network}: attestation ${uid} not found`,
      triedNetworks: [network],
    };
  }
  const decoded = tryDecodeBench(a.decodedDataJson);
  return {
    kind: "ok",
    uid: a.id as `0x${string}`,
    network,
    attester: a.attester as `0x${string}`,
    recipient: a.recipient as `0x${string}`,
    schemaId: a.schemaId as `0x${string}`,
    timeCreated: a.timeCreated,
    revoked: a.revoked,
    revocationTime: a.revocationTime,
    txid: a.txid,
    isOffchain: a.isOffchain,
    decoded,
    explorerUrl: explorerUrl(network, uid),
  };
}

const NETWORK_PROBE_ORDER: ReadonlyArray<EasNetwork> = [
  "sepolia",
  "mainnet",
  "base",
  "optimism",
];

export interface FetchAttestationOptions {
  readonly uid: string;
  readonly network?: EasNetwork | null;
}

export async function fetchAttestation(
  options: FetchAttestationOptions,
): Promise<FetchedAttestation> {
  const { uid, network } = options;
  if (network) {
    return fetchOne(network, uid);
  }
  // Bare-UID input → probe networks in order. Stop at first OK; collect
  // tried networks for error reporting.
  const tried: EasNetwork[] = [];
  let lastErr: FetchedAttestation | null = null;
  for (const n of NETWORK_PROBE_ORDER) {
    const r = await fetchOne(n, uid);
    tried.push(n);
    if (r.kind === "ok") return r;
    lastErr = r;
    // Continue probing on not_found; stop early on hard transport errors
    // only if user has visibility into that — for MVP we keep probing so
    // a single down endpoint doesn't kill the lookup.
  }
  if (!lastErr) {
    return {
      kind: "error",
      reason: "not_found",
      message: `attestation ${uid} not found on any supported network`,
      triedNetworks: tried,
    };
  }
  return { ...lastErr, triedNetworks: tried };
}
