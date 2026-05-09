import type {
  AbiRiskyDiff,
  SelectorMatch,
} from "@upgrade-siren/evidence";

export type AbiDiffRendererProps = {
  diff: AbiRiskyDiff;
};

function SelectorRow({
  match,
  kind,
}: {
  match: SelectorMatch;
  kind: "added" | "removed";
}): React.JSX.Element {
  return (
    <li
      data-kind={kind}
      data-selector={match.selector}
      className="flex flex-wrap items-center gap-2 border-b border-[color:var(--color-border)] py-1 text-sm last:border-b-0"
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: "var(--color-verdict-siren)" }}
      />
      <span
        data-severity="risky"
        className="text-xs font-bold uppercase text-[color:var(--color-verdict-siren)]"
      >
        risky
      </span>
      <code className="font-mono">{match.name}</code>
      <span className="font-mono text-xs text-[color:var(--color-t2)]">
        {match.selector}
      </span>
      <span className="text-xs text-[color:var(--color-t2)]">
        ({match.inputs.join(", ") || "no args"}) {match.stateMutability}
      </span>
    </li>
  );
}

export function AbiDiffRenderer({
  diff,
}: AbiDiffRendererProps): React.JSX.Element {
  if (!diff.addedAny && !diff.removedAny) {
    return (
      <p
        data-testid="abi-diff-empty"
        className="text-sm text-[color:var(--color-t2)]"
      >
        no ABI changes detected
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="abi-diff-renderer">
      {diff.addedAny ? (
        <section aria-label="ABI selectors added">
          <h3 className="mb-1 text-sm font-bold">Added (risky)</h3>
          <ul className="m-0 list-none p-0">
            {diff.added.map((match) => (
              <SelectorRow key={match.selector} match={match} kind="added" />
            ))}
          </ul>
        </section>
      ) : null}
      {diff.removedAny ? (
        <section aria-label="ABI selectors removed">
          <h3 className="mb-1 text-sm font-bold">Removed (risky)</h3>
          <ul className="m-0 list-none p-0">
            {diff.removed.map((match) => (
              <SelectorRow key={match.selector} match={match} kind="removed" />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
