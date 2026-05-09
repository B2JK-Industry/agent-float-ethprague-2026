// US-079 — UI hypothesis renderer for the V1-anchored bytecode-match path.
//
// Stream B is shipping `bytecodeMatch.ts` in `@upgrade-siren/evidence` as
// US-078, returning a confidence percentage + matched / unmatched selectors
// + storage-constants detection (EIP-1967 slot, Initializable namespace,
// OZ patterns) + metadata-trail flag. When that PR merges, swap the local
// `BytecodeMatchResult` declaration below for an import:
//   import type { BytecodeMatchResult } from "@upgrade-siren/evidence";
// Field names below match the spec discussed for US-078.
//
// Visual contract per US-079 spec:
//   * Confidence percentage badge — tone-mapped: ≥0.9 verdict-safe-coloured
//     accent on the verdict-review surface (the hypothesis surface is always
//     amber per "use brand tokens (verdict-review for hypothesis state)").
//   * Matched-vs-unmatched selector list.
//   * "metadata trail missing" amber badge when metadataTrailPresent === false.
//   * Summary copy "Implementation hypothesis: V1-derived" when the engine
//     produced an anchor.

export type BytecodeMatchSelectorRef = {
  readonly name: string;
  readonly selector: `0x${string}`;
};

export type BytecodeMatchHypothesis = "V1-derived" | "unknown";

export type BytecodeMatchStorageConstants = {
  readonly eip1967Slot: boolean;
  readonly initializableNamespace: boolean;
  readonly ozPatterns: boolean;
};

export type BytecodeMatchResult = {
  /**
   * Function-body match confidence in [0, 1]. 1.0 means the bytecode
   * body of the current implementation is byte-identical to the V1
   * anchor under storage-layout-constants normalisation; 0.0 means
   * the engine could not match any body region.
   */
  readonly confidence: number;
  readonly hypothesis: BytecodeMatchHypothesis | null;
  readonly matchedSelectors: ReadonlyArray<BytecodeMatchSelectorRef>;
  readonly unmatchedSelectors: ReadonlyArray<BytecodeMatchSelectorRef>;
  readonly storageConstants: BytecodeMatchStorageConstants;
  /**
   * `true` when Sourcify metadata for the current implementation was
   * available and consumed by the bytecode matcher. `false` is the
   * V1-anchored REVIEW path: the contract is bytecode-equivalent to a
   * known V1, but the operator did not publish a verifiable metadata
   * trail — verdict caps at REVIEW with this hypothesis copy.
   */
  readonly metadataTrailPresent: boolean;
};

export type BytecodeHypothesisProps = {
  readonly result: BytecodeMatchResult;
};

function formatPercent(value: number): string {
  const clamped = Math.max(0, Math.min(1, value));
  return `${(clamped * 100).toFixed(0)}%`;
}

function HypothesisCopy({
  hypothesis,
}: {
  hypothesis: BytecodeMatchHypothesis | null;
}): React.JSX.Element {
  if (hypothesis === "V1-derived") {
    return (
      <p data-hypothesis="V1-derived" className="text-sm text-t1">
        Implementation hypothesis:{" "}
        <span className="font-bold text-verdict-review">V1-derived</span>.
        Bytecode body matches a known V1 anchor under
        storage-layout-constants normalisation.
      </p>
    );
  }
  if (hypothesis === "unknown") {
    return (
      <p data-hypothesis="unknown" className="text-sm text-t2">
        Implementation hypothesis:{" "}
        <span className="font-bold">unknown</span>. Bytecode body did not
        match any known anchor.
      </p>
    );
  }
  return (
    <p data-hypothesis="absent" className="text-sm text-t2">
      No bytecode-match hypothesis produced for this implementation.
    </p>
  );
}

function MetadataTrailBadge({
  present,
}: {
  present: boolean;
}): React.JSX.Element {
  if (present) {
    return (
      <span
        data-metadata-trail="present"
        className="inline-flex items-center rounded-full border border-verdict-safe px-2 py-0.5 font-mono text-xs text-verdict-safe"
      >
        metadata trail present
      </span>
    );
  }
  return (
    <span
      data-metadata-trail="missing"
      className="inline-flex items-center rounded-full border border-verdict-review bg-verdict-review-surf px-2 py-0.5 font-mono text-xs text-verdict-review"
    >
      metadata trail missing
    </span>
  );
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: number;
}): React.JSX.Element {
  const high = confidence >= 0.9;
  return (
    <span
      data-confidence={confidence.toFixed(2)}
      data-tone={high ? "high" : "low"}
      className={
        high
          ? "inline-flex items-center rounded-full border border-verdict-review px-2 py-0.5 font-mono text-xs font-bold text-verdict-review"
          : "inline-flex items-center rounded-full border border-border-strong px-2 py-0.5 font-mono text-xs text-t2"
      }
    >
      {formatPercent(confidence)} match
    </span>
  );
}

function SelectorList({
  label,
  selectors,
  kind,
}: {
  label: string;
  selectors: ReadonlyArray<BytecodeMatchSelectorRef>;
  kind: "matched" | "unmatched";
}): React.JSX.Element {
  if (selectors.length === 0) {
    return (
      <div data-list={kind}>
        <h4 className="font-mono text-xs uppercase tracking-wider text-t2">
          {label}
        </h4>
        <p className="text-xs text-t3">none</p>
      </div>
    );
  }
  const dotClass =
    kind === "matched" ? "bg-verdict-safe" : "bg-verdict-review";
  return (
    <div data-list={kind}>
      <h4 className="mb-1 font-mono text-xs uppercase tracking-wider text-t2">
        {label} ({selectors.length})
      </h4>
      <ul className="m-0 flex flex-col gap-1 p-0">
        {selectors.map((s) => (
          <li
            key={s.selector}
            data-selector={s.selector}
            className="flex items-baseline gap-2 text-xs"
          >
            <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
            <code className="font-mono">{s.name}</code>
            <span className="font-mono text-t3">{s.selector}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BytecodeHypothesis({
  result,
}: BytecodeHypothesisProps): React.JSX.Element {
  const { confidence, hypothesis, matchedSelectors, unmatchedSelectors, storageConstants, metadataTrailPresent } = result;
  const constants = [
    storageConstants.eip1967Slot ? "EIP-1967 slot" : null,
    storageConstants.initializableNamespace ? "Initializable namespace" : null,
    storageConstants.ozPatterns ? "OZ patterns" : null,
  ].filter((s): s is string => s !== null);

  return (
    <section
      aria-label="Bytecode hypothesis"
      data-section="bytecode-hypothesis"
      data-hypothesis={hypothesis ?? "absent"}
      className="flex flex-col gap-3 border border-verdict-review bg-verdict-review-surf p-4"
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-verdict-review">
          Bytecode hypothesis
        </h3>
        <ConfidenceBadge confidence={confidence} />
        <MetadataTrailBadge present={metadataTrailPresent} />
      </header>

      <HypothesisCopy hypothesis={hypothesis} />

      {constants.length > 0 ? (
        <p className="text-xs text-t2">
          Storage-layout constants detected:{" "}
          <span className="font-mono text-t1">{constants.join(" · ")}</span>
        </p>
      ) : (
        <p className="text-xs text-t3">
          No storage-layout constants detected.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SelectorList
          label="Matched selectors"
          selectors={matchedSelectors}
          kind="matched"
        />
        <SelectorList
          label="Unmatched selectors"
          selectors={unmatchedSelectors}
          kind="unmatched"
        />
      </div>
    </section>
  );
}
