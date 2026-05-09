// v3 §C-04 Trust Pill primitive. Renders a multiplier (× 0.00..× 1.00)
// OR the literal word INVALID — never both. Carry-rule v2 §2B applies:
// color is redundancy, currentColor border + label is the at-a-glance
// signal. Used by US-133 SourceGrid, US-135 SourcifyDrawer, US-136
// GitHubDrawer.

export type TrustPillVariant =
  | "verified"
  | "partial"
  | "discounted"
  | "degraded"
  | "missing"
  | "invalid";

export type TrustPillProps = {
  readonly variant: TrustPillVariant;
  /** Either a multiplier (e.g. "× 0.60") OR the word "INVALID" — never both. */
  readonly label: string;
};

const COLOR_VAR: Record<TrustPillVariant, string> = {
  verified: "var(--color-src-verified)",
  partial: "var(--color-src-partial)",
  discounted: "var(--color-src-discounted)",
  degraded: "var(--color-src-degraded)",
  missing: "var(--color-src-missing)",
  invalid: "var(--color-o-block)",
};

export function TrustPill({
  variant,
  label,
}: TrustPillProps): React.JSX.Element {
  return (
    <span
      data-trust-pill={variant}
      data-label={label}
      style={{
        color: COLOR_VAR[variant],
        border: "1px solid currentColor",
        padding: "2px 8px",
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        letterSpacing: "0.08em",
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        textAlign: "center",
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
}
