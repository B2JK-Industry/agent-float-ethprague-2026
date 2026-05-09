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

const GLYPH_COLOR_VAR: Record<StepStatus, string> = {
  pending: "var(--color-t2)",
  running: "var(--color-t1)",
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
      className="flex flex-col gap-1"
    >
      {steps.map((step) => (
        <li
          key={step.key}
          data-key={step.key}
          data-status={step.status}
          className="flex items-center gap-2 text-sm"
        >
          <span
            aria-hidden
            className="font-mono"
            style={{ color: GLYPH_COLOR_VAR[step.status] }}
          >
            {GLYPHS[step.status]}
          </span>
          <span className="flex-1">{step.label}</span>
          {step.status === "running" ? (
            <span
              aria-live="polite"
              className="text-xs text-[color:var(--color-t2)]"
            >
              loading…
            </span>
          ) : null}
          {step.status === "success" && step.durationMs !== undefined ? (
            <span className="font-mono text-xs text-[color:var(--color-t2)]">
              {step.durationMs}ms
            </span>
          ) : null}
          {step.status === "failure" && step.error ? (
            <span
              role="alert"
              className="text-xs text-[color:var(--color-verdict-siren)]"
            >
              {step.error}
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
