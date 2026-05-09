// US-078: V1-anchored interpretation of unverified V2 bytecode. The verdict
// engine normally fires SIREN when the current implementation is unverified
// on Sourcify ("no source, no upgrade"). This primitive provides a
// higher-confidence REVIEW path for the specific case where the unverified
// bytecode is byte-equivalent (or near-byte-equivalent) to a known-good
// verified V1: the upgrade is "V1-derived" and we can interpret behaviour
// from the reference rather than refusing all engagement.
//
// Inputs:
//   - V1's deployed runtime bytecode (from Sourcify)
//   - current implementation's deployed runtime bytecode (from chain)
//   - optionally, ABI selector lists for both sides
//
// Outputs:
//   - confidence (0..1) — fraction of V1's bytecode chunks present in current
//   - storage-layout markers (EIP-1967, OZ Initializable namespace, etc.)
//   - matched / unmatched ABI selectors
//   - risky selectors found among the unmatched (gate for the REVIEW path)
//   - hypothesis label and human-readable rationale
//
// "Never SAFE without a metadata trail": even with a 1.0 match, this
// primitive only feeds the REVIEW verdict. SAFE requires Sourcify-verified
// metadata on the current implementation.

import { isRiskySelectorName } from './abi.js';

export type BytecodeHypothesis = 'v1_derived' | 'partial_match' | 'unrelated';

export interface StorageLayoutMarkers {
  readonly eip1967ImplementationSlot: boolean;
  readonly eip1967AdminSlot: boolean;
  readonly eip1967BeaconSlot: boolean;
  readonly initializableNamespace: boolean;
  readonly ozOwnableMarker: boolean;
}

export interface SelectorWithName {
  readonly selector: `0x${string}`;
  readonly name: string;
}

export interface BytecodeMatchResult {
  readonly confidence: number;
  readonly hypothesis: BytecodeHypothesis;
  readonly matchedSelectors: ReadonlyArray<`0x${string}`>;
  readonly unmatchedSelectors: ReadonlyArray<`0x${string}`>;
  readonly riskySelectorsInUnmatched: ReadonlyArray<string>;
  readonly storageLayoutMarkers: StorageLayoutMarkers;
  readonly rationale: string;
}

export interface MatchAgainstV1Options {
  readonly v1AbiSelectors?: ReadonlyArray<SelectorWithName>;
  readonly currentAbiSelectors?: ReadonlyArray<SelectorWithName>;
  readonly stripMetadata?: boolean;
  readonly chunkSize?: number;
  readonly stride?: number;
}

// EIP-1967 standardised slots:
//   keccak256("eip1967.proxy.implementation") - 1
const EIP1967_IMPL_SLOT_HEX = '360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
//   keccak256("eip1967.proxy.admin") - 1
const EIP1967_ADMIN_SLOT_HEX = 'b53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
//   keccak256("eip1967.proxy.beacon") - 1
const EIP1967_BEACON_SLOT_HEX = 'a3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';
// OpenZeppelin v5 ERC-7201 namespaces:
//   keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.Initializable")) - 1)) & ~bytes32(uint256(0xff))
const INITIALIZABLE_NAMESPACE_HEX = 'f0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a00';
//   keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.Ownable")) - 1)) & ~bytes32(uint256(0xff))
const OZ_OWNABLE_HEX = '9016d09d72d40fdae2fd8ceac6b6234c7706214fd39c1cd1e609a0528c199300';

function normalize(bytecode: string): string {
  let s = bytecode.toLowerCase();
  if (s.startsWith('0x')) s = s.slice(2);
  return s;
}

// Solidity CBOR metadata footer encoding:
//   ... <cbor-blob> <2-byte big-endian length>
// The trailing 2 bytes encode the length of the cbor section. For solc
// 0.8.x the cbor blob is typically 51..83 bytes (covering ipfs hash +
// solc version). Stripping the footer is a best-effort heuristic — it
// returns the input unchanged when the trailing bytes look implausible.
export function stripMetadataFooter(bytecode: string): string {
  const normalized = normalize(bytecode);
  if (normalized.length < 8) return normalized;
  const lenHex = normalized.slice(-4);
  const len = Number.parseInt(lenHex, 16);
  if (!Number.isFinite(len) || len < 32 || len > 256) return normalized;
  const totalFooterChars = (len + 2) * 2;
  if (totalFooterChars >= normalized.length) return normalized;
  return normalized.slice(0, normalized.length - totalFooterChars);
}

export function detectStorageLayoutMarkers(bytecode: string): StorageLayoutMarkers {
  const b = normalize(bytecode);
  return {
    eip1967ImplementationSlot: b.includes(EIP1967_IMPL_SLOT_HEX),
    eip1967AdminSlot: b.includes(EIP1967_ADMIN_SLOT_HEX),
    eip1967BeaconSlot: b.includes(EIP1967_BEACON_SLOT_HEX),
    initializableNamespace: b.includes(INITIALIZABLE_NAMESPACE_HEX),
    ozOwnableMarker: b.includes(OZ_OWNABLE_HEX),
  };
}

// n-gram coverage: how much of V1's bytecode appears verbatim in current.
// 64 hex chars = 32 bytes per chunk; 32 hex chars stride = 50% overlap.
// Stride < chunkSize means each byte is sampled multiple times, so a
// short-range mutation only knocks out a couple of chunks rather than
// one big stretch.
export function bytecodeNgramConfidence(
  v1: string,
  current: string,
  chunkSize = 64,
  stride = 32,
): number {
  const v = normalize(v1);
  const c = normalize(current);
  if (v.length === 0) return 0;
  if (v.length < chunkSize) {
    return c.includes(v) ? 1 : 0;
  }
  let total = 0;
  let matched = 0;
  for (let i = 0; i + chunkSize <= v.length; i += stride) {
    total += 1;
    if (c.includes(v.slice(i, i + chunkSize))) matched += 1;
  }
  if (total === 0) return 0;
  return matched / total;
}

function describeMarkers(m: StorageLayoutMarkers): string {
  const parts: string[] = [];
  if (m.eip1967ImplementationSlot) parts.push('EIP-1967-impl');
  if (m.eip1967AdminSlot) parts.push('EIP-1967-admin');
  if (m.eip1967BeaconSlot) parts.push('EIP-1967-beacon');
  if (m.initializableNamespace) parts.push('OZ-Initializable');
  if (m.ozOwnableMarker) parts.push('OZ-Ownable');
  return parts.length === 0 ? 'none' : parts.join(', ');
}

export function matchAgainstV1(
  v1Bytecode: string,
  currentBytecode: string,
  options: MatchAgainstV1Options = {},
): BytecodeMatchResult {
  const stripMeta = options.stripMetadata ?? true;
  const v1Body = stripMeta ? stripMetadataFooter(v1Bytecode) : normalize(v1Bytecode);
  const curBody = stripMeta ? stripMetadataFooter(currentBytecode) : normalize(currentBytecode);

  const confidence = bytecodeNgramConfidence(
    v1Body,
    curBody,
    options.chunkSize,
    options.stride,
  );
  const storageLayoutMarkers = detectStorageLayoutMarkers(curBody);

  const v1Selectors = options.v1AbiSelectors ?? [];
  const currentSelectors = options.currentAbiSelectors ?? [];
  const v1Set = new Set(v1Selectors.map((s) => s.selector.toLowerCase()));

  const matched: `0x${string}`[] = [];
  const unmatched: `0x${string}`[] = [];
  const riskyInUnmatched: string[] = [];
  for (const s of currentSelectors) {
    const lower = s.selector.toLowerCase();
    if (v1Set.has(lower)) {
      matched.push(s.selector);
    } else {
      unmatched.push(s.selector);
      if (isRiskySelectorName(s.name)) riskyInUnmatched.push(s.name);
    }
  }

  let hypothesis: BytecodeHypothesis;
  if (confidence >= 0.9) hypothesis = 'v1_derived';
  else if (confidence >= 0.4) hypothesis = 'partial_match';
  else hypothesis = 'unrelated';

  const rationale =
    `bytecode n-gram coverage ${(confidence * 100).toFixed(1)}%; ` +
    `${matched.length} matched + ${unmatched.length} unmatched ABI selectors` +
    (riskyInUnmatched.length > 0
      ? ` (risky: ${riskyInUnmatched.join(', ')})`
      : '') +
    `; storage markers: ${describeMarkers(storageLayoutMarkers)}`;

  return {
    confidence,
    hypothesis,
    matchedSelectors: matched,
    unmatchedSelectors: unmatched,
    riskySelectorsInUnmatched: riskyInUnmatched,
    storageLayoutMarkers,
    rationale,
  };
}

// Engine-side guard: returns true when the V1-anchored hypothesis is
// strong enough to downgrade an unverified-current SIREN to REVIEW.
//
// The bar is intentionally high because the result is a verdict change,
// not a UI hint:
//   - confidence >= 0.9 (90% of V1's bytecode chunks present in current)
//   - no risky selectors added (caller can pass abiDiff.addedAny if they
//     have it; this function also checks the match's own
//     riskySelectorsInUnmatched list as a backstop)
//
// Per docs/02 the result of this gate is REVIEW, never SAFE — the lack of
// a metadata trail still prevents full trust.
export function qualifiesForV1DerivedReview(
  match: BytecodeMatchResult,
  hasRiskyAddedFromAbiDiff = false,
): boolean {
  if (match.confidence < 0.9) return false;
  if (hasRiskyAddedFromAbiDiff) return false;
  if (match.riskySelectorsInUnmatched.length > 0) return false;
  return true;
}
