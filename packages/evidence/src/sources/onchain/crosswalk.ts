import type { Address } from '@upgrade-siren/shared';

// Pure utility for the Sourcify deployer crosswalk consumed by US-117
// (orchestrator) and US-118 (score engine). EPIC Section 8.3 P0 column.
//
// "contractsDeployedCount" = count of Sourcify entries (from the subject's
// `sources.sourcify[]` manifest) whose `deployment.deployer` matches the
// subject's `primaryAddress`. The orchestrator fetches per-contract
// deployment metadata; this helper does the comparison.
//
// Address comparison is case-insensitive (EIP-55 checksums vs lowercase RPC
// outputs). We do not rely on viem `getAddress` here: the shape that comes
// back from Sourcify and from RPC may use either casing, and we don't want
// the count to flip on cosmetic differences.

export interface DeployerLookup {
  // The subject address that may have deployed this contract.
  readonly contractAddress: Address;
  // The deployer address Sourcify reports (or null if Sourcify exposes no
  // deployment metadata for this entry — those entries are skipped, not
  // counted as a non-match).
  readonly deployer: Address | null;
}

function eqAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

// Returns the count of Sourcify entries deployed by `primaryAddress`. Entries
// with `deployer === null` are excluded from the denominator and the
// numerator (no-data, not no-match).
export function countContractsDeployedBy(
  primaryAddress: Address,
  lookups: ReadonlyArray<DeployerLookup>,
): number {
  let count = 0;
  for (const l of lookups) {
    if (l.deployer === null) continue;
    if (eqAddress(l.deployer, primaryAddress)) count += 1;
  }
  return count;
}

export interface DeployerCrosswalkResult {
  readonly count: number;
  readonly examined: number;
  // Lookups skipped because Sourcify exposed no deployment metadata for that
  // entry. Surfaces partial-knowledge to the drawer.
  readonly skipped: number;
}

// Variant that returns the full breakdown so the UI can render "deployed N
// of M (3 entries unknown)" without recomputing.
export function crosswalkDeployers(
  primaryAddress: Address,
  lookups: ReadonlyArray<DeployerLookup>,
): DeployerCrosswalkResult {
  let count = 0;
  let skipped = 0;
  for (const l of lookups) {
    if (l.deployer === null) {
      skipped += 1;
      continue;
    }
    if (eqAddress(l.deployer, primaryAddress)) count += 1;
  }
  return { count, examined: lookups.length, skipped };
}
