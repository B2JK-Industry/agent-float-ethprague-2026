// EAS attestation layer — public API.
//
// See task spec at `prompts/eas-attestation-task.md` (Daniel-supplied).
// Every Bench report ships in two formats:
//   1. Existing EIP-712 JSON (operator-signed).
//   2. EAS off-chain attestation envelope (same payload, EAS-standard
//      shape, free / no gas).
//
// Subject can opt in to on-chain publication using their own wallet
// via the `prepareOnchainAttestation()` calldata + a wagmi
// `useWriteContract` call on the client. We never publish on-chain
// from server code.

export * from './types.js';
export {
  BENCH_ATTESTATION_SCHEMA,
  BENCH_ATTESTATION_REVOCABLE,
  BENCH_SCHEMA_UIDS,
  EAS_CONTRACTS,
  EAS_SCHEMA_REGISTRIES,
  NETWORK_CHAIN_IDS,
  SUPPORTED_NETWORK_LIST,
  DEFAULT_PUBLISH_NETWORK,
  easExplorerUrl,
  isSchemaDeployed,
} from './schema.js';
export {
  buildOffchainAttestation,
  serializeOffchainAttestation,
  verifyOffchainAttestation,
  encodeBenchPayload,
  decodeBenchPayload,
  reportHash,
} from './offchain.js';
export {
  prepareOnchainAttestation,
  encodeAttestCalldata,
  fetchOnchainAttestation,
  EAS_ATTEST_ABI,
} from './onchain.js';