/**
 * Verify a Siren Report file matches its claimed EIP-712 signature and
 * (optionally) recovers to a given owner address. Used by reviewers and the
 * docs reproduction recipe (US-013) to confirm a report's integrity and
 * authority without trusting the producer.
 *
 * Usage:
 *   pnpm tsx scripts/verify-reports.ts reports/safe.json [--owner 0x...]
 *
 * Exit codes:
 *   0  - signature valid OR report is correctly marked unsigned
 *   1  - signature invalid / missing when claimed signed / owner mismatch
 *
 * The file's keccak256 bytes hash is also printed; this is the value that the
 * ENS upgrade_manifest's `reportHash` must match.
 */

import { readFileSync } from "node:fs";
import { argv, exit } from "node:process";
import {
    buildSirenReportTypedData,
    type Address,
    type SirenReport,
} from "@upgrade-siren/shared";
import { keccak256, recoverTypedDataAddress, toBytes, type Hex } from "viem";

function parseArgs(): { path: string; expectedOwner: Address | null } {
    const args = argv.slice(2);
    if (args.length === 0) {
        console.error("Usage: pnpm tsx scripts/verify-reports.ts <report.json> [--owner 0x...]");
        exit(2);
    }
    let path: string | null = null;
    let expectedOwner: Address | null = null;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--owner") {
            expectedOwner = args[++i] as Address;
        } else if (!path) {
            path = args[i];
        }
    }
    if (!path) {
        console.error("Missing report path.");
        exit(2);
    }
    return { path, expectedOwner };
}

async function main(): Promise<void> {
    const { path, expectedOwner } = parseArgs();
    const bytes = readFileSync(path, "utf8");
    const reportHash = keccak256(toBytes(bytes));
    const report = JSON.parse(bytes) as SirenReport;

    console.log(`File:        ${path}`);
    console.log(`reportHash:  ${reportHash}`);
    console.log(`schema:      ${report.schema}`);
    console.log(`name:        ${report.name}`);
    console.log(`verdict:     ${report.verdict}`);
    console.log(`auth.status: ${report.auth.status}`);

    if (report.auth.status === "unsigned") {
        console.log("Report is correctly marked UNSIGNED. Production verifier will return SIREN.");
        exit(0);
    }

    if (report.auth.status !== "valid") {
        console.error(`Unexpected auth.status: ${report.auth.status}`);
        exit(1);
    }

    if (!report.auth.signature || !report.auth.signer) {
        console.error("auth.status=valid but signature/signer missing");
        exit(1);
    }

    const typedData = buildSirenReportTypedData(report);
    const recovered = (await recoverTypedDataAddress({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
        signature: report.auth.signature as Hex,
    })) as Address;

    console.log(`auth.signer: ${report.auth.signer}`);
    console.log(`recovered:   ${recovered}`);

    if (recovered.toLowerCase() !== report.auth.signer.toLowerCase()) {
        console.error("FAIL: recovered signer does not match auth.signer");
        exit(1);
    }

    if (expectedOwner && recovered.toLowerCase() !== expectedOwner.toLowerCase()) {
        console.error(`FAIL: recovered signer does not match --owner ${expectedOwner}`);
        exit(1);
    }

    console.log("OK: signature recovers to auth.signer" + (expectedOwner ? " and matches --owner" : ""));
}

main().catch((err: unknown) => {
    console.error(err);
    exit(1);
});
