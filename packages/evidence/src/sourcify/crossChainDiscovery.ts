import type { Address, SubjectSourcifyEntry } from '@upgrade-siren/shared';

import {
  fetchSourcifyAllChains,
  type FetchSourcifyAllChainsOptions,
  type SourcifyAllChainsEntry,
} from './allChains.js';

// US-120 (P1) cross-chain auto-discovery for opt-in subjects. EPIC Section
// 8.1: "For each Sourcify project address, also call
// /v2/contract/all-chains/{address}. Discovered chains surface as chips in
// the drawer; they boost the breadth signal honestly."
//
// Wraps fetchSourcifyAllChains (US-112) with two orchestrations:
//   1) Per-input parallel discovery via Promise.allSettled — one address
//      rate-limited does not abort the whole subject discovery.
//   2) De-duplication of chains already declared in the manifest, so the UI
//      only highlights the *additional* chains the subject did not opt in
//      to listing.

export interface CrossChainDiscoveryEntry {
  // Address that triggered the discovery (one of the manifest's Sourcify
  // entries).
  readonly sourceAddress: Address;
  // Chains the manifest already declared for this address. Excluded from
  // `discovered`; surfaced separately for drawer rendering.
  readonly declaredChainIds: ReadonlyArray<number>;
  readonly discovered: ReadonlyArray<SourcifyAllChainsEntry>;
}

export type CrossChainDiscoveryFailureReason =
  | 'rate_limited'
  | 'server_error'
  | 'malformed_response'
  | 'network_error';

export interface CrossChainDiscoveryFailure {
  readonly sourceAddress: Address;
  readonly reason: CrossChainDiscoveryFailureReason;
  readonly message: string;
  readonly httpStatus?: number;
}

export interface CrossChainDiscoveryResult {
  readonly entries: ReadonlyArray<CrossChainDiscoveryEntry>;
  // Non-fatal per-address failures. The orchestrator surfaces these in the
  // drawer rather than propagating them to the score engine.
  readonly failures: ReadonlyArray<CrossChainDiscoveryFailure>;
}

export interface DiscoverCrossChainOptions extends FetchSourcifyAllChainsOptions {
  // Override the parallelism cap. The default (8) keeps Sourcify rate
  // budget under control when subjects declare many manifest entries.
  readonly concurrency?: number;
}

const DEFAULT_CONCURRENCY = 8;

function eqAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

// Returns the additional chains Sourcify reports for `inputs`, grouped by
// source address. The orchestrator passes the subject's manifest sourcify
// entries; we issue one all-chains lookup per *unique address* and exclude
// chains the manifest already declared from the result so the UI only
// surfaces the additional discovery.
//
// Failure isolation: per-address failures land in the `failures` array; the
// caller never throws on this PR's surface.
export async function discoverCrossChainPresence(
  inputs: ReadonlyArray<SubjectSourcifyEntry>,
  options: DiscoverCrossChainOptions = {},
): Promise<CrossChainDiscoveryResult> {
  // Group manifest entries by address — multiple chains under the same
  // address share one all-chains lookup.
  const declaredByAddress = new Map<string, Set<number>>();
  const orderedAddresses: Address[] = [];
  for (const e of inputs) {
    const key = e.address.toLowerCase();
    let set = declaredByAddress.get(key);
    if (set === undefined) {
      set = new Set<number>();
      declaredByAddress.set(key, set);
      orderedAddresses.push(e.address);
    }
    set.add(e.chainId);
  }

  if (orderedAddresses.length === 0) {
    return { entries: [], failures: [] };
  }

  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
  const results: Array<CrossChainDiscoveryEntry | null> = new Array(orderedAddresses.length).fill(null);
  const failures: CrossChainDiscoveryFailure[] = [];

  let cursor = 0;
  async function worker(): Promise<void> {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= orderedAddresses.length) return;
      const address = orderedAddresses[idx];
      if (address === undefined) return;
      const declared = declaredByAddress.get(address.toLowerCase()) ?? new Set<number>();
      const res = await fetchSourcifyAllChains(address, options);
      if (res.kind === 'error') {
        const failure: CrossChainDiscoveryFailure = {
          sourceAddress: address,
          reason: res.error.reason,
          message: res.error.message,
          ...(res.error.httpStatus !== undefined ? { httpStatus: res.error.httpStatus } : {}),
        };
        failures.push(failure);
        results[idx] = {
          sourceAddress: address,
          declaredChainIds: [...declared].sort((a, b) => a - b),
          discovered: [],
        };
        continue;
      }
      const filtered = res.value.filter(
        (entry) => !declared.has(entry.chainId) || !eqAddress(entry.address, address),
      );
      results[idx] = {
        sourceAddress: address,
        declaredChainIds: [...declared].sort((a, b) => a - b),
        discovered: filtered,
      };
    }
  }

  const pool = Math.min(concurrency, orderedAddresses.length);
  await Promise.all(Array.from({ length: pool }, () => worker()));

  const entries = results.filter((r): r is CrossChainDiscoveryEntry => r !== null);
  return { entries, failures };
}
