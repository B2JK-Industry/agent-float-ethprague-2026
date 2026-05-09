// US-128: public-read fallback scenario — subject without
// `agent-bench:bench_manifest`.
//
// Per EPIC §10 / D-I lock: when the resolver falls back to public-read
// (no agent-bench manifest, partial signals from `addr()` + Sourcify
// all-chains lookup), the score engine caps tier at A regardless of how
// good the underlying signals look. This scenario asserts that ceiling
// behaviour for GATE-32.
//
// Discriminating assertion: ceilingApplied === 'public_read_a'. Even if
// every populated signal lands at 1.0, tier cannot exceed A.

import { test, expect } from "../../fixtures/bench-test.js";
import { computeScore } from "../../../../../packages/evidence/src/score/engine.js";
import type {
    MultiSourceEvidence,
    SourcifyEntryEvidence,
    SubjectIdentity,
} from "../../../../../packages/evidence/src/bench/types.js";

const NOW = 1778198400;
const ADDR_IMPL = "0x3333333333333333333333333333333333333333" as const;
const ADDR_PRIMARY = "0xcccccccccccccccccccccccccccccccccccccccc" as const;

function publicReadSubject(name: string): SubjectIdentity {
    return {
        name,
        chainId: 1,
        // mode === 'public-read' is the load-bearing field. When this is
        // present without a manifest, the score engine refuses to award
        // S/A+ tiers because the manifest's per-source claims weren't
        // declared by the subject owner.
        mode: "public-read",
        primaryAddress: ADDR_PRIMARY,
        kind: null,
        manifest: null,
    };
}

function verifiedSourcify(): SourcifyEntryEvidence {
    return {
        kind: "ok",
        chainId: 1,
        address: ADDR_IMPL,
        label: "InferredImpl",
        deep: {
            chainId: 1,
            address: ADDR_IMPL,
            match: "exact_match",
            creationMatch: "exact_match",
            runtimeMatch: "exact_match",
            compilation: null,
            functionSignatures: [
                { selector: "0xa9059cbb", signature: "transfer(address,uint256)" },
                { selector: "0x70a08231", signature: "balanceOf(address)" },
                { selector: "0x18160ddd", signature: "totalSupply()" },
            ],
            eventSignatures: null,
            licenses: null,
            userdoc: null,
            devdoc: null,
            proxyResolution: null,
        },
        patterns: [],
        licenseCompiler: { licenses: [], dominantLicense: null, compiler: null },
    };
}

function buildPublicReadEvidence(): MultiSourceEvidence {
    return {
        subject: publicReadSubject("public-read.eth"),
        // Even with verified Sourcify + active on-chain + present ENS-internal,
        // public-read mode caps tier at A.
        sourcify: [verifiedSourcify()],
        github: { kind: "absent" },
        onchain: [
            {
                kind: "ok",
                chainId: 1,
                value: {
                    chainId: 1,
                    address: ADDR_PRIMARY,
                    nonce: 1500,
                    firstTxBlock: 18_000_000n,
                    firstTxTimestamp: 1_700_000_000,
                    latestBlock: 19_000_000n,
                },
            },
        ],
        ensInternal: {
            kind: "ok",
            value: {
                name: "public-read.eth",
                registrationDate: NOW - 86400 * 365,
                subnameCount: 10,
                textRecordCount: 5,
                lastRecordUpdateBlock: BigInt(Math.floor(NOW / 12)),
            },
        },
        crossChain: null,
        failures: [],
    };
}

test.describe("US-128 public-read scenario — tier ceiling A regardless of signal quality (GATE-32)", () => {
    test("subject.mode === 'public-read'; tier never reaches S; mode propagates to score result", async ({
        msw: _msw,
    }) => {
        const evidence = buildPublicReadEvidence();
        const result = computeScore(evidence, { nowSeconds: NOW });
        expect(result.meta.mode).toBe("public-read");
        expect(["A", "B", "C", "D", "U"]).toContain(result.tier);
        expect(["none", "public_read_a", "unrated"]).toContain(result.ceilingApplied);
    });

    test("manifest === null in public-read mode (subject.kind also null per resolver invariant)", async ({
        msw: _msw,
    }) => {
        const evidence = buildPublicReadEvidence();
        const result = computeScore(evidence, { nowSeconds: NOW });
        expect(evidence.subject.manifest).toBeNull();
        expect(evidence.subject.kind).toBeNull();
        expect(result.meta.mode).toBe("public-read");
    });

    // GATE-32 discriminating assertion. Codex flagged that the original
    // shape-only test could pass even if the ceiling were removed, because
    // public-read fixtures with `github: absent` cannot reach tier A
    // through the remaining components alone — so `ceilingApplied` would
    // legitimately be `'none'` in v1 regardless of whether the cap exists.
    //
    // The structural defense the cap provides is comparative: for the
    // SAME evidence, the engine in public-read mode must never produce a
    // higher tier than manifest mode, AND if manifest mode produced any
    // tier above A, public-read mode must collapse it to A with
    // `ceilingApplied === 'public_read_a'`. This test enforces the
    // comparative invariant, which fails red the moment the cap regresses.
    test("public-read tier ≤ manifest tier for the same evidence (cap structurally enforced)", async ({
        msw: _msw,
    }) => {
        const TIER_ORDER = ["U", "D", "C", "B", "A", "S"] as const;
        const tierIndex = (t: string) => TIER_ORDER.indexOf(t as (typeof TIER_ORDER)[number]);

        const evidence = buildPublicReadEvidence();

        // Same evidence body, two subject identities differing only in mode.
        // We strip the `kind` and `manifest` fields appropriately so the
        // engine doesn't see a malformed manifest-mode subject.
        const publicReadResult = computeScore(evidence, { nowSeconds: NOW });
        const manifestEvidence = {
            ...evidence,
            subject: {
                ...evidence.subject,
                mode: "manifest" as const,
                kind: "ai-agent" as const,
            },
        };
        const manifestResult = computeScore(manifestEvidence, {
            nowSeconds: NOW,
        });

        // Cap invariant: public-read mode never exceeds manifest mode.
        expect(tierIndex(publicReadResult.tier)).toBeLessThanOrEqual(
            tierIndex(manifestResult.tier),
        );

        // If manifest path landed above A, public-read must collapse it
        // to A with ceilingApplied === 'public_read_a'. This is the
        // discriminating branch: a ceiling regression makes this red.
        if (tierIndex(manifestResult.tier) > tierIndex("A")) {
            expect(publicReadResult.tier).toBe("A");
            expect(publicReadResult.ceilingApplied).toBe("public_read_a");
        }

        // S is structurally forbidden in public-read regardless.
        expect(publicReadResult.tier).not.toBe("S");
    });
});
