"use client";

import { Highlight, themes, type Language } from "prism-react-renderer";

// US-076 — SourceDiffRenderer.
//
// Stream B is shipping the source-diff primitive in @upgrade-siren/evidence
// as US-075. At the time this component is committed US-075 has not merged,
// so the input shape below mirrors the spec the two streams agreed on
// during the US-076 backlog discussion. When US-075 lands, switch the
// `import type` line to `import type { SourceDiff, ... } from "@upgrade-siren/evidence"`
// and delete the local declarations — the field names below match.

export type SourceDiffLineKind = "add" | "remove" | "context";

export type SourceDiffLine = {
  readonly kind: SourceDiffLineKind;
  readonly content: string;
  /** 1-based line number in the previous file; undefined for added lines. */
  readonly oldLineNo?: number;
  /** 1-based line number in the current file; undefined for removed lines. */
  readonly newLineNo?: number;
};

export type SourceDiffHunk = {
  readonly oldStart: number;
  readonly oldLines: number;
  readonly newStart: number;
  readonly newLines: number;
  /** Section header (e.g. function signature) shown after the @@ marker. */
  readonly header?: string;
  readonly lines: ReadonlyArray<SourceDiffLine>;
};

export type SourceDiffFile = {
  readonly path: string;
  /** Set when the file was renamed; undefined when added/removed/modified in place. */
  readonly previousPath?: string;
  readonly hunks: ReadonlyArray<SourceDiffHunk>;
  readonly additionsCount: number;
  readonly deletionsCount: number;
};

export type SourceDiff = {
  readonly files: ReadonlyArray<SourceDiffFile>;
};

export type SourceDiffRendererProps = {
  readonly diff: SourceDiff;
  /** File paths to render in the open state (collapsed otherwise). */
  readonly defaultOpenFiles?: ReadonlySet<string>;
};

// prism-react-renderer ships JS/TS/etc. but not Solidity by default. Solidity
// shares enough syntax with C / JavaScript that the `clike` Prism language is
// a passable fallback for a hackathon-grade renderer. When prism-themes adds
// Solidity (or US-075 delivers a tokenizer), swap the cast below.
const SOLIDITY_LIKE_LANGUAGE = "clike" as Language;

function LineRow({ line }: { line: SourceDiffLine }): React.JSX.Element {
  const sigil = line.kind === "add" ? "+" : line.kind === "remove" ? "-" : " ";
  // Full-saturation verdict tokens per brand manual section 04 swatches:
  //   verdict-safe chip   = background #00D67A, foreground #062A1B (safe-surf)
  //   verdict-siren chip  = background #FF3B30, foreground #2D0B09 (siren-surf)
  // Mirroring those WCAG-AAA-tested pairs makes the + / − lines legible at
  // every type size; using the surf colour as the text keeps the contrast
  // ratio identical to the brand chips.
  const rowClass =
    line.kind === "add"
      ? "bg-verdict-safe text-verdict-safe-surf"
      : line.kind === "remove"
        ? "bg-verdict-siren text-verdict-siren-surf"
        : "text-t2";

  return (
    <div
      data-line-kind={line.kind}
      className={`grid grid-cols-[3rem_3rem_1rem_1fr] items-baseline gap-2 px-2 py-0.5 font-mono text-xs ${rowClass}`}
    >
      <span aria-hidden className="text-right text-t3">
        {line.oldLineNo ?? ""}
      </span>
      <span aria-hidden className="text-right text-t3">
        {line.newLineNo ?? ""}
      </span>
      <span
        aria-hidden
        className="text-center font-bold"
      >
        {sigil}
      </span>
      <Highlight
        code={line.content}
        language={SOLIDITY_LIKE_LANGUAGE}
        theme={themes.nightOwl}
      >
        {({ tokens, getTokenProps }) => (
          <code className="overflow-x-auto whitespace-pre">
            {tokens.map((tokenLine, lineIndex) => (
              <span key={lineIndex}>
                {tokenLine.map((token, tokenIndex) => (
                  <span key={tokenIndex} {...getTokenProps({ token })} />
                ))}
              </span>
            ))}
          </code>
        )}
      </Highlight>
    </div>
  );
}

function HunkRow({ hunk }: { hunk: SourceDiffHunk }): React.JSX.Element {
  return (
    <div data-hunk className="border-t border-border first:border-t-0">
      <div className="bg-bg px-2 py-1 font-mono text-xs text-t3">
        @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
        {hunk.header ? (
          <span className="ml-3 text-t2">{hunk.header}</span>
        ) : null}
      </div>
      {hunk.lines.map((line, i) => (
        <LineRow key={`${i}-${line.kind}`} line={line} />
      ))}
    </div>
  );
}

function FileRow({
  file,
  defaultOpen,
}: {
  file: SourceDiffFile;
  defaultOpen?: boolean;
}): React.JSX.Element {
  return (
    <details
      data-file={file.path}
      open={defaultOpen}
      className="rounded-md border border-border bg-raised"
    >
      <summary className="flex flex-wrap items-center gap-3 px-3 py-2 cursor-pointer">
        <code className="font-mono text-sm text-t1">{file.path}</code>
        {file.previousPath ? (
          <span className="font-mono text-xs text-t3">
            (renamed from {file.previousPath})
          </span>
        ) : null}
        <span
          data-badge="additions"
          className="ml-auto inline-flex items-center rounded border border-verdict-safe px-1.5 py-0.5 font-mono text-xs text-verdict-safe"
        >
          +{file.additionsCount}
        </span>
        <span
          data-badge="deletions"
          className="inline-flex items-center rounded border border-verdict-siren px-1.5 py-0.5 font-mono text-xs text-verdict-siren"
        >
          −{file.deletionsCount}
        </span>
        <span
          data-badge="hunks"
          className="inline-flex items-center rounded border border-border-strong px-1.5 py-0.5 font-mono text-xs text-t2"
        >
          {file.hunks.length} hunk{file.hunks.length === 1 ? "" : "s"}
        </span>
      </summary>
      <div className="border-t border-border">
        {file.hunks.map((hunk, i) => (
          <HunkRow key={i} hunk={hunk} />
        ))}
      </div>
    </details>
  );
}

export function SourceDiffRenderer({
  diff,
  defaultOpenFiles,
}: SourceDiffRendererProps): React.JSX.Element {
  if (diff.files.length === 0) {
    return (
      <p
        data-testid="source-diff-empty"
        className="text-sm text-t2"
      >
        No source changes detected between the two implementations.
      </p>
    );
  }

  return (
    <section
      aria-label="Source diff"
      data-testid="source-diff-renderer"
      className="flex flex-col gap-3"
    >
      {diff.files.map((file) => (
        <FileRow
          key={file.path}
          file={file}
          defaultOpen={defaultOpenFiles?.has(file.path)}
        />
      ))}
    </section>
  );
}
