export type StepStatus = "pending" | "running" | "success" | "failure";

export type ChecklistStep = {
  readonly key: string;
  readonly label: string;
  readonly status: StepStatus;
  readonly durationMs?: number;
  readonly error?: string;
};

export type LoadingChecklistProps = {
  steps: readonly ChecklistStep[];
};

const GLYPHS: Record<StepStatus, string> = {
  pending: "○",
  running: "◐",
  success: "✓",
  failure: "×",
};

// Screen-reader status announcements. The visible glyph carries the same
// information visually but is `aria-hidden` so it never reads as a literal
// "circle" / "half-circle" character; this label is what assistive tech
// announces for the row.
const STATUS_SR_LABEL: Record<StepStatus, string> = {
  pending: "pending",
  running: "in progress",
  success: "succeeded",
  failure: "failed",
};

const GLYPH_COLOR_VAR: Record<StepStatus, string> = {
  pending: "var(--color-t3)",
  running: "var(--color-accent)",
  success: "var(--color-verdict-safe)",
  failure: "var(--color-verdict-siren)",
};

export function LoadingChecklist({
  steps,
}: LoadingChecklistProps): React.JSX.Element {
  return (
    <ol
      role="list"
      aria-label="Loading evidence checklist"
      className="m-0 list-none p-0"
      style={{ borderTop: "1px dotted var(--color-border)" }}
    >
      {steps.map((step) => (
        <li
          key={step.key}
          data-key={step.key}
          data-status={step.status}
          className="flex items-baseline gap-3"
          style={{
            padding: "10px 0",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.04em",
            lineHeight: 1.5,
            borderBottom: "1px dotted var(--color-border)",
          }}
        >
          <span
            aria-hidden
            style={{
              color: GLYPH_COLOR_VAR[step.status],
              fontSize: "13px",
              fontWeight: 600,
              minWidth: "16px",
              textAlign: "center",
            }}
          >
            {GLYPHS[step.status]}
          </span>
          <span className="sr-only">
            {STATUS_SR_LABEL[step.status]}
            {": "}
          </span>
          <span
            className="flex-1 text-t1"
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              fontSize: "10px",
            }}
          >
            {step.label}
          </span>
          {step.status === "running" ? (
            <span
              aria-live="polite"
              className="text-t3"
              style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase" }}
            >
              loading
            </span>
          ) : null}
          {step.status === "success" && step.durationMs !== undefined ? (
            <span
              className="text-t3"
              style={{ fontVariantNumeric: "tabular-nums", fontSize: "10px" }}
            >
              {step.durationMs} ms
            </span>
          ) : null}
          {step.status === "failure" && step.error ? (
            <span
              role="alert"
              className="text-verdict-siren"
              style={{ fontSize: "10px", letterSpacing: "0.04em" }}
            >
              {step.error}
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}