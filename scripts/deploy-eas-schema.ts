/**
 * Register the Bench attestation schema on a target network.
 *
 * Usage:
 *   pnpm tsx scripts/deploy-eas-schema.ts --network sepolia
 *   pnpm tsx scripts/deploy-eas-schema.ts --network base
 *
 * Env required:
 *   OPERATOR_PRIVATE_KEY  — operator wallet private key (must hold ETH on the network)
 *   ALCHEMY_RPC_SEPOLIA   — for --network sepolia
 *   ALCHEMY_RPC_BASE      — for --network base (optional; falls back to public RPC)
 *   ENS_RPC_URL           — fallback for any network
 *
 * Output: schema UID printed to stdout. Paste it into
 *   packages/evidence/src/eas/schema.ts:BENCH_SCHEMA_UIDS[network]
 *
 * Idempotent: if the same schema string is already registered on this
 * network by anyone, the contract reverts with `AlreadyExists` —
 * compute the UID locally with `getSchemaUID()` to look it up.
 */

import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, mainnet, optimism, sepolia } from 'viem/chains';
import { keccak256, encodePacked } from 'viem';

import {
  BENCH_ATTESTATION_SCHEMA,
  BENCH_ATTESTATION_REVOCABLE,
  EAS_SCHEMA_REGISTRIES,
} from '../packages/evidence/src/eas/schema.js';

type SupportedNetwork = 'sepolia' | 'base' | 'optimism' | 'mainnet';

const NETWORK_CHAINS = {
  sepolia,
  base,
  optimism,
  mainnet,
} as const;

const NETWORK_RPC_ENV: Record<SupportedNetwork, string> = {
  sepolia: 'ALCHEMY_RPC_SEPOLIA',
  base: 'ALCHEMY_RPC_BASE',
  optimism: 'ALCHEMY_RPC_OPTIMISM',
  mainnet: 'ALCHEMY_RPC_MAINNET',
};

const SCHEMA_REGISTRY_ABI = parseAbi([
  'function register(string schema, address resolver, bool revocable) external returns (bytes32)',
  'function getSchema(bytes32 uid) external view returns ((bytes32 uid, address resolver, bool revocable, string schema))',
]);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

function parseArgs(): { network: SupportedNetwork } {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--network');
  if (idx === -1 || idx + 1 >= args.length) {
    throw new Error('usage: --network <sepolia|base|optimism|mainnet>');
  }
  const value = args[idx + 1];
  if (value !== 'sepolia' && value !== 'base' && value !== 'optimism' && value !== 'mainnet') {
    throw new Error(`unsupported network: ${value}`);
  }
  return { network: value as SupportedNetwork };
}

/** EAS computes schema UID as keccak256(schema || resolver || revocable). */
function computeSchemaUid(
  schema: string,
  resolver: `0x${string}`,
  revocable: boolean,
): `0x${string}` {
  return keccak256(
    encodePacked(['string', 'address', 'bool'], [schema, resolver, revocable]),
  );
}

async function main(): Promise<void> {
  const { network } = parseArgs();

  const privateKey = process.env.OPERATOR_PRIVATE_KEY;
  if (!privateKey) throw new Error('OPERATOR_PRIVATE_KEY env var not set');
  const account = privateKeyToAccount(
    privateKey.startsWith('0x') ? (privateKey as `0x${string}`) : (`0x${privateKey}` as `0x${string}`),
  );

  const rpcUrl = process.env[NETWORK_RPC_ENV[network]] ?? process.env.ENS_RPC_URL;
  if (!rpcUrl) throw new Error(`RPC URL missing — set ${NETWORK_RPC_ENV[network]} or ENS_RPC_URL`);

  const chain = NETWORK_CHAINS[network];
  const registryAddress = EAS_SCHEMA_REGISTRIES[network];

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ chain, account, transport: http(rpcUrl) });

  // Pre-compute the UID so we can detect "already registered" cleanly.
  const expectedUid = computeSchemaUid(
    BENCH_ATTESTATION_SCHEMA,
    ZERO_ADDRESS,
    BENCH_ATTESTATION_REVOCABLE,
  );

  console.log(`Network:          ${network}`);
  console.log(`Schema registry:  ${registryAddress}`);
  console.log(`Operator wallet:  ${account.address}`);
  console.log(`Expected UID:     ${expectedUid}`);
  console.log(`Schema:           ${BENCH_ATTESTATION_SCHEMA}`);
  console.log(`Resolver:         ${ZERO_ADDRESS}`);
  console.log(`Revocable:        ${BENCH_ATTESTATION_REVOCABLE}`);
  console.log();

  // Check if it already exists.
  try {
    const existing = await publicClient.readContract({
      address: registryAddress,
      abi: SCHEMA_REGISTRY_ABI,
      functionName: 'getSchema',
      args: [expectedUid],
    });
    if (existing.uid !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log('✓ Schema already registered on this network.');
      console.log();
      console.log('UID:', expectedUid);
      console.log();
      console.log('Update packages/evidence/src/eas/schema.ts:');
      console.log(`  ${network}: '${expectedUid}',`);
      return;
    }
  } catch {
    // getSchema reverts on unknown UID on some chains — fall through and register.
  }

  console.log('Submitting register tx…');
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Wallet balance:   ${balance} wei`);
  if (balance === 0n) {
    throw new Error('Operator wallet has 0 ETH on this network. Fund it before retrying.');
  }

  const txHash = await walletClient.writeContract({
    address: registryAddress,
    abi: SCHEMA_REGISTRY_ABI,
    functionName: 'register',
    args: [BENCH_ATTESTATION_SCHEMA, ZERO_ADDRESS, BENCH_ATTESTATION_REVOCABLE],
  });
  console.log(`tx hash:          ${txHash}`);
  console.log('Waiting for confirmation…');

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`Confirmed at block ${receipt.blockNumber}, gas used ${receipt.gasUsed}.`);
  console.log();
  console.log('✓ Schema registered.');
  console.log();
  console.log('UID:', expectedUid);
  console.log();
  console.log('Update packages/evidence/src/eas/schema.ts:');
  console.log(`  ${network}: '${expectedUid}',`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});