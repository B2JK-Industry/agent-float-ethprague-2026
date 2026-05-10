import { describe, it, expect } from "vitest";
import { parseAttestationInput } from "./parseAttestationUrl";

const UID = "0xa5b4e5a48e23127a0b9284c7c1128028cc84a06d2fe973092f2dc494e83775ff";

describe("parseAttestationInput", () => {
  it("parses a sepolia attestation URL", () => {
    const r = parseAttestationInput(
      `https://sepolia.easscan.org/attestation/view/${UID}`,
    );
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") {
      expect(r.uid).toBe(UID);
      expect(r.network).toBe("sepolia");
    }
  });

  it("parses a mainnet attestation URL (no subdomain)", () => {
    const r = parseAttestationInput(`https://easscan.org/attestation/view/${UID}`);
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") {
      expect(r.network).toBe("mainnet");
    }
  });

  it("parses base + optimism subdomains", () => {
    const base = parseAttestationInput(
      `https://base.easscan.org/attestation/view/${UID}`,
    );
    const op = parseAttestationInput(
      `https://optimism.easscan.org/attestation/view/${UID}`,
    );
    expect(base.kind === "ok" && base.network).toBe("base");
    expect(op.kind === "ok" && op.network).toBe("optimism");
  });

  it("accepts a bare 32-byte UID with network=null (caller probes)", () => {
    const r = parseAttestationInput(UID);
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") {
      expect(r.uid).toBe(UID);
      expect(r.network).toBeNull();
    }
  });

  it("returns error on garbage input", () => {
    expect(parseAttestationInput("hello world").kind).toBe("error");
    expect(parseAttestationInput("").kind).toBe("error");
    expect(parseAttestationInput("0x1234").kind).toBe("error"); // wrong length
  });

  it("trims whitespace", () => {
    const r = parseAttestationInput(`   ${UID}   `);
    expect(r.kind).toBe("ok");
  });
});
