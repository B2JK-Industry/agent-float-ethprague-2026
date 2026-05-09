/**
 * Provision ENSIP-26 standard records (`agent-context`, `agent-endpoint[web]`)
 * on each demo subname. Writes alongside the upgrade-siren:* records produced
 * by scripts/provision-ens.ts (US-010) so the demo subnames are discoverable
 * by both upgrade-siren-aware clients AND any agent that follows the ENSIP-26
 * standard.
 *
 * Out of scope: agent-endpoint[mcp] (P2; ships with US-056 Siren Agent
 * watchlist).
 *
 * Idempotent: each setText is preceded by a public read; a write fires only
 * when the on-chain value differs from the desired value.
 */

import { readFileSync } from "node:fs";
import {
    createPublicClient,
    createWalletClient,
    http,
    namehash,
    parseAbi,
    type Address,
    type Hex,
    type PublicClient,
    type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

// Sepolia ENS PublicResolver. Same target as scripts/provision-ens.ts.
const SEPOLIA_PUBLIC_RESOLVER: Address = "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD";

const RESOLVER_ABI = parseAbi([
    "function text(bytes32 node, string calldata key) external view returns (string memory)",
    "function setText(bytes32 node, string calldata key, string calldata value) external",
]);

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

type Deployments = {
    proxy: Address;
    v1: Address;
    v2safe: Address;
    v2dangerous: Address;
    unverified: Address;
    chainId: number;
    blockNumber: number;
};

type Subname = { name: string; label: string };

const ENS_PARENT = process.env.ENS_PARENT ?? "demo.upgradesiren.eth";
const REPORT_BASE_URL = process.env.REPORT_BASE_URL ?? "https://upgradesiren.app/r";

const SUBNAMES: Subname[] = [
    { name: `vault.${ENS_PARENT}`, label: "vault baseline (V1)" },
    { name: `safe.${ENS_PARENT}`, label: "safe upgrade (V2Safe)" },
    { name: `dangerous.${ENS_PARENT}`, label: "dangerous upgrade (V2Dangerous)" },
    { name: `unverified.${ENS_PARENT}`, label: "unverified upgrade" },
];

function readDeployments(): Deployments {
    return JSON.parse(readFileSync("deployments/sepolia.json", "utf8")) as Deployments;
}

function isPlaceholder(d: Deployments): boolean {
    return [d.proxy, d.v1, d.v2safe, d.v2dangerous, d.unverified].every((a) => a === ZERO_ADDR);
}

async function setTextIfChanged(
    publicClient: PublicClient,
    walletClient: WalletClient,
    node: Hex,
    key: string,
    value: string,
): Promise<"unchanged" | Hex> {
    const current = await publicClient.readContract({
        address: SEPOLIA_PUBLIC_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: "text",
        args: [node, key],
    });
    if (current === value) return "unchanged";

    if (!walletClient.account) throw new Error("walletClient.account missing");
    return await walletClient.writeContract({
        account: walletClient.account,
        address: SEPOLIA_PUBLIC_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: "setText",
        args: [node, key, value],
        chain: sepolia,
    });
}

async function main(): Promise<void> {
    const d = readDeployments();
    if (isPlaceholder(d)) {
        console.log("deployments/sepolia.json holds all-zero placeholders.");
        console.log(
            "Sepolia broadcast has not happened yet (Tracker US-060: deployer-key custody).",
        );
        console.log("Re-run after the broadcast and after scripts/provision-ens.ts has run.");
        return;
    }

    const operatorKey = process.env.OPERATOR_PRIVATE_KEY;
    if (!operatorKey) {
        console.error("OPERATOR_PRIVATE_KEY unset.");
        console.error("Tracker US-060 (custody decision) + US-061 (parent registration).");
        process.exit(1);
    }
    const rpcUrl = process.env.ALCHEMY_RPC_SEPOLIA;
    if (!rpcUrl) {
        console.error("ALCHEMY_RPC_SEPOLIA unset.");
        process.exit(1);
    }

    const account = privateKeyToAccount(operatorKey as Hex);
    const transport = http(rpcUrl);
    const publicClient = createPublicClient({ chain: sepolia, transport });
    const walletClient = createWalletClient({ account, chain: sepolia, transport });

    console.log(`Operator: ${account.address}`);
    console.log(`ENS parent: ${ENS_PARENT}`);
    console.log(`Report base URL: ${REPORT_BASE_URL}`);

    for (const sub of SUBNAMES) {
        const node = namehash(sub.name);
        const records: [string, string][] = [
            ["agent-context", `Upgrade Siren risk report for ${sub.name} (${sub.label})`],
            ["agent-endpoint[web]", `${REPORT_BASE_URL}/${sub.name}`],
        ];
        for (const [key, value] of records) {
            const result = await setTextIfChanged(publicClient, walletClient, node, key, value);
            console.log(`  ${sub.name}  ${key} = ${value}  -> ${result}`);
        }
    }

    console.log("\nENSIP-26 provisioning complete.");
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
