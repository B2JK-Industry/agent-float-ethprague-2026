import type {
  Address,
  ReportMode,
  SirenReport,
  Verdict,
} from "@upgrade-siren/shared";

import { MockBadge } from "./MockBadge";
import { SignatureStatusBadge } from "./SignatureStatusBadge";

export type VerdictCardProps = {
  verdict: Verdict;
  name: string;
  proxy: Address;
  summary: string;
  auth: SirenReport["auth"];
  mode: ReportMode;
  mock?: boolean;
};

/**
 * Map each verdict to its surface tint + border + foreground colour token.
 * Hex values come from `assets/brand/brand-tokens.json` via the Tailwind
 * preset (US-067); colour is paired with a glyph at every size per GATE-22.
 */
const STATE_CLASS: Record<Verdict, string> = {
  SAFE: "border-verdict-safe bg-verdict-safe-surf text-verdict-safe",
  REVIEW:
    "border-verdict-review bg-verdict-review-surf text-verdict-review",
  SIREN: "border-verdict-siren bg-verdict-siren-surf text-verdict-siren",
};

const MODE_LABEL: Record<ReportMode, string> = {
  "signed-manifest": "SIGNED-MANIFEST",
  "public-read": "PUBLIC-READ FALLBACK",
  mock: "MOCK · DEMO",
};

const MODE_PILL_CLASS: Record<ReportMode, string> = {
  "signed-manifest": "border-t1 text-t1",
  "public-read": "border-accent text-accent",
  mock: "border-verdict-review text-verdict-review",
};

function truncateProxy(proxy: string): string {
  return proxy.length >= 10
    ? `${proxy.slice(0, 6)}…${proxy.slice(-4)}`
    : proxy;
}

function VerdictGlyph({ verdict }: { verdict: Verdict }): React.JSX.Element {
  if (verdict === "SAFE") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="square"
        aria-hidden
        data-glyph="check"
        className="h-16 w-16"
      >
        <path d="M 4 12 L 10 18 L 20 6" />
      </svg>
    );
  }
  if (verdict === "REVIEW") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="square"
        aria-hidden
        data-glyph="bars"
        className="h-16 w-16"
      >
        <line x1="4" y1="8" x2="20" y2="8" />
        <line x1="4" y1="14" x2="20" y2="14" />
        <line x1="4" y1="20" x2="20" y2="20" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      data-glyph="alarm-bar"
      className="h-16 w-16"
    >
      <rect x="9" y="4" width="6" height="13" />
      <rect x="9" y="19" width="6" height="3" />
    </svg>
  );
}

export function VerdictCard({
  verdict,
  name,
  proxy,
  summary,
  auth,
  mode,
  mock = false,
}: VerdictCardProps): React.JSX.Element {
  return (
    <article
      role="region"
      aria-label={`${verdict} verdict for ${name}`}
      data-verdict={verdict}
      data-mode={mode}
      data-mock={mock ? "true" : "false"}
      className={`relative overflow-hidden border ${STATE_CLASS[verdict]}`}
    >
      {mock ? (
        <div className="absolute right-3 top-3 z-10">
          <MockBadge visible />
        </div>
      ) : null}

      <div className="flex flex-col gap-6 p-7 md:flex-row md:items-start">
        <div
          aria-hidden
          className="flex h-24 w-24 shrink-0 items-center justify-center border-2 border-current"
        >
          <VerdictGlyph verdict={verdict} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-t2">
            VERDICT · {MODE_LABEL[mode]}
          </span>
          <h2
            data-testid="verdict-word"
            className="font-display font-bold leading-none tracking-tighter text-[clamp(56px,9vw,88px)]"
          >
            {verdict}
          </h2>
          <p className="break-all font-mono text-sm text-t2">
            <span className="font-medium text-accent">{name}</span>{" "}
            <span aria-hidden>·</span>{" "}
            <span className="text-t2">{truncateProxy(proxy)}</span>
          </p>
          <p className="max-w-[56ch] text-base text-t1">{summary}</p>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-2 border-t border-border-strong/60 px-7 py-4"
        aria-label="Verdict badges"
      >
        <SignatureStatusBadge auth={auth} />
        <span
          data-mode-pill={mode}
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs ${MODE_PILL_CLASS[mode]}`}
        >
          {MODE_LABEL[mode]}
        </span>
      </div>
    </article>
  );
}
