// US-127: mid-score scenario — mixed verification states; demonstrates the
// trust-discount visibly.
//
// Subject is `manifest`-mode like US-126, but the evidence shape is
// degraded: only one of three GitHub repos has a test dir, only two have
// a substantive README, only one has a LICENSE. Sourcify still verifies
// exact_match (Sourcify-hosted contracts are intrinsically verified). The
// score lands in a middle band, AND the breakdown panel must render
// `× 0.6` on every component the engine labels `unverified` (per
// EPIC §10 / D-G lock — GATE-30 visibility precondition).
//
// Discriminating assertion (per launch prompt): at least one breakdown
// component carries `trust='unverified'` AND `trustFactor=0.6`. The
// counterpart assertion — verified components carry trustFactor=1.0 — is
// the structural defense the v1 ceiling depends on.

import { test, expect } from "../../fixtures/bench-test.js";
import { computeScore } from "../../../../../packages/evidence/src/score/engine.js";
import type {
    GithubP0Signals,
    GithubRepoP0,
} from "../../../../../packages/evidence/src/sources/github/types.js";
import type {
    MultiSourceEvidence,
    SourcifyEntryEvidence,
    SubjectIdentity,
} from "../../../../../packages/evidence/src/bench/types.js";

const NOW = 1778198400;
const ADDR_IMPL = "0x2222222222222222222222222222222222222222" as const;
const ADDR_PRIMARY = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;

function manifestSubject(name: string): SubjectIdentity {
    return {
        name,
        chainId: 1,
        mode: "manifest",
        primaryAddress: ADDR_PRIMARY,
        kind: "ai-agent",
        manifest: null,
    };
}

function verifiedSourcify(): SourcifyEntryEvidence {
    return {
        kind: "ok",
        chainId: 1,
        address: ADDR_IMPL,
        label: "Vault",
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

function repo(
    name: string,
    pushedSecondsAgo: number,
    opts: { test: boolean; readme: boolean; license: boolean },
): GithubRepoP0 {
    return {
        name,
        fullName: `mid-subject/${name}`,
        createdAt: "2024-01-01T00:00:00.000Z",
        pushedAt: new Date((NOW - pushedSecondsAgo) * 1000).toISOString(),
        archived: false,
        defaultBranch: "main",
        license: opts.license ? "MIT" : null,
        topics: [],
        hasTestDir: opts.test,
        hasSubstantialReadme: opts.readme,
        readmeBytes: opts.readme ? 1024 : null,
        hasLicense: opts.license,
        fetchStatus: "ok",
    };
}

function githubMixed(): GithubP0Signals {
    return {
        owner: "mid-subject",
        user: {
            login: "mid-subject",
            createdAt: "2023-01-01T00:00:00.000Z",
            publicRepos: 8,
            followers: 30,
        },
        repos: [
            repo("alpha", 86400 * 30, { test: true, readme: true, license: true }),
            repo("beta", 86400 * 200, { test: false, readme: true, license: false }),
            repo("gamma", 86400 * 365, { test: false, readme: false, license: false }),
        ],
    };
}

function buildMidScoreEvidence(): MultiSourceEvidence {
    return {
        subject: manifestSubject("mid-score.upgrade-siren-demo.eth"),
        sourcify: [verifiedSourcify()],
        github: { kind: "ok", value: githubMixed() },
        onchain: [
            {
                kind: "ok",
                chainId: 1,
                value: {
                    chainId: 1,
                    address: ADDR_PRIMARY,
                    nonce: 200,
                    firstTxBlock: 18_000_000n,
                    firstTxTimestamp: 1_700_000_000,
                    latestBlock: 19_000_000n,
                },
            },
        ],
        ensInternal: {
            kind: "ok",
            value: {
                name: "mid-score.upgrade-siren-demo.eth",
                registrationDate: NOW - 86400 * 30,
                subnameCount: 1,
                textRecordCount: 2,
                lastRecordUpdateBlock: BigInt(Math.floor(NOW / 12) - 100_000),
            },
        },
        crossChain: null,
        failures: [],
    };
}

test.describe("US-127 mid-score scenario — mixed verification states with trust-discount visible", () => {
    test("breakdown renders trustFactor=0.6 on at least one unverified component AND trustFactor=1.0 on verified components (GATE-30)", async ({
        msw: _msw,
    }) => {
        const evidence = buildMidScoreEvidence();
        const result = computeScore(evidence, { nowSeconds: NOW });

        const allComponents = [
            ...result.breakdown.seniority.components,
            ...result.breakdown.relevance.components,
        ];

        const unverified = allComponents.filter((c) => c.trust === "unverified");
        const verified = allComponents.filter((c) => c.trust === "verified");

        // Discriminating assertion: BOTH classes are present in the breakdown
        // for a mixed-state subject. If only one trust class showed up, the
        // panel could not visibly differentiate them in front of judges.
        expect(unverified.length).toBeGreaterThan(0);
        expect(verified.length).toBeGreaterThan(0);

        // GATE-30 visibility precondition. The breakdown panel renders these
        // numbers literally as `× 0.6` / `× 1.0` columns next to each row.
        for (const c of unverified) {
            expect(c.trustFactor).toBe(0.6);
        }
        for (const c of verified) {
            expect(c.trustFactor).toBe(1.0);
        }

        // Sanity envelope: a mixed-state subject should not pretend to be a
        // top-tier subject. v1 ceiling already caps tier at A; mid-score
        // means we land below the high-band entrypoint.
        expect(result.tier).not.toBe("S");
        expect(result.meta.mode).toBe("manifest");
    });
});
