import type { SirenReport, Verdict } from "@upgrade-siren/shared";

export const SHORT_MAX_CHARS = 240;
export const VOTE_REASON_MAX_CHARS = 200;

const SHORT_VERDICT_PHRASE: Record<Verdict, string> = {
  SAFE: "Siren reports SAFE",
  REVIEW: "Siren reports REVIEW",
  SIREN: "Siren reports SIREN — do not approve",
};

const VOTE_ACTION_PHRASE: Record<SirenReport["recommendedAction"], string> = {
  approve: "I support this upgrade",
  review: "I want this upgrade reviewed before voting",
  reject: "I cannot support this upgrade",
  wait: "I cannot support this upgrade yet",
};

function clampToCap(text: string, cap: number): string {
  if (text.length <= cap) return text;
  return `${text.slice(0, cap - 1).trimEnd()}…`;
}

export function shortTemplate(
  report: SirenReport,
  name: string,
  reportUrl: string,
): string {
  const head = `${SHORT_VERDICT_PHRASE[report.verdict]} for ${name}.`;
  // Reserve space for " <reportUrl>" so a long ENS name cannot truncate the
  // citation away (the short format is meant to fit ≤ 240 chars *including*
  // the report URL — clamping the entire string would silently drop the URL).
  const separator = reportUrl.length === 0 ? "" : " ";
  const reservedForUrl = separator.length + reportUrl.length;
  // If the report URL alone is at or over the cap, fall back to clamping the
  // whole string (no honest way to keep it short without dropping the URL).
  if (reservedForUrl >= SHORT_MAX_CHARS) {
    return clampToCap(`${head}${separator}${reportUrl}`, SHORT_MAX_CHARS);
  }
  const headBudget = SHORT_MAX_CHARS - reservedForUrl;
  const headText = head.length > headBudget ? clampToCap(head, headBudget) : head;
  return `${headText}${separator}${reportUrl}`;
}

export function forumTemplate(
  report: SirenReport,
  name: string,
  reportUrl: string,
): string {
  const top = report.findings.slice(0, 3);
  const bullets =
    top.length === 0
      ? "- No specific findings."
      : top
          .map((f) => `- [${f.severity.toUpperCase()}] ${f.title}`)
          .join("\n");

  return [
    `Upgrade Siren verdict for ${name}: ${report.verdict}.`,
    "",
    report.summary,
    "",
    "Top findings:",
    bullets,
    "",
    `Mode: ${report.mode}; confidence: ${report.confidence}.`,
    `Signed report: ${reportUrl}`,
  ].join("\n");
}

export function voteReasonTemplate(
  report: SirenReport,
  name: string,
): string {
  const action = VOTE_ACTION_PHRASE[report.recommendedAction];
  const text = `${action}. Upgrade Siren reports ${report.verdict} for ${name}: ${report.summary}`;
  return clampToCap(text, VOTE_REASON_MAX_CHARS);
}
