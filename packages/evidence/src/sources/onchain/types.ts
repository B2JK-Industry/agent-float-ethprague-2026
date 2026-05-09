import type { Address } from '@upgrade-siren/shared';

// US-115 P0 on-chain activity reader. Rescoped per review 2026-05-09:
// `eth_getLogs` cannot filter by `from` (logs filter on contract address +
// topics, not tx sender), and `eth_getTransactionCount` returns nonce
// (outbound count) not total inbound activity. Therefore tx-history signals
// require an indexer (Alchemy Transfers / Etherscan / Covalent) and live in
// US-115b.
//
// This P0 reader produces three values from raw RPC + Sourcify crosswalk
// only:
//   - `nonce`: outbound tx count for the address at latest block
//   - `firstTxBlock` / `firstTxTimestamp`: address age via binary search on
//     historical `getTransactionCount(blockTag)` — finds the smallest block
//     where nonce flips from 0 → ≥1
//   - `contractsDeployedCount`: Sourcify deployer crosswalk (not on this
//     reader; pure utility in `./crosswalk.ts` consumed by the orchestrator)

export interface OnchainActivity {
  readonly chainId: number;
  readonly address: Address;
  readonly nonce: number;
  // null when the address has never sent a transaction on this chain
  // (nonce at latest === 0).
  readonly firstTxBlock: bigint | null;
  // Unix seconds; null when firstTxBlock is null OR when the timestamp lookup
  // failed but the block index was found (we surface the partial result
  // rather than fail the whole call).
  readonly firstTxTimestamp: number | null;
  readonly latestBlock: bigint;

  // ----- US-115b indexer-backed enrichment (optional) -----
  // Populated when fetchOnchainTransferCounts runs against a configured
  // indexer (Alchemy alchemy_getAssetTransfers OR Etherscan txlist). When
  // absent, score engine onchainRecency falls back to nonce/cap-1000.
  readonly transferCountRecent90d?: number | null;
  readonly transferCountTotal?: number | null;
  // Provenance label so the drawer can render the source.
  readonly transferCountProvider?: 'alchemy' | 'etherscan' | null;
}

export type OnchainActivityFailureReason = 'unsupported_chain' | 'rpc_error';

export interface OnchainActivityOk {
  readonly kind: 'ok';
  readonly value: OnchainActivity;
}

export interface OnchainActivityError {
  readonly kind: 'error';
  readonly reason: OnchainActivityFailureReason;
  readonly message: string;
  readonly cause?: unknown;
}

export type OnchainActivityResult = OnchainActivityOk | OnchainActivityError;
