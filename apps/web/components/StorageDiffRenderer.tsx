import type {
  StorageDiffChange,
  StorageDiffKind,
  StorageDiffResult,
} from "@upgrade-siren/evidence";

export type StorageDiffRendererProps = {
  diff: StorageDiffResult;
};

const KIND_TONE: Record<
  StorageDiffKind,
  { color: string; label: string; tone: "safe" | "siren" | "review" }
> = {
  compatible_appended_only: {
    color: "var(--color-verdict-safe)",
    label: "compatible (appended only)",
    tone: "safe",
  },
  incompatible_changed_type: {
    color: "var(--color-verdict-siren)",
    label: "incompatible — type changed",
    tone: "siren",
  },
  incompatible_reordered: {
    color: "var(--color-verdict-siren)",
    label: "incompatible — reordered",
    tone: "siren",
  },
  incompatible_inserted_before_existing: {
    color: "var(--color-verdict-siren)",
    label: "incompatible — inserted before existing",
    tone: "siren",
  },
  unknown_missing_layout: {
    color: "var(--color-verdict-review)",
    label: "storage layout not published",
    tone: "review",
  },
};

function ChangeRow({
  change,
}: {
  change: StorageDiffChange;
}): React.JSX.Element {
  return (
    <tr data-position={change.position}>
      {/* Render the *storage position* the diff engine computed (which may
          be later than the row's index when earlier slots are unchanged or
          when the change is at curr.length for a removal), not the array
          row number — judges inspecting the slot-by-slot alarm need the
          actual mismatched slot index. */}
      <td className="px-2 py-1 font-mono text-xs">{change.position}</td>
      <td className="px-2 py-1 font-mono text-xs">
        {change.previous
          ? `${change.previous.type} ${change.previous.label}`
          : "—"}
      </td>
      <td className="px-2 py-1 font-mono text-xs">
        {change.current
          ? `${change.current.type} ${change.current.label}`
          : "—"}
      </td>
      <td className="px-2 py-1 text-xs">{change.note}</td>
    </tr>
  );
}

export function StorageDiffRenderer({
  diff,
}: StorageDiffRendererProps): React.JSX.Element {
  const tone = KIND_TONE[diff.kind];

  if (diff.kind === "unknown_missing_layout") {
    return (
      <section aria-label="Storage layout result">
        <p
          data-storage-kind={diff.kind}
          data-tone={tone.tone}
          style={{ color: tone.color }}
          className="text-sm font-bold"
        >
          {tone.label}
        </p>
        <p className="text-xs text-[color:var(--color-t2)]">
          The contract did not publish a storage layout, so compatibility
          cannot be asserted. This is rendered as a low-confidence signal,
          not as compatible.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Storage layout result" className="flex flex-col gap-2">
      <p
        data-storage-kind={diff.kind}
        data-tone={tone.tone}
        style={{ color: tone.color }}
        className="text-sm font-bold"
      >
        {tone.label}
      </p>
      {diff.changes.length > 0 ? (
        <table
          aria-label="Storage layout changes"
          className="w-full border-collapse border border-[color:var(--color-border)] text-left"
        >
          <thead>
            <tr className="bg-[color:var(--color-raised)]">
              <th className="border-b border-[color:var(--color-border)] px-2 py-1 text-xs">
                #
              </th>
              <th className="border-b border-[color:var(--color-border)] px-2 py-1 text-xs">
                Previous
              </th>
              <th className="border-b border-[color:var(--color-border)] px-2 py-1 text-xs">
                Current
              </th>
              <th className="border-b border-[color:var(--color-border)] px-2 py-1 text-xs">
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {diff.changes.map((change, i) => (
              <ChangeRow key={`${change.position}-${i}`} change={change} />
            ))}
          </tbody>
        </table>
      ) : null}
      {diff.kind === "compatible_appended_only" && diff.appended.length > 0 ? (
        <p className="text-xs text-[color:var(--color-t2)]">
          {diff.appended.length} new slot
          {diff.appended.length === 1 ? "" : "s"} appended after the original
          layout (compatible).
        </p>
      ) : null}
    </section>
  );
}
