/**
 * US-146: provision the one owned `kind:"ai-agent"` Bench Mode demo subject
 * `siren-agent-demo.upgrade-siren-demo.eth` on Sepolia.
 *
 * Reuses the Epic 1 operator-key custody (US-010) and the unwrapped ENS
 * parent at `upgrade-siren-demo.eth`. Writes three text records under the
 * agent-bench:* namespace at the Sepolia PublicResolver:
 *
 *   - agent-bench:owner          = operator wallet address
 *   - agent-bench:schema         = "agent-bench-manifest@1"
 *   - agent-bench:bench_manifest = atomic JSON, source-of-truth committed
 *                                  at apps/web/public/manifests/<subname>.json
 *
 * The bench_manifest payload validates against
 * packages/shared/schemas/agent-bench-manifest-v1.json (kind=ai-agent,
 * sources.{sourcify, github, onchain, ensInternal}). Stream B's US-111
 * resolver parses this exact shape live during the demo.
 *
 * Idempotent: each setText is preceded by a public read; subnode creation
 * is preceded by an owner check (only fires setSubnodeRecord when the
 * subnode is not already owned by the operator with PublicResolver set).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    createPublicClient,
    createWalletClient,
    http,
    keccak256,
    namehash,
    parseAbi,
    stringToBytes,
    type Address,
    type Hex,
    type PublicClient,
    type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Sepolia ENS canonical addresses, same as Epic 1 provision-ens.ts.
const SEPOLIA_PUBLIC_RESOLVER: Address = "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD";
const ENS_REGISTRY: Address = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

const REGISTRY_ABI = parseAbi([
    "function owner(bytes32 node) external view returns (address)",
    "function resolver(bytes32 node) external view returns (address)",
    "function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl) external",
]);

const RESOLVER_ABI = parseAbi([
    "function text(bytes32 node, string calldata key) external view returns (string memory)",
    "function setText(bytes32 node, string calldata key, string calldata value) external",
]);

// Subject under the existing Epic 1 parent. Operator already owns the parent
// in the ENS Registry (unwrapped from NameWrapper during US-010 provisioning).
const ENS_PARENT = process.env.ENS_PARENT ?? "upgrade-siren-demo.eth";
const SUBJECT_LABEL = "siren-agent-demo";
const SUBJECT_NAME = `${SUBJECT_LABEL}.${ENS_PARENT}`;
const MANIFEST_FILE = "apps/web/public/manifests/siren-agent-demo.upgrade-siren-demo.eth.json";

const AGENT_BENCH_RECORDS = {
    owner: "agent-bench:owner",
    schema: "agent-bench:schema",
    benchManifest: "agent-bench:bench_manifest",
} as const;

const AGENT_BENCH_SCHEMA_ID = "agent-bench-manifest@1";

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
    const operatorKey = process.env.OPERATOR_PRIVATE_KEY;
    const rpcUrl = process.env.ALCHEMY_RPC_SEPOLIA;
    if (!operatorKey) {
        console.error("OPERATOR_PRIVATE_KEY unset (Tracker US-060).");
        process.exit(1);
    }
    if (!rpcUrl) {
        console.error("ALCHEMY_RPC_SEPOLIA unset.");
        process.exit(1);
    }

    const account = privateKeyToAccount(operatorKey as Hex);
    const transport = http(rpcUrl);
    const publicClient = createPublicClient({ chain: sepolia, transport });
    const walletClient = createWalletClient({ account, chain: sepolia, transport });

    // Sanity-check the parent: operator must own it directly in ENS Registry.
    const parentNode = namehash(ENS_PARENT);
    const parentOwner = (await publicClient.readContract({
        address: ENS_REGISTRY,
        abi: REGISTRY_ABI,
        functionName: "owner",
        args: [parentNode],
    })) as Address;
    if (parentOwner.toLowerCase() !== account.address.toLowerCase()) {
        console.error(`Parent ${ENS_PARENT} is owned by ${parentOwner}, not ${account.address}.`);
        console.error("Tracker US-061 (ENS parent registration); operator wallet must own the parent.");
        process.exit(1);
    }

    // Read the source-of-truth manifest committed in this PR. We hash the
    // exact bytes we will write to ENS so anyone can re-derive the on-chain
    // value from the file.
    const repoRoot = path.resolve(__dirname, "..");
    const manifestPath = path.join(repoRoot, MANIFEST_FILE);
    const manifestBytes = readFileSync(manifestPath, "utf8");
    // Validate the JSON parses; full JSON-Schema validation happens in
    // packages/shared (US-111). Here we only ensure the bytes are JSON.
    JSON.parse(manifestBytes);
    // Strip trailing newline (from editor) before writing as text record so
    // the on-chain string is the canonical compact form. We keep the file's
    // pretty-print on disk for reviewability.
    const manifestRaw = JSON.stringify(JSON.parse(manifestBytes));

    console.log(`Operator:    ${account.address}`);
    console.log(`Subject:     ${SUBJECT_NAME}`);
    console.log(`Manifest src: ${MANIFEST_FILE}`);
    console.log(`Resolver:    ${SEPOLIA_PUBLIC_RESOLVER}`);

    const subnodeHash = namehash(SUBJECT_NAME);
    const subnodeResult = await ensureSubnode(
        publicClient,
        walletClient,
        parentNode,
        SUBJECT_LABEL,
        subnodeHash,
        account.address,
    );
    console.log(`  ${SUBJECT_NAME}  subnode -> ${subnodeResult}`);

    const records: [string, string][] = [
        [AGENT_BENCH_RECORDS.owner, account.address],
        [AGENT_BENCH_RECORDS.schema, AGENT_BENCH_SCHEMA_ID],
        [AGENT_BENCH_RECORDS.benchManifest, manifestRaw],
    ];
    for (const [key, value] of records) {
        const display = key === AGENT_BENCH_RECORDS.benchManifest
            ? `<JSON ${value.length} bytes>`
            : value;
        const result = await setTextIfChanged(publicClient, walletClient, subnodeHash, key, value);
        console.log(`  ${SUBJECT_NAME}  ${key} = ${display}  -> ${result}`);
    }

    console.log("\nProvisioning complete.");
    console.log(`Verify: cast call --rpc-url $ALCHEMY_RPC_SEPOLIA \\`);
    console.log(`  ${SEPOLIA_PUBLIC_RESOLVER} \\`);
    console.log(`  "text(bytes32,string)(string)" \\`);
    console.log(`  ${subnodeHash} \\`);
    console.log(`  "${AGENT_BENCH_RECORDS.benchManifest}"`);
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
