// v2 §5A heartbeat motion. 2s ease-out infinite, alpha 0.55 → 0
// box-shadow expansion. prefers-reduced-motion disables the
// expansion (static dot remains).
//
// Single export so the @keyframes only ships once even if multiple
// HeartbeatDot instances mount (one is the v3 cap; defensive).

export const keyframesCss = `
@keyframes us-bench-heartbeat {
  0%   { box-shadow: 0 0 0 0 currentColor; }
  70%  { box-shadow: 0 0 0 8px rgba(0,0,0,0); }
  100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); }
}
@media (prefers-reduced-motion: reduce) {
  span[data-field="heartbeat-pulse"] {
    animation: none !important;
  }
}
`;
