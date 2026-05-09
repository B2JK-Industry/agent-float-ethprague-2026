// v3 §C-09 Heartbeat Dot primitive. Only ambient motion in the system.
// 8×8, border-radius 50% (the only exception to right-angles rule),
// 2s ease-out infinite via CSS @keyframes — respects
// prefers-reduced-motion (replaces pulse with static dot).
//
// Usage rule: ONE per surface MAX (v2 §C-09 do/don't). Bench Mode uses
// it on the GitHub drawer header to signal "live activity".

import { keyframesCss } from "./heartbeatKeyframes";

export type HeartbeatState = "ok" | "warn" | "crit";

export type HeartbeatDotProps = {
  readonly state: HeartbeatState;
  /** Mono uppercase label rendered next to the dot — present continuous
   *  verb form per v3 §C-09 (`READING`, not `READ`). */
  readonly label: string;
};

const COLOR_VAR: Record<HeartbeatState, string> = {
  ok: "var(--color-src-verified)",
  warn: "var(--color-review)",
  crit: "var(--color-o-block)",
};

export function HeartbeatDot({
  state,
  label,
}: HeartbeatDotProps): React.JSX.Element {
  const color = COLOR_VAR[state];
  return (
    <>
      <style>{keyframesCss}</style>
      <span
        data-heartbeat={state}
        className="inline-flex items-center gap-2"
      >
        <span
          aria-hidden="true"
          data-field="heartbeat-pulse"
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "9999px", // var(--r-pulse) — only rounded corner exception
            background: color,
            boxShadow: `0 0 0 0 ${color}`,
            animation: "us-bench-heartbeat 2s ease-out infinite",
            flexShrink: 0,
          }}
        />
        <span
          data-field="heartbeat-label"
          className="font-mono uppercase text-t2"
          style={{
            fontSize: "11px",
            letterSpacing: "0.14em",
          }}
        >
          {label}
        </span>
      </span>
    </>
  );
}
