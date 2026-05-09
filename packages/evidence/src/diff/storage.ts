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

// Recursively expand a Solidity storage type definition into a canonical,
// id-stripped tree. Used to compare type definitions across two layouts where
// the type ids themselves may differ (a fresh compile of the same source can
// produce a different `t_struct(Foo)123_storage` numeric id).
//
// Sourcify's storageLayout.types is shaped like:
//   {
//     "t_struct(Position)123_storage": {
//       "label": "struct Position",
//       "encoding": "inplace",
//       "members": [{ "label": "amount", "type": "t_uint128", "slot": "0", "offset": 0 }],
//       "numberOfBytes": "16"
//     },
//     "t_uint128": { "label": "uint128", "encoding": "inplace", "numberOfBytes": "16" },
//     ...
//   }
//
// We follow `members[].type`, `value`, `key`, `base` recursively into the
// `types` map and emit the resolved structure. Cycles are guarded with a
// `seen` set keyed on the type id within each side.
type ExpandedType =
  | { readonly kind: 'leaf'; readonly value: Readonly<Record<string, unknown>> }
  | { readonly kind: 'cycle'; readonly typeId: string }
  | { readonly kind: 'unknown'; readonly typeId: string };

function expandType(
  types: Readonly<Record<string, unknown>>,
  typeId: string,
  seen: ReadonlySet<string>,
): ExpandedType | Readonly<Record<string, unknown>> {
  if (seen.has(typeId)) return { kind: 'cycle', typeId };
  const def = types[typeId];
  if (def === undefined || def === null || typeof def !== 'object' || Array.isArray(def)) {
    return { kind: 'unknown', typeId };
  }
  const nextSeen = new Set<string>([...seen, typeId]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(def as Record<string, unknown>)) {
    if (k === 'members' && Array.isArray(v)) {
      out[k] = v.map((m) => {
        if (m === null || typeof m !== 'object' || Array.isArray(m)) return m;
        const member = m as Record<string, unknown>;
        const memberType = member['type'];
        return {
          label: member['label'],
          slot: member['slot'],
          offset: member['offset'],
          // Recursively expand the member's referenced type definition.
          type: typeof memberType === 'string' ? expandType(types, memberType, nextSeen) : memberType,
        };
      });
    } else if ((k === 'value' || k === 'key' || k === 'base') && typeof v === 'string') {
      out[k] = expandType(types, v, nextSeen);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return (
      '{' +
      keys.map((k) => JSON.stringify(k) + ':' + canonicalJson(obj[k])).join(',') +
      '}'
    );
  }
  return JSON.stringify(value);
}

// Returns true if the type referenced by `prevTypeId` (in `prevTypes`) and
// the type referenced by `currTypeId` (in `currTypes`) resolve to the same
// canonical structural definition. When either types map is missing, falls
// back to the literal type-id-string comparison so the function is safe to
// call against older Sourcify responses that omit `types`.
function typesDeepEqual(
  prevTypes: Readonly<Record<string, unknown>> | undefined,
  prevTypeId: string,
  currTypes: Readonly<Record<string, unknown>> | undefined,
  currTypeId: string,
): boolean {
  if (!prevTypes || !currTypes) return prevTypeId === currTypeId;
  const a = expandType(prevTypes, prevTypeId, new Set());
  const b = expandType(currTypes, currTypeId, new Set());
  return canonicalJson(a) === canonicalJson(b);
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
  const prevTypes = previous.types;
  const currTypes = current.types;
  const minLen = Math.min(prev.length, curr.length);

  for (let i = 0; i < minLen; i++) {
    const p = prev[i];
    const c = curr[i];
    if (!p || !c) continue;

    if (p.label === c.label) {
      // Top-level type-id mismatch is a clear changed-type.
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
      // Top-level ids match. But Solidity can keep the SAME id string while
      // the underlying struct/array/mapping member layout changes (e.g.
      // `struct { uint128 } -> struct { uint256 }` may keep the same parent
      // id depending on compiler version). Walk the types map recursively
      // to catch this. Falls back to id-string equality when types map is
      // missing on either side.
      if (!typesDeepEqual(prevTypes, p.type, currTypes, c.type)) {
        return {
          kind: 'incompatible_changed_type',
          changes: [
            {
              position: i,
              previous: p,
              current: c,
              note: `slot ${p.slot} variable "${p.label}" type "${p.type}" resolves to a different nested layout (struct/array/mapping member changed)`,
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
export { entriesEqual, typesDeepEqual };
