/**
 * Provision Upgrade Siren ENS demo subnames on Sepolia.
 *
 * For each demo subname this script:
 *   1. Ensures the subnode exists in the ENS Registry under the configured
 *      parent (idempotent setSubnodeRecord that points at the PublicResolver).
 *   2. Writes the four stable upgrade-siren:* text records (chain_id, proxy,
 *      owner, schema).
 *   3. Writes one atomic upgrade-siren:upgrade_manifest JSON record matching
 *      the schema in docs/04-technical-design.md (previousImpl, currentImpl,
 *      reportUri, reportHash, version, effectiveFrom, previousManifestHash).
 *
 * `reportHash` is the keccak256 of the bytes of `reports/<scenario>.json`
 * produced by scripts/sign-reports.ts (US-011). When the report file is
 * absent or the scenario has no report yet, reportHash falls back to
 * ZERO_HASH and the on-chain manifest accurately reflects "no report yet".
 *
 * `effectiveFrom` is preserved across re-runs when nothing material changed
 * (proxy, previousImpl, currentImpl, reportHash all match the prior on-chain
 * manifest). Without this, the manifest JSON would differ on every invocation
 * and the idempotency check would always rewrite, mutating the upgrade
 * timestamp without a real upgrade.
 *
 * Out of scope: ENSIP-26 records (US-012 — separate script).
 */

import { readFileSync } from "node:fs";
import {
    createPublicClient,
    createWalletClient,
    http,
    keccak256,
    namehash,
    parseAbi,
    stringToBytes,
    toBytes,
    type Address,
    type Hex,
    type PublicClient,
    type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

// Sepolia ENS PublicResolver. Stable across the demo lifetime.
// Ref: https://docs.ens.domains/learn/deployments
const SEPOLIA_PUBLIC_RESOLVER: Address = "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD";

// Canonical ENS Registry (deployed at the same address on mainnet and Sepolia).
// Ref: https://docs.ens.domains/learn/deployments
const ENS_REGISTRY: Address = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

const RESOLVER_ABI = parseAbi([
    "function text(bytes32 node, string calldata key) external view returns (string memory)",
    "function setText(bytes32 node, string calldata key, string calldata value) external",
]);

const REGISTRY_ABI = parseAbi([
    "function owner(bytes32 node) external view returns (address)",
    "function resolver(bytes32 node) external view returns (address)",
    "function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl) external",
]);

const ZERO_ADDR: Address = "0x0000000000000000000000000000000000000000";
const ZERO_HASH: Hex = "0x0000000000000000000000000000000000000000000000000000000000000000";

type Deployments = {
    proxy: Address;
    v1: Address;
    v2safe: Address;
    v2dangerous: Address;
    unverified: Address;
    chainId: number;
    blockNumber: number;
};

type ReportScenario = "safe" | "dangerous" | "unverified";

type Subname = {
    label: string;
    name: string;
    currentImplKey: keyof Pick<Deployments, "v1" | "v2safe" | "v2dangerous" | "unverified">;
    reportScenario: ReportScenario | null;
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
    { label: "vault", name: `vault.${ENS_PARENT}`, currentImplKey: "v1", reportScenario: null },
    { label: "safe", name: `safe.${ENS_PARENT}`, currentImplKey: "v2safe", reportScenario: "safe" },
    {
        label: "dangerous",
        name: `dangerous.${ENS_PARENT}`,
        currentImplKey: "v2dangerous",
        reportScenario: "dangerous",
    },
    {
        label: "unverified",
        name: `unverified.${ENS_PARENT}`,
        currentImplKey: "unverified",
        reportScenario: "unverified",
    },
];

function readDeployments(): Deployments {
    const raw = readFileSync("deployments/sepolia.json", "utf8");
    return JSON.parse(raw) as Deployments;
}

function isPlaceholder(d: Deployments): boolean {
    return [d.proxy, d.v1, d.v2safe, d.v2dangerous, d.unverified].every((a) => a === ZERO_ADDR);
}

/**
 * keccak256 of the bytes of `reports/<scenario>.json`, BUT only if the report's
 * internal proxy/previousImplementation/currentImplementation fields match the
 * deployment we are about to provision.
 *
 * Returns ZERO_HASH when:
 *   - scenario is null (vault baseline; no scenario report)
 *   - the report file is absent
 *   - the report file is malformed JSON
 *   - the report's internal addresses do not match the deployment
 *
 * The mismatch case is the load-bearing one. Without this check, `provision-ens`
 * would happily publish a non-zero `reportHash` for a stale `reports/*.json`
 * left over from a previous deployment — the on-chain manifest would point at a
 * `reportUri` whose payload addresses do not match the live `proxy`/`v1`/etc.,
 * silently breaking the §4.3 verifier even though every individual record looks
 * well-formed. Returning ZERO_HASH here keeps the manifest honest about
 * "no report for this deployment yet" until `scripts/sign-reports.ts` is rerun.
 */
function readReportHash(
    scenario: ReportScenario | null,
    expectedProxy: Address,
    expectedPreviousImpl: Address,
    expectedCurrentImpl: Address,
): Hex {
    if (!scenario) return ZERO_HASH;
    let bytes: string;
    try {
        bytes = readFileSync(`reports/${scenario}.json`, "utf8");
    } catch {
        return ZERO_HASH;
    }

    let parsed: {
        proxy?: string;
        previousImplementation?: string;
        currentImplementation?: string;
    };
    try {
        parsed = JSON.parse(bytes) as typeof parsed;
    } catch {
        return ZERO_HASH;
    }

    const eq = (a: string | undefined, b: string): boolean =>
        typeof a === "string" && a.toLowerCase() === b.toLowerCase();
    if (
        !eq(parsed.proxy, expectedProxy)
        || !eq(parsed.previousImplementation, expectedPreviousImpl)
        || !eq(parsed.currentImplementation, expectedCurrentImpl)
    ) {
        return ZERO_HASH;
    }

    return keccak256(toBytes(bytes));
}

function labelHash(label: string): Hex {
    return keccak256(stringToBytes(label));
}

async function ensureSubnode(
    publicClient: PublicClient,
    walletClient: WalletClient,
    parentNode: Hex,
    label: string,
    subnodeNamehash: Hex,
    operator: Address,
): Promise<"existed" | Hex> {
    const [currentOwner, currentResolver] = await Promise.all([
        publicClient.readContract({
            address: ENS_REGISTRY,
            abi: REGISTRY_ABI,
            functionName: "owner",
            args: [subnodeNamehash],
        }),
        publicClient.readContract({
            address: ENS_REGISTRY,
            abi: REGISTRY_ABI,
            functionName: "resolver",
            args: [subnodeNamehash],
        }),
    ]);

    if (
        currentOwner.toLowerCase() === operator.toLowerCase()
        && currentResolver.toLowerCase() === SEPOLIA_PUBLIC_RESOLVER.toLowerCase()
    ) {
        return "existed";
    }

    if (!walletClient.account) throw new Error("walletClient.account missing");
    const txHash = await walletClient.writeContract({
        account: walletClient.account,
        address: ENS_REGISTRY,
        abi: REGISTRY_ABI,
        functionName: "setSubnodeRecord",
        args: [parentNode, labelHash(label), operator, SEPOLIA_PUBLIC_RESOLVER, 0n],
        chain: sepolia,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
        throw new Error(`setSubnodeRecord reverted (tx ${txHash})`);
    }
    return txHash;
}

async function readExistingManifest(
    publicClient: PublicClient,
    node: Hex,
): Promise<UpgradeManifest | null> {
    const text = (await publicClient.readContract({
        address: SEPOLIA_PUBLIC_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: "text",
        args: [node, "upgrade-siren:upgrade_manifest"],
    })) as string;
    if (!text) return null;
    try {
        return JSON.parse(text) as UpgradeManifest;
    } catch {
        return null;
    }
}

function buildManifest(
    sub: Subname,
    d: Deployments,
    reportHash: Hex,
    existing: UpgradeManifest | null,
    nowIso: string,
): UpgradeManifest {
    const proxy = d.proxy;
    const previousImpl = d.v1;
    const currentImpl = d[sub.currentImplKey];
    const reportUri = `https://upgradesiren.app/r/${sub.name}.json`;

    // Preserve effectiveFrom when nothing material changed. Without this,
    // re-runs would mutate the upgrade timestamp on every invocation and break
    // the "idempotent" promise of US-010.
    const materialUnchanged =
        existing !== null
        && existing.proxy.toLowerCase() === proxy.toLowerCase()
        && existing.previousImpl.toLowerCase() === previousImpl.toLowerCase()
        && existing.currentImpl.toLowerCase() === currentImpl.toLowerCase()
        && existing.reportHash.toLowerCase() === reportHash.toLowerCase()
        && existing.reportUri === reportUri;

    const effectiveFrom = materialUnchanged ? existing.effectiveFrom : nowIso;
    const previousManifestHash = existing
        ? keccak256(stringToBytes(JSON.stringify(existing)))
        : ZERO_HASH;

    return {
        schema: "upgrade-siren-manifest@1",
        chainId: d.chainId,
        proxy,
        previousImpl,
        currentImpl,
        reportUri,
        reportHash,
        version: existing ? existing.version + (materialUnchanged ? 0 : 1) : 1,
        effectiveFrom,
        previousManifestHash: materialUnchanged ? existing.previousManifestHash : previousManifestHash,
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
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
        throw new Error(`setText(${key}) reverted (tx ${txHash})`);
    }
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

    console.log(`Operator:    ${account.address}`);
    console.log(`ENS parent:  ${ENS_PARENT}`);
    console.log(`Registry:    ${ENS_REGISTRY}`);
    console.log(`Resolver:    ${SEPOLIA_PUBLIC_RESOLVER}`);

    const parentNode = namehash(ENS_PARENT);
    const parentOwner = (await publicClient.readContract({
        address: ENS_REGISTRY,
        abi: REGISTRY_ABI,
        functionName: "owner",
        args: [parentNode],
    })) as Address;
    if (parentOwner.toLowerCase() !== account.address.toLowerCase()) {
        console.error(
            `Parent ${ENS_PARENT} is owned by ${parentOwner}, not ${account.address}.`,
        );
        console.error("Tracker US-061 (ENS parent registration); operator wallet must own the parent.");
        process.exit(1);
    }

    const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

    for (const sub of SUBNAMES) {
        const node = namehash(sub.name);

        const subnodeResult = await ensureSubnode(
            publicClient,
            walletClient,
            parentNode,
            sub.label,
            node,
            account.address,
        );
        console.log(`  ${sub.name}  subnode -> ${subnodeResult}`);

        const reportHash = readReportHash(
            sub.reportScenario,
            d.proxy,
            d.v1,
            d[sub.currentImplKey],
        );
        const existing = await readExistingManifest(publicClient, node);
        const manifest = buildManifest(sub, d, reportHash, existing, nowIso);
        const manifestJson = JSON.stringify(manifest);

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

        const manifestResult = await setTextIfChanged(
            publicClient,
            walletClient,
            node,
            "upgrade-siren:upgrade_manifest",
            manifestJson,
        );
        console.log(
            `  ${sub.name}  upgrade-siren:upgrade_manifest reportHash=${reportHash} -> ${manifestResult}`,
        );
    }

    console.log("\nProvisioning complete.");
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
