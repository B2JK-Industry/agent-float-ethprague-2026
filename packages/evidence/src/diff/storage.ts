// Storage-layout compatibility diff. Input shape matches what Sourcify's
// `?fields=all` returns under `storageLayout`, and what US-025 exposes as
// SourcifyStorageLayout. Local interface is declared here to keep US-027
// independent of US-025's PR; the shapes are structurally compatible.

export interface StorageLayoutEntry {
  readonly slot: string;
  readonly offset: number;
  readonly type: string;
  readonly label: string;
  readonly contract?: string;
}

export interface StorageLayout {
  readonly storage: ReadonlyArray<StorageLayoutEntry>;
  readonly types?: Readonly<Record<string, unknown>>;
}

export type StorageDiffKind =
  | 'compatible_appended_only'
  | 'incompatible_changed_type'
  | 'incompatible_reordered'
  | 'incompatible_inserted_before_existing'
  | 'unknown_missing_layout';

export interface StorageDiffChange {
  readonly position: number;
  readonly previous?: StorageLayoutEntry;
  readonly current?: StorageLayoutEntry;
  readonly note: string;
}

export interface StorageDiffResult {
  readonly kind: StorageDiffKind;
  readonly changes: ReadonlyArray<StorageDiffChange>;
  readonly appended: ReadonlyArray<StorageLayoutEntry>;
}

function entriesEqual(a: StorageLayoutEntry, b: StorageLayoutEntry): boolean {
  return a.slot === b.slot && a.offset === b.offset && a.type === b.type && a.label === b.label;
}

export function diffStorageLayout(
  previous: StorageLayout | null | undefined,
  current: StorageLayout | null | undefined,
): StorageDiffResult {
  if (!previous || !current) {
    return {
      kind: 'unknown_missing_layout',
      changes: [],
      appended: [],
    };
  }

  const prev = previous.storage;
  const curr = current.storage;
  const minLen = Math.min(prev.length, curr.length);

  for (let i = 0; i < minLen; i++) {
    const p = prev[i];
    const c = curr[i];
    if (!p || !c) continue;

    if (p.label === c.label) {
      if (p.type !== c.type) {
        return {
          kind: 'incompatible_changed_type',
          changes: [
            {
              position: i,
              previous: p,
              current: c,
              note: `slot ${p.slot} variable "${p.label}" changed type ${p.type} -> ${c.type}`,
            },
          ],
          appended: [],
        };
      }
      if (p.slot !== c.slot || p.offset !== c.offset) {
        return {
          kind: 'incompatible_reordered',
          changes: [
            {
              position: i,
              previous: p,
              current: c,
              note: `variable "${p.label}" moved (${p.slot}:${p.offset} -> ${c.slot}:${c.offset})`,
            },
          ],
          appended: [],
        };
      }
      continue;
    }

    // Labels differ at position i.
    const prevLabels = new Set(prev.map((e) => e.label));
    const prevLabelLaterInCurr = curr.findIndex((cc, j) => j > i && cc.label === p.label);
    const currLabelExistsInPrev = prevLabels.has(c.label);

    if (prevLabelLaterInCurr !== -1 && !currLabelExistsInPrev) {
      // The previous variable still exists in current at a later position, AND the
      // current variable at position i is brand new -> a true insertion before existing.
      return {
        kind: 'incompatible_inserted_before_existing',
        changes: [
          {
            position: i,
            previous: p,
            current: c,
            note: `new variable "${c.label}" inserted at position ${i} before existing "${p.label}" (now at position ${prevLabelLaterInCurr})`,
          },
        ],
        appended: [],
      };
    }

    // Otherwise the variables at this position have been rearranged or
    // replaced; classify as reorder (verdict-equivalent in either case).
    return {
      kind: 'incompatible_reordered',
      changes: [
        {
          position: i,
          previous: p,
          current: c,
          note: `variable at position ${i} replaced: was "${p.label}" (${p.type}), now "${c.label}" (${c.type})`,
        },
      ],
      appended: [],
    };
  }

  // No mismatches in the common prefix. Detect appends.
  const appended = curr.slice(minLen);

  // If prev is longer than curr, that's a removal — incompatible.
  if (prev.length > curr.length) {
    const removed = prev[curr.length];
    if (!removed) {
      return { kind: 'compatible_appended_only', changes: [], appended: [] };
    }
    return {
      kind: 'incompatible_reordered',
      changes: [
        {
          position: curr.length,
          previous: removed,
          note: `variable "${removed.label}" removed in current layout`,
        },
      ],
      appended: [],
    };
  }

  // Sanity-check appended entries don't sit in slots earlier than the last
  // previous slot, in case an upgrade rearranges the slot numbering.
  if (prev.length > 0 && appended.length > 0) {
    const lastPrev = prev[prev.length - 1];
    const lastPrevSlotNum = lastPrev ? Number.parseInt(lastPrev.slot, 10) : Number.NaN;
    if (Number.isFinite(lastPrevSlotNum)) {
      for (const a of appended) {
        const aSlotNum = Number.parseInt(a.slot, 10);
        if (Number.isFinite(aSlotNum) && aSlotNum < lastPrevSlotNum) {
          return {
            kind: 'incompatible_inserted_before_existing',
            changes: [
              {
                position: prev.length,
                current: a,
                note: `appended variable "${a.label}" sits in slot ${a.slot} which precedes last previous slot ${lastPrev?.slot ?? '?'}`,
              },
            ],
            appended: [],
          };
        }
      }
    }
  }

  return {
    kind: 'compatible_appended_only',
    changes: [],
    appended,
  };
}

// Re-export the entries-equal predicate for callers that need exact-match
// comparisons (e.g., the verdict engine cross-checking ENS vs Sourcify).
export { entriesEqual };
