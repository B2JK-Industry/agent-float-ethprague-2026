/**
 * Build and sign demo Siren Reports for the safe / dangerous / unverified
 * scenarios. Reports are written to reports/<scenario>.json. Their bytes hash
 * is recorded so US-010's ENS provisioning script can store it as
 * `upgrade-siren:upgrade_manifest.reportHash`.
 *
 * Behavior:
 *   - When deployments/sepolia.json holds the all-zero placeholder, the script
 *     writes UNSIGNED report templates with auth.status="unsigned" so that
 *     US-013's docs reproduction recipe stays runnable. Stream B's verifier
 *     correctly returns SIREN for unsigned production reports.
 *   - When OPERATOR_PRIVATE_KEY is set AND addresses are real, each report is
 *     signed via packages/shared's signReport(); auth.status="valid" and the
 *     signature recovers to the operator address.
 *
 * Out of scope:
 *   - Live public-read scenario report (US-062 picks the target)
 *   - Hosting the JSONs at a public URL (Vercel static asset / GH Pages); that
 *     happens at deploy time (US-009 broadcast pre-req chain).
 *
 * Verification commands:
 *   pnpm tsx scripts/sign-reports.ts
 *   pnpm tsx scripts/verify-reports.ts reports/safe.json
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
    signReport,
    SIREN_REPORT_SCHEMA_ID,
    type Address,
    type Hex32,
    type SirenReport,
    type SirenReportFinding,
    type Verdict,
} from "@upgrade-siren/shared";
import { keccak256, toBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ZERO_ADDR: Address = "0x0000000000000000000000000000000000000000";
const ZERO_HASH: Hex32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

type Scenario = "safe" | "dangerous" | "unverified";

type Deployments = {
    proxy: Address;
    v1: Address;
    v2safe: Address;
    v2dangerous: Address;
    unverified: Address;
    chainId: number;
    blockNumber: number;
};

const SCENARIOS: ReadonlyArray<Scenario> = ["safe", "dangerous", "unverified"];
const REPORTS_DIR = "reports";

function readDeployments(): Deployments {
    return JSON.parse(readFileSync("deployments/sepolia.json", "utf8")) as Deployments;
}

function isPlaceholder(d: Deployments): boolean {
    return [d.proxy, d.v1, d.v2safe, d.v2dangerous, d.unverified].every((a) => a === ZERO_ADDR);
}

function currentImplFor(scenario: Scenario, d: Deployments): Address {
    if (scenario === "safe") return d.v2safe;
    if (scenario === "dangerous") return d.v2dangerous;
    return d.unverified;
}

function verdictFor(scenario: Scenario): Verdict {
    return scenario === "safe" ? "SAFE" : "SIREN";
}

function summaryFor(scenario: Scenario): string {
    if (scenario === "safe") {
        return "Verified V2 upgrade with storage layout matching V1 slot-for-slot. No new privileged selectors.";
    }
    if (scenario === "dangerous") {
        return "Verified V2 upgrade adds sweep(address,address) and reorders V1 slots 0/1. Verdict: SIREN.";
    }
    return "Implementation is not verified on Sourcify. No source -> no upgrade. Verdict: SIREN.";
}

function findingsFor(scenario: Scenario, d: Deployments): SirenReportFinding[] {
    if (scenario === "safe") {
        return [
            {
                id: "VERIFICATION_CURRENT",
                severity: "info",
                title: "Current implementation verified on Sourcify",
                evidence: { address: d.v2safe, sourcify: `https://sourcify.dev/#/lookup/${d.v2safe}` },
            },
            {
                id: "STORAGE_LAYOUT_COMPAT",
                severity: "info",
                title: "Storage layout slots 0 and 1 unchanged from V1",
                evidence: { previous: d.v1, current: d.v2safe },
            },
        ];
    }
    if (scenario === "dangerous") {
        return [
            {
                id: "ABI_DANGEROUS_SELECTOR",
                severity: "critical",
                title: "New privileged selector: sweep(address,address)",
                evidence: {
                    selector: "0x" + "00".repeat(4),
                    note: "Drains arbitrary ERC20 balance to recipient. Owner-callable, no timelock.",
                },
            },
            {
                id: "STORAGE_LAYOUT_INCOMPAT",
                severity: "critical",
                title: "V1 slots 0 and 1 are swapped in V2Dangerous",
                evidence: {
                    previous: { slot0: "address owner", slot1: "mapping balances" },
                    current: { slot0: "mapping balances", slot1: "address owner" },
                },
            },
        ];
    }
    return [
        {
            id: "VERIFICATION_NOT_FOUND",
            severity: "critical",
            title: "Implementation not verified on Sourcify",
            evidence: {
                address: d.unverified,
                sourcify: `https://sourcify.dev/server/check-by-addresses?addresses=${d.unverified}&chainIds=11155111`,
                note: "Sourcify returned not_found; no source means no upgrade.",
            },
        },
    ];
}

function buildReport(
    scenario: Scenario,
    d: Deployments,
    ensParent: string,
    owner: Address | null,
): SirenReport {
    const subname = `${scenario}.${ensParent}`;
    const currentImpl = currentImplFor(scenario, d);
    const verdict = verdictFor(scenario);

    return {
        schema: SIREN_REPORT_SCHEMA_ID,
        name: subname,
        chainId: d.chainId,
        proxy: d.proxy,
        previousImplementation: d.v1,
        currentImplementation: currentImpl,
        verdict,
        summary: summaryFor(scenario),
        findings: findingsFor(scenario, d),
        sourcify: {
            previousVerified: true,
            currentVerified: scenario !== "unverified",
            links: [],
        },
        mode: "signed-manifest",
        confidence: "operator-signed",
        ens: {
            recordsResolvedLive: true,
            manifestHash: ZERO_HASH,
            owner,
        },
        auth: {
            status: "unsigned",
            signatureType: null,
            signer: null,
            signature: null,
            signedAt: null,
        },
        recommendedAction: scenario === "safe" ? "approve" : "reject",
        mock: false,
        generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    };
}

function canonicalSerialize(report: SirenReport): string {
    return JSON.stringify(report, null, 2) + "\n";
}

async function main(): Promise<void> {
    const d = readDeployments();
    const ensParent = process.env.ENS_PARENT ?? "demo.upgradesiren.eth";
    const operatorKey = process.env.OPERATOR_PRIVATE_KEY as Hex | undefined;
    const placeholder = isPlaceholder(d);

    if (placeholder) {
        console.log("deployments/sepolia.json holds all-zero placeholders.");
        console.log("Writing UNSIGNED report templates; re-run after Sepolia broadcast (US-060).");
    } else if (!operatorKey) {
        console.log("OPERATOR_PRIVATE_KEY unset; writing UNSIGNED report templates (US-060).");
    }

    const owner: Address | null = operatorKey
        ? privateKeyToAccount(operatorKey).address
        : null;

    mkdirSync(REPORTS_DIR, { recursive: true });

    const summary: { scenario: Scenario; reportHash: Hex32; status: string }[] = [];

    for (const scenario of SCENARIOS) {
        const draft = buildReport(scenario, d, ensParent, owner);
        let toWrite: SirenReport = draft;
        let status = "unsigned";

        if (operatorKey && !placeholder) {
            const result = await signReport(draft, operatorKey);
            toWrite = result.report;
            status = `signed by ${result.signer}`;
        }

        const bytes = canonicalSerialize(toWrite);
        const reportHash = keccak256(toBytes(bytes)) as Hex32;
        writeFileSync(`${REPORTS_DIR}/${scenario}.json`, bytes);
        summary.push({ scenario, reportHash, status });
        console.log(`  ${scenario}: ${status}  reportHash=${reportHash}`);
    }

    console.log("\nSummary:");
    for (const row of summary) {
        console.log(`  ${row.scenario.padEnd(11)}  ${row.reportHash}  ${row.status}`);
    }
    console.log(
        "\nNext: feed reportHash values into scripts/provision-ens.ts on the next ENS provisioning run",
    );
    console.log("(re-run is idempotent; only the upgrade_manifest text record will update).");
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
