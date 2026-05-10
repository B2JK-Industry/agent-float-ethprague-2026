// Parses pasted EAS attestation URLs / raw UIDs into a normalised
// { network, uid } pair the GraphQL fetcher can use.
//
// Accepted forms (case-insensitive):
//   https://sepolia.easscan.org/attestation/view/0xUID
//   https://easscan.org/attestation/view/0xUID
//   https://base.easscan.org/attestation/view/0xUID
//   https://optimism.easscan.org/attestation/view/0xUID
//   0xUID (raw 32-byte hex — network unknown, caller probes all)
//
// Anything else returns kind:'error' so the UI can surface a typed
// "couldn't parse" hint without throwing.

export type EasNetwork = "mainnet" | "sepolia" | "base" | "optimism";

const UID_RE = /^0x[a-fA-F0-9]{64}$/;
const URL_RE =
  /^https?:\/\/(?:(sepolia|base|optimism)\.)?easscan\.org\/attestation\/view\/(0x[a-fA-F0-9]{64})\/?$/i;

export interface ParsedAttestationOk {
  readonly kind: "ok";
  readonly uid: `0x${string}`;
  // null when the input was a bare UID — caller probes all networks.
  readonly network: EasNetwork | null;
}

export interface ParsedAttestationError {
  readonly kind: "error";
  readonly message: string;
}

export type ParsedAttestation = ParsedAttestationOk | ParsedAttestationError;

export function parseAttestationInput(raw: string): ParsedAttestation {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { kind: "error", message: "empty input" };
  }

  // Bare UID
  if (UID_RE.test(trimmed)) {
    return { kind: "ok", uid: trimmed as `0x${string}`, network: null };
  }

  // URL form
  const m = URL_RE.exec(trimmed);
  if (m) {
    const subdomain = (m[1] ?? "").toLowerCase();
    const uid = m[2] as `0x${string}`;
    const network: EasNetwork =
      subdomain === "sepolia"
        ? "sepolia"
        : subdomain === "base"
          ? "base"
          : subdomain === "optimism"
            ? "optimism"
            : "mainnet";
    return { kind: "ok", uid, network };
  }

  return {
    kind: "error",
    message: `unrecognised input — expected an EAS attestation URL or a 0x… 32-byte UID`,
  };
}
