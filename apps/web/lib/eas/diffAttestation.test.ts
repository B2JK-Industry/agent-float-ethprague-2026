import { describe, it, expect } from "vitest";

import type {
  GithubEvidence,
  EnsInternalEvidence,
  MultiSourceEvidence,
  OnchainEntryEvidence,
  ScoreResult,
  SourcifyEntryEvidence,
} from "@upgrade-siren/evidence";

import { diffAttestationVsCurrent } from "./diffAttestation";
import type { FetchedAttestationOk } from "./fetchAttestation";

function makeEvidence(overrides: {
  primaryAddress?: string | null;
  chainId?: number;
} = {}): MultiSourceEvidence {
  const sourcify: ReadonlyArray<SourcifyEntryEvidence> = [];
  const onchain: ReadonlyArray<OnchainEntryEvidence> = [];
  const github: GithubEvidence = { kind: "absent" };
  const ensInternal: EnsInternalEvidence = { kind: "absent" };
  return {
    subject: {
      name: "siren.eth",
      // Default to Sepolia (11155111) so the same-chain compare against
      // the makePreviousAttestation default network "sepolia" exercises
      // the rotation-detection path. Tests that need a cross-chain case
      // can override via `chainId`.
      chainId: overrides.chainId ?? 11155111,
      mode: "public-read",
      primaryAddress:
        (overrides.primaryAddress ??
          "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA") as `0x${string}` | null,
      kind: null,
      manifest: null,
    },
    sourcify,
    github,
    onchain,
    ensInternal,
    crossChain: null,
    failures: [],
  };
}

function makePreviousAttestation(overrides: {
  score?: number;
  tier?: string;
  recipient?: string;
  computedAt?: number;
  revoked?: boolean;
} = {}): FetchedAttestationOk {
  return {
    kind: "ok",
    uid: "0xa5b4e5a48e23127a0b9284c7c1128028cc84a06d2fe973092f2dc494e83775ff",
    network: "sepolia",
    attester: "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
    recipient: (overrides.recipient ??
      "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA") as `0x${string}`,
    schemaId: "0x75afab249d345d7891a2d79bcf892f1c93a702f4f328e7f657cada9edb241981",
    timeCreated: overrides.computedAt ?? 1_715_000_000,
    revoked: overrides.revoked ?? false,
    revocationTime: null,
    txid: "0xtx",
    isOffchain: false,
    decoded: {
      subject: (overrides.recipient ??
        "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA") as `0x${string}`,
      ensNamehash: "0x" + "00".repeat(32) as `0x${string}`,
      score: overrides.score ?? 50,
      tier: overrides.tier ?? "B",
      computedAt: overrides.computedAt ?? 1_715_000_000,
      reportHash: "0x" + "00".repeat(32) as `0x${string}`,
      reportUri: "https://upgrade-siren.vercel.app/b/siren.eth",
    },
    explorerUrl: "https://sepolia.easscan.org/attestation/view/0xa5b4",
  };
}

const fakeScore = (s100: number, tier: ScoreResult["tier"]): ScoreResult =>
  ({
    score_100: s100,
    tier,
    axes: { seniority: 0.5, relevance: 0.5 },
    ceiling: { applied: false, capLabel: null },
    reason: "ok",
  } as unknown as ScoreResult);

describe("diffAttestationVsCurrent", () => {
  it("flags primaryAddress change as ALERT (identity rotation)", () => {
    const diff = diffAttestationVsCurrent({
      previous: makePreviousAttestation({
        recipient: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      }),
      currentEvidence: makeEvidence({
        primaryAddress: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      }),
      currentScore: fakeScore(50, "B"),
      nowSeconds: 1_715_000_000,
    });
    const e = diff.entries.find((x) => x.field === "primaryAddress");
    expect(e?.severity).toBe("alert");
    expect(diff.overall).toBe("alert");
  });

  it("flags large negative score delta as ALERT", () => {
    const diff = diffAttestationVsCurrent({
      previous: makePreviousAttestation({ score: 80, tier: "A" }),
      currentEvidence: makeEvidence(),
      currentScore: fakeScore(50, "A"),
      nowSeconds: 1_715_000_000,
    });
    const e = diff.entries.find((x) => x.field === "score_100");
    expect(e?.severity).toBe("alert");
  });

  it("flags small positive score delta as INFO", () => {
    const diff = diffAttestationVsCurrent({
      previous: makePreviousAttestation({ score: 50, tier: "B" }),
      currentEvidence: makeEvidence(),
      currentScore: fakeScore(52, "B"),
      nowSeconds: 1_715_000_000,
    });
    const e = diff.entries.find((x) => x.field === "score_100");
    expect(e?.severity).toBe("info");
    expect(e?.note).toBe("+2");
  });

  it("flags tier downgrade as WARN/ALERT depending on jump size", () => {
    const oneStep = diffAttestationVsCurrent({
      previous: makePreviousAttestation({ tier: "A" }),
      currentEvidence: makeEvidence(),
      currentScore: fakeScore(40, "B"),
      nowSeconds: 1_715_000_000,
    });
    const twoStep = diffAttestationVsCurrent({
      previous: makePreviousAttestation({ tier: "A" }),
      currentEvidence: makeEvidence(),
      currentScore: fakeScore(20, "C"),
      nowSeconds: 1_715_000_000,
    });
    const e1 = oneStep.entries.find((x) => x.field === "tier");
    const e2 = twoStep.entries.find((x) => x.field === "tier");
    expect(e1?.severity).toBe("warn");
    expect(e2?.severity).toBe("alert");
  });

  it("flags revoked previous attestation as ALERT", () => {
    const diff = diffAttestationVsCurrent({
      previous: makePreviousAttestation({ revoked: true }),
      currentEvidence: makeEvidence(),
      currentScore: fakeScore(50, "B"),
      nowSeconds: 1_715_000_000,
    });
    expect(diff.entries.some((e) => e.field === "revoked" && e.severity === "alert")).toBe(true);
  });

  it("returns UNCHANGED when score, tier, recipient, age all stable", () => {
    const diff = diffAttestationVsCurrent({
      previous: makePreviousAttestation({ score: 50, tier: "B" }),
      currentEvidence: makeEvidence(),
      currentScore: fakeScore(50, "B"),
      nowSeconds: 1_715_000_000 + 60,  // 60s later — info-level age, not warn
    });
    expect(diff.entries.find((e) => e.field === "score_100")?.severity).toBe("unchanged");
    expect(diff.entries.find((e) => e.field === "tier")?.severity).toBe("unchanged");
    expect(diff.entries.find((e) => e.field === "primaryAddress")?.severity).toBe("unchanged");
    // Overall should be info (because of report_age + reportUri info-level entries)
    expect(["unchanged", "info"]).toContain(diff.overall);
  });
});
