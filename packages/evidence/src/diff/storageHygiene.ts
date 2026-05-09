// US-119 Storage-Layout Hygiene aggregator. EPIC Section 8.1 algorithm.
//
// Per consecutive implementation pair (impl[i], impl[i+1]):
//   compare storage[] arrays:
//     same slot+offset, same type, same label   → SAFE
//     same slot+offset, same type, diff label   → SOFT (rename)
//     same slot+offset, DIFFERENT type          → COLLISION
//     slot used in i missing in i+1             → REMOVED
//     new variable in slot beyond i.max         → SAFE (append)
//
// Per-pair hygiene = avg over slot classifications of {1.0 SAFE, 0.5 SOFT,
// 0.0 COLLISION/REMOVED}. UNKNOWN slots (one side missing layout) are
// excluded from the average rather than penalizing — see edge case in
// EPIC Section 8.1.
//
// Per-proxy hygiene = avg over upgrade pairs.
// Per-subject hygiene = avg over proxies (proxy with no upgrades → 1.0).
//
// Pure: no I/O. Inputs are pre-fetched StorageLayouts (or nulls when the
// orchestrator could not reach Sourcify for that pair).

import type { StorageLayout, StorageLayoutEntry } from './storage.js';
import { typesDeepEqual } from './storage.js';

export type SlotHygieneClass = 'safe' | 'safe_append' | 'soft_rename' | 'collision' | 'removed' | 'unknown';

export interface SlotHygieneEntry {
  readonly position: number;
  readonly previous: StorageLayoutEntry | null;
  readonly current: StorageLayoutEntry | null;
  readonly classification: SlotHygieneClass;
  readonly note: string;
}

export type ProxyHygienePairKind = 'computed' | 'unknown_layout';

export interface ProxyHygienePair {
  readonly previousAddress: string;
  readonly currentAddress: string;
  readonly kind: ProxyHygienePairKind;
  readonly slots: ReadonlyArray<SlotHygieneEntry>;
  // Average over slots that contributed to the score (UNKNOWN slots
  // excluded). null when kind === 'unknown_layout' so the proxy aggregator
  // can treat it as "no signal" rather than "perfect" or "broken".
  readonly score: number | null;
}

export interface ProxyHygiene {
  readonly proxyAddress: string;
  readonly chainId: number;
  // Empty when the proxy has 0 or 1 implementations on file. The aggregator
  // treats this as "no upgrades observed" → score 1.0 per EPIC step 5.
  readonly pairs: ReadonlyArray<ProxyHygienePair>;
  // Average of pair.score values (UNKNOWN pairs and null scores excluded).
  // 1.0 when no upgrades. null when every pair surfaced unknown (no signal
  // at all).
  readonly score: number | null;
  // Surfaced kind label so the UI can render "diamond proxy" / "ERC-2535"
  // tiles distinctly. v1 hygiene engine does not branch on this; consumers
  // may.
  readonly proxyKind: string | null;
}

export interface SubjectHygiene {
  readonly proxies: ReadonlyArray<ProxyHygiene>;
  // Average of proxy.score values; null when every proxy returned null.
  readonly score: number | null;
}

// Pure classifier for one slot-position. UNKNOWN takes precedence: when
// either side has no layout, classification is 'unknown'. Otherwise the
// EPIC table applies in order.
//
// `previous` and `current` use shape from StorageLayoutEntry. Type
// equality is structural via typesDeepEqual when both type-maps are
// provided; falls back to raw-string equality otherwise (mirrors the
// US-027 pattern).
//
// audit-round-7 P1 #9 (safe_append misclass): previously, ANY position
// where prev was null-at-array-index and curr had an entry was tagged
// `safe_append`. EPIC §8.1 specifies that safe_append requires the new
// variable's slot to be BEYOND prev's max slot — appending after the
// last existing storage slot. Without that gate, an insert at an
// existing slot range was marked safe (1.0) when it should be marked
// `collision` (0.0). The classifier now takes `prevMaxSlot` and only
// honors safe_append when the new entry's slot is strictly greater.
function parseSlotNum(s: string | undefined | null): bigint | null {
  if (s === undefined || s === null) return null;
  try {
    return BigInt(s);
  } catch {
    return null;
  }
}
export function classifySlot(
  position: number,
  previous: StorageLayoutEntry | null,
  current: StorageLayoutEntry | null,
  prevTypes: Readonly<Record<string, unknown>> | undefined,
  currTypes: Readonly<Record<string, unknown>> | undefined,
  prevMaxSlot: bigint | null = null,
): SlotHygieneEntry {
  if (previous === null && current === null) {
    // Should not happen in practice — guard for safety.
    return { position, previous: null, current: null, classification: 'unknown', note: 'both sides null' };
  }
  if (previous === null && current !== null) {
    const currSlot = parseSlotNum(current.slot);
    // Append iff the new variable lives strictly beyond the prev's max
    // slot (or prev has no slots at all). Otherwise a "new" entry at an
    // existing slot range is a collision.
    const isAppend = prevMaxSlot === null || (currSlot !== null && currSlot > prevMaxSlot);
    if (isAppend) {
      return {
        position,
        previous: null,
        current,
        classification: 'safe_append',
        note: `appended new variable ${current.label} at slot ${current.slot}`,
      };
    }
    return {
      position,
      previous: null,
      current,
      classification: 'collision',
      note: `new variable ${current.label} at slot ${current.slot} overlaps prev's used slot range (max ${prevMaxSlot})`,
    };
  }
  if (previous !== null && current === null) {
    return {
      position,
      previous,
      current: null,
      classification: 'removed',
      note: `removed variable ${previous.label} at slot ${previous.slot}`,
    };
  }
  // Both present.
  const p = previous!;
  const c = current!;
  if (p.slot !== c.slot || p.offset !== c.offset) {
    // Same array index but different storage location — treat as a
    // type-shift collision; the upgrade has reordered without using a
    // gap.
    return {
      position,
      previous: p,
      current: c,
      classification: 'collision',
      note: `slot/offset moved (${p.slot}@${p.offset} -> ${c.slot}@${c.offset})`,
    };
  }
  const sameType = typesDeepEqual(prevTypes, p.type, currTypes, c.type);
  if (!sameType) {
    return {
      position,
      previous: p,
      current: c,
      classification: 'collision',
      note: `type changed (${p.type} -> ${c.type}) at slot ${p.slot}`,
    };
  }
  if (p.label !== c.label) {
    return {
      position,
      previous: p,
      current: c,
      classification: 'soft_rename',
      note: `renamed ${p.label} -> ${c.label} at slot ${p.slot}`,
    };
  }
  return {
    position,
    previous: p,
    current: c,
    classification: 'safe',
    note: `unchanged at slot ${p.slot}`,
  };
}

function classWeight(c: SlotHygieneClass): number | null {
  switch (c) {
    case 'safe':
    case 'safe_append':
      return 1.0;
    case 'soft_rename':
      return 0.5;
    case 'collision':
    case 'removed':
      return 0.0;
    case 'unknown':
      return null;
  }
}

// Classifies every slot-position in the union of two layouts, then averages
// the contributory weights. Returns ProxyHygienePair with kind:'computed'
// and score in [0, 1], or kind:'unknown_layout' + score=null when either
// layout is missing.
export function classifyImplementationPair(
  previousAddress: string,
  currentAddress: string,
  previous: StorageLayout | null,
  current: StorageLayout | null,
): ProxyHygienePair {
  if (previous === null || current === null) {
    return {
      previousAddress,
      currentAddress,
      kind: 'unknown_layout',
      slots: [],
      score: null,
    };
  }

  // audit-round-7 P1 #9 (storage:[] null): a layout that arrived with
  // `storage` literally null/undefined is NOT the same as a layout with
  // an empty storage array. The previous code defaulted both to `[]`,
  // which made every entry on the other side classify as `safe_append`
  // (1.0) — falsely reporting "all changes safe" when we actually had
  // no information about that side's storage. Treat null/undefined
  // storage on either side as `unknown_layout`.
  if (
    !Array.isArray((previous as { storage?: unknown }).storage) ||
    !Array.isArray((current as { storage?: unknown }).storage)
  ) {
    return {
      previousAddress,
      currentAddress,
      kind: 'unknown_layout',
      slots: [],
      score: null,
    };
  }

  const prevEntries = previous.storage;
  const currEntries = current.storage;

  // Compute prev's max slot for the safe_append gate. EPIC §8.1: a
  // variable is safely appended iff it lives at a slot strictly beyond
  // anything previously used.
  let prevMaxSlot: bigint | null = null;
  for (const e of prevEntries) {
    const s = parseSlotNum(e.slot);
    if (s === null) continue;
    if (prevMaxSlot === null || s > prevMaxSlot) prevMaxSlot = s;
  }

  // EPIC step 3 walks "consecutive pair (impl[i], impl[i+1])" by aligning
  // the two storage[] arrays. We align by array position (both Sourcify
  // and OZ Upgrades order entries by declaration order). Mismatched
  // positions surface as collision via the slot/offset check above.
  const length = Math.max(prevEntries.length, currEntries.length);

  const slots: SlotHygieneEntry[] = [];
  for (let i = 0; i < length; i++) {
    const p = i < prevEntries.length ? (prevEntries[i] ?? null) : null;
    const c = i < currEntries.length ? (currEntries[i] ?? null) : null;
    slots.push(classifySlot(i, p, c, previous.types, current.types, prevMaxSlot));
  }

  let sum = 0;
  let count = 0;
  for (const s of slots) {
    const w = classWeight(s.classification);
    if (w === null) continue;
    sum += w;
    count += 1;
  }

  return {
    previousAddress,
    currentAddress,
    kind: 'computed',
    slots,
    score: count === 0 ? null : sum / count,
  };
}

export interface ImplementationLayoutInput {
  // Address that owned this implementation slot at this point in chain
  // history. Used for labelling the pair in the breakdown.
  readonly address: string;
  // Pre-fetched layout. null when Sourcify did not return a storageLayout
  // for this address (unverified, missing, or transport-failure that the
  // orchestrator decided to surface as missing).
  readonly layout: StorageLayout | null;
}

// Computes hygiene for one proxy contract. `implementations` is the
// chronologically-ordered list (EPIC step 2; the orchestrator owns the
// ordering — RPC deployment block first, verifiedAt asc as fallback).
export function computeProxyHygiene(
  proxyAddress: string,
  chainId: number,
  implementations: ReadonlyArray<ImplementationLayoutInput>,
  proxyKind: string | null = null,
): ProxyHygiene {
  // 0 or 1 implementations on file → no upgrades observed → score 1.0
  // per EPIC step 5.
  if (implementations.length <= 1) {
    return { proxyAddress, chainId, pairs: [], score: 1.0, proxyKind };
  }

  const pairs: ProxyHygienePair[] = [];
  for (let i = 0; i + 1 < implementations.length; i++) {
    const p = implementations[i]!;
    const c = implementations[i + 1]!;
    pairs.push(classifyImplementationPair(p.address, c.address, p.layout, c.layout));
  }

  let sum = 0;
  let count = 0;
  for (const pair of pairs) {
    if (pair.score === null) continue;
    sum += pair.score;
    count += 1;
  }

  return {
    proxyAddress,
    chainId,
    pairs,
    score: count === 0 ? null : sum / count,
    proxyKind,
  };
}

// Per-subject hygiene = avg over proxies (proxy with no upgrades → 1.0).
// Proxies whose hygiene came back null (every pair unknown) are excluded
// from the average — they contribute no signal rather than punishing the
// subject for indexer / Sourcify gaps.
export function computeSubjectHygiene(proxies: ReadonlyArray<ProxyHygiene>): SubjectHygiene {
  let sum = 0;
  let count = 0;
  for (const p of proxies) {
    if (p.score === null) continue;
    sum += p.score;
    count += 1;
  }
  return {
    proxies,
    score: count === 0 ? null : sum / count,
  };
}
