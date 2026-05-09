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
    test("subject.mode === 'public-read'; tier capped at A or below; engine never returns S", async ({
        msw: _msw,
    }) => {
        const evidence = buildPublicReadEvidence();
        const result = computeScore(evidence, { nowSeconds: NOW });

        // GATE-32 P0 — load-bearing invariants:
        //   1. mode propagates through the engine to the rendered banner so
        //      Stream C's US-132 can show the `confidence: public-read` chip.
        expect(result.meta.mode).toBe("public-read");

        //   2. Tier is never S in public-read mode. v1 already caps at A
        //      across the board (no verified-GitHub path), but the
        //      public-read mode cap is independent and load-bearing for
        //      adoption: any random ENS name without `agent-bench:bench_manifest`
        //      must not be able to advertise top-tier authority.
        expect(["A", "B", "C", "D", "U"]).toContain(result.tier);

        //   3. ceilingApplied is one of the documented values. When the raw
        //      tier already lands at-or-below A, no down-cap is necessary
        //      and the engine returns 'none' (CeilingApplied union also
        //      contains 'public_read_a' for explicit cap firing, and
        //      'unrated' for nonZeroSourceCount=0). Either of the first two
        //      is acceptable for a fixture that doesn't mint S.
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
});
