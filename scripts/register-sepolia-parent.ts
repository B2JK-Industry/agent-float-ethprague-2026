/**
 * One-shot Sepolia ENS parent registration helper. Used by the post-Tracker
 * playbook to acquire a parent the operator wallet can write subnames under.
 *
 * Not part of the merged backlog; lives under scripts/ for ad-hoc operator
 * use until US-061 supplies a long-lived parent. Idempotent: bails early if
 * the chosen parent is already owned by `OPERATOR_PRIVATE_KEY`'s address.
 *
 * Steps (ENS commit-reveal):
 *   1. read rentPrice(name, duration)
 *   2. makeCommitment(name, owner, duration, secret, ...)
 *   3. commit(commitment)
 *   4. wait minCommitmentAge (60s on Sepolia)
 *   5. register(...) with msg.value = price.base + price.premium
 *
 * Usage:
 *   ENS_PARENT_LABEL=upgrade-siren-demo pnpm tsx scripts/register-sepolia-parent.ts
 */

import {
    createPublicClient,
    createWalletClient,
    http,
    namehash,
    parseAbi,
    type Address,
    type Hex,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { sepolia } from "viem/chains";

// Sepolia ETHRegistrarController (v1.0 deployment used on Sepolia).
// Source: https://docs.ens.domains/learn/deployments
const SEPOLIA_CONTROLLER: Address = "0xFED6a969AaA60E4961FCD3EBF1A2e8913ac65B72";
const SEPOLIA_PUBLIC_RESOLVER: Address = "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD";
const ENS_REGISTRY: Address = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

const REGISTRY_ABI = parseAbi([
    "function owner(bytes32 node) external view returns (address)",
]);

const CONTROLLER_ABI = parseAbi([
    "function rentPrice(string name, uint256 duration) view returns (uint256 base, uint256 premium)",
    "function available(string name) view returns (bool)",
    "function minCommitmentAge() view returns (uint256)",
    "function makeCommitment(string name, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] data, bool reverseRecord, uint16 ownerControlledFuses) view returns (bytes32)",
    "function commit(bytes32 commitment) external",
    "function register(string name, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] data, bool reverseRecord, uint16 ownerControlledFuses) external payable",
]);

async function main(): Promise<void> {
    const operatorKey = process.env.OPERATOR_PRIVATE_KEY as Hex | undefined;
    const rpcUrl = process.env.ALCHEMY_RPC_SEPOLIA;
    const label = process.env.ENS_PARENT_LABEL ?? "upgrade-siren-demo";
    if (!operatorKey || !rpcUrl) {
        console.error("OPERATOR_PRIVATE_KEY and ALCHEMY_RPC_SEPOLIA required");
        process.exit(1);
    }

    const account = privateKeyToAccount(operatorKey);
    const transport = http(rpcUrl);
    const publicClient = createPublicClient({ chain: sepolia, transport });
    const walletClient = createWalletClient({ account, chain: sepolia, transport });

    const fullName = `${label}.eth`;
    const node = namehash(fullName);

    // Idempotency: bail if already owned.
    const currentOwner = (await publicClient.readContract({
        address: ENS_REGISTRY,
        abi: REGISTRY_ABI,
        functionName: "owner",
        args: [node],
    })) as Address;
    if (currentOwner.toLowerCase() === account.address.toLowerCase()) {
        console.log(`${fullName} already owned by ${account.address}; nothing to do.`);
        return;
    }

    const available = await publicClient.readContract({
        address: SEPOLIA_CONTROLLER,
        abi: CONTROLLER_ABI,
        functionName: "available",
        args: [label],
    });
    if (!available) {
        console.error(`${fullName} is not available for registration on Sepolia.`);
        process.exit(1);
    }

    const duration = 31_536_000n; // 1 year in seconds
    const [basePrice, premium] = (await publicClient.readContract({
        address: SEPOLIA_CONTROLLER,
        abi: CONTROLLER_ABI,
        functionName: "rentPrice",
        args: [label, duration],
    })) as [bigint, bigint];
    const totalPrice = basePrice + premium;

    console.log(`Registering ${fullName} for 1 year`);
    console.log(`  owner    : ${account.address}`);
    console.log(`  base     : ${basePrice} wei`);
    console.log(`  premium  : ${premium} wei`);
    console.log(`  total    : ${totalPrice} wei`);

    const secret = generatePrivateKey() as Hex;
    const commitment = (await publicClient.readContract({
        address: SEPOLIA_CONTROLLER,
        abi: CONTROLLER_ABI,
        functionName: "makeCommitment",
        args: [label, account.address, duration, secret, SEPOLIA_PUBLIC_RESOLVER, [], false, 0],
    })) as Hex;

    const minAge = (await publicClient.readContract({
        address: SEPOLIA_CONTROLLER,
        abi: CONTROLLER_ABI,
        functionName: "minCommitmentAge",
    })) as bigint;
    console.log(`  minCommitmentAge: ${minAge}s`);

    const commitTx = await walletClient.writeContract({
        account,
        address: SEPOLIA_CONTROLLER,
        abi: CONTROLLER_ABI,
        functionName: "commit",
        args: [commitment],
        chain: sepolia,
    });
    console.log(`  commit tx: ${commitTx}`);

    await publicClient.waitForTransactionReceipt({ hash: commitTx });
    const waitMs = Number(minAge + 5n) * 1000;
    console.log(`  waiting ${waitMs / 1000}s for commitment to age...`);
    await new Promise((r) => setTimeout(r, waitMs));

    const registerTx = await walletClient.writeContract({
        account,
        address: SEPOLIA_CONTROLLER,
        abi: CONTROLLER_ABI,
        functionName: "register",
        args: [
            label,
            account.address,
            duration,
            secret,
            SEPOLIA_PUBLIC_RESOLVER,
            [],
            false,
            0,
        ],
        // Send 10% above the read price. ENS rentPrice is queried fresh at
        // register-time, so a price-oracle wiggle between commit and register
        // would otherwise revert with InsufficientValue. The controller
        // refunds any surplus to the sender.
        value: (totalPrice * 110n) / 100n,
        chain: sepolia,
    });
    console.log(`  register tx: ${registerTx}`);

    const registerReceipt = await publicClient.waitForTransactionReceipt({
        hash: registerTx,
    });
    if (registerReceipt.status !== "success") {
        throw new Error(`register reverted (tx ${registerTx})`);
    }
    console.log(`OK: ${fullName} registered to ${account.address}`);
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
