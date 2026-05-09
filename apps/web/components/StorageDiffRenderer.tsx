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
    color: "var(--color-safe)",
    label: "compatible (appended only)",
    tone: "safe",
  },
  incompatible_changed_type: {
    color: "var(--color-siren)",
    label: "incompatible — type changed",
    tone: "siren",
  },
  incompatible_reordered: {
    color: "var(--color-siren)",
    label: "incompatible — reordered",
    tone: "siren",
  },
  incompatible_inserted_before_existing: {
    color: "var(--color-siren)",
    label: "incompatible — inserted before existing",
    tone: "siren",
  },
  unknown_missing_layout: {
    color: "var(--color-review)",
    label: "storage layout not published",
    tone: "review",
  },
};

function ChangeRow({
  index,
  change,
}: {
  index: number;
  change: StorageDiffChange;
}): React.JSX.Element {
  return (
    <tr data-position={change.position}>
      <td className="px-2 py-1 font-mono text-xs">{index}</td>
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
        <p className="text-xs text-[color:var(--color-text-muted)]">
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
            <tr className="bg-[color:var(--color-surface-2)]">
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
              <ChangeRow key={`${change.position}-${i}`} index={i} change={change} />
            ))}
          </tbody>
        </table>
      ) : null}
      {diff.kind === "compatible_appended_only" && diff.appended.length > 0 ? (
        <p className="text-xs text-[color:var(--color-text-muted)]">
          {diff.appended.length} new slot
          {diff.appended.length === 1 ? "" : "s"} appended after the original
          layout (compatible).
        </p>
      ) : null}
    </section>
  );
}
