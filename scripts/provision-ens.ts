/**
 * Provision Upgrade Siren ENS demo subnames on Sepolia.
 *
 * For each demo subname this script writes:
 *   - stable upgrade-siren:* text records (chain_id, proxy, owner, schema)
 *   - one atomic upgrade-siren:upgrade_manifest JSON record matching the
 *     schema in docs/04-technical-design.md (previousImpl, currentImpl,
 *     reportUri, reportHash, version, effectiveFrom, previousManifestHash).
 *
 * Idempotency: each setText is preceded by a public read; a write is only
 * issued when the on-chain value differs from the desired value. Re-runs are
 * a no-op once everything is in sync.
 *
 * Out of scope: ENSIP-26 agent-context / agent-endpoint records (US-012),
 * Siren Report hosting + signing (US-011 — provides real reportHash).
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
    type WalletClient,
    type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

// Sepolia ENS PublicResolver. Stable across the demo lifetime.
// Ref: https://docs.ens.domains/learn/deployments
const SEPOLIA_PUBLIC_RESOLVER: Address = "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD";

// ENS resolver ABI subset we use.
const RESOLVER_ABI = parseAbi([
    "function text(bytes32 node, string calldata key) external view returns (string memory)",
    "function setText(bytes32 node, string calldata key, string calldata value) external",
]);

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";

type Deployments = {
    proxy: Address;
    v1: Address;
    v2safe: Address;
    v2dangerous: Address;
    unverified: Address;
    chainId: number;
    blockNumber: number;
};

type Subname = {
    name: string;
    currentImplKey: keyof Pick<Deployments, "v1" | "v2safe" | "v2dangerous" | "unverified">;
};

type UpgradeManifest = {
    schema: "upgrade-siren-manifest@1";
    chainId: number;
    proxy: Address;
    previousImpl: Address;
    currentImpl: Address;
    reportUri: string;
    reportHash: Hex;
    version: number;
    effectiveFrom: string;
    previousManifestHash: Hex;
};

const ENS_PARENT = process.env.ENS_PARENT ?? "demo.upgradesiren.eth";

const SUBNAMES: Subname[] = [
    { name: `vault.${ENS_PARENT}`, currentImplKey: "v1" },
    { name: `safe.${ENS_PARENT}`, currentImplKey: "v2safe" },
    { name: `dangerous.${ENS_PARENT}`, currentImplKey: "v2dangerous" },
    { name: `unverified.${ENS_PARENT}`, currentImplKey: "unverified" },
];

function readDeployments(): Deployments {
    const raw = readFileSync("deployments/sepolia.json", "utf8");
    return JSON.parse(raw) as Deployments;
}

function isPlaceholder(d: Deployments): boolean {
    return [d.proxy, d.v1, d.v2safe, d.v2dangerous, d.unverified].every((a) => a === ZERO_ADDR);
}

function buildManifest(
    subname: Subname,
    d: Deployments,
    operator: Address,
    reportHash: Hex,
): UpgradeManifest {
    return {
        schema: "upgrade-siren-manifest@1",
        chainId: d.chainId,
        proxy: d.proxy,
        previousImpl: d.v1,
        currentImpl: d[subname.currentImplKey],
        reportUri: `https://upgradesiren.app/r/${subname.name}.json`,
        reportHash,
        version: 1,
        effectiveFrom: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
        previousManifestHash: ZERO_HASH,
    };
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
    const txHash = await walletClient.writeContract({
        account: walletClient.account,
        address: SEPOLIA_PUBLIC_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: "setText",
        args: [node, key, value],
        chain: sepolia,
    });
    return txHash;
}

async function main(): Promise<void> {
    const d = readDeployments();

    if (isPlaceholder(d)) {
        console.log("deployments/sepolia.json holds all-zero placeholders.");
        console.log(
            "Sepolia broadcast has not happened yet (Tracker US-060: deployer-key custody).",
        );
        console.log("Re-run this script after the broadcast populates real addresses.");
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

    // reportHash is filled in by US-011 (signed reports). Until then write zero;
    // subsequent runs of this script update only when reportHash actually changes.
    const reportHash: Hex = ZERO_HASH;

    for (const sub of SUBNAMES) {
        const node = namehash(sub.name);
        const stable: [string, string][] = [
            ["upgrade-siren:chain_id", String(d.chainId)],
            ["upgrade-siren:proxy", d.proxy],
            ["upgrade-siren:owner", account.address],
            ["upgrade-siren:schema", "upgrade-siren-manifest@1"],
        ];

        for (const [key, value] of stable) {
            const result = await setTextIfChanged(publicClient, walletClient, node, key, value);
            console.log(`  ${sub.name}  ${key} = ${value}  -> ${result}`);
        }

        const manifest = buildManifest(sub, d, account.address, reportHash);
        const manifestJson = JSON.stringify(manifest);
        const manifestResult = await setTextIfChanged(
            publicClient,
            walletClient,
            node,
            "upgrade-siren:upgrade_manifest",
            manifestJson,
        );
        console.log(`  ${sub.name}  upgrade-siren:upgrade_manifest -> ${manifestResult}`);
    }

    console.log("\nProvisioning complete.");
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
