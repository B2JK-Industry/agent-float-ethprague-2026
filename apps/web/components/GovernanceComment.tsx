"use client";

import { useState } from "react";
import type { SirenReport } from "@upgrade-siren/shared";
import {
  forumTemplate,
  shortTemplate,
  voteReasonTemplate,
} from "../lib/governanceTemplates";

export type GovernanceCommentFormat = "short" | "forum" | "vote-reason";

export type GovernanceCommentProps = {
  report: SirenReport;
  name: string;
  reportUrl: string;
  initialFormat?: GovernanceCommentFormat;
};

const FORMAT_LABELS: Record<GovernanceCommentFormat, string> = {
  short: "Short",
  forum: "Forum",
  "vote-reason": "Vote reason",
};

const FORMAT_OPTIONS: GovernanceCommentFormat[] = [
  "short",
  "forum",
  "vote-reason",
];

function renderText(
  format: GovernanceCommentFormat,
  report: SirenReport,
  name: string,
  reportUrl: string,
): string {
  if (format === "short") return shortTemplate(report, name, reportUrl);
  if (format === "forum") return forumTemplate(report, name, reportUrl);
  return voteReasonTemplate(report, name);
}

export function GovernanceComment({
  report,
  name,
  reportUrl,
  initialFormat = "short",
}: GovernanceCommentProps): React.JSX.Element {
  const [format, setFormat] =
    useState<GovernanceCommentFormat>(initialFormat);
  const [copied, setCopied] = useState<boolean>(false);

  const text = renderText(format, report, name, reportUrl);

  async function onCopy(): Promise<void> {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // clipboard unavailable
      }
    }
  }

  return (
    <div className="flex flex-col gap-3" data-testid="governance-comment">
      <div role="tablist" aria-label="Comment format" className="flex gap-2">
        {FORMAT_OPTIONS.map((opt) => {
          const selected = format === opt;
          return (
            <button
              key={opt}
              type="button"
              role="tab"
              id={`gc-tab-${opt}`}
              aria-selected={selected}
              aria-controls={`gc-panel-${opt}`}
              onClick={() => {
                setFormat(opt);
                setCopied(false);
              }}
              className={
                selected
                  ? "rounded border border-[color:var(--color-t1)] bg-[color:var(--color-raised)] px-3 py-1 text-sm"
                  : "rounded border border-[color:var(--color-border)] px-3 py-1 text-sm"
              }
            >
              {FORMAT_LABELS[opt]}
            </button>
          );
        })}
      </div>

      <pre
        role="tabpanel"
        id={`gc-panel-${format}`}
        aria-labelledby={`gc-tab-${format}`}
        data-format={format}
        data-length={text.length}
        className="whitespace-pre-wrap rounded border border-[color:var(--color-border)] bg-[color:var(--color-raised)] p-3 text-sm"
      >
        {text}
      </pre>

      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy comment to clipboard"
        className="self-start rounded border border-[color:var(--color-t1)] px-3 py-1 text-sm"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
