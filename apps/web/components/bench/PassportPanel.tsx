// Gitcoin Passport panel — surfaces Sybil-resistance score for the
// subject's primaryAddress. Display-only (no score impact in v1).

import type { MultiSourceEvidence } from "@upgrade-siren/evidence";

function tierColor(score: number): string {
  if (score >= 50) return "var(--color-src-verified)";
  if (score >= 20) return "var(--color-src-partial)";
  return "var(--color-src-discounted)";
}

function tierLabel(score: number): string {
  if (score >= 80) return "heavily verified";
  if (score >= 50) return "well verified";
  if (score >= 20) return "verified human";
  return "unverified";
}

export function PassportPanel({
  evidence,
}: {
  readonly evidence: MultiSourceEvidence;
}): React.JSX.Element | null {
  const passport = evidence.passport;
  if (!passport || passport.kind === "error") {
    // Hide panel entirely for "expected absent" cases:
    //   - address_not_passport_user (subject has no Gitcoin Passport)
    //   - missing_api_key (PASSPORT_API_KEY env not configured — silently
    //     hide so demo doesn't surface infrastructure config as content)
    if (passport && passport.kind === "error") {
      const silentReasons = ["address_not_passport_user", "missing_api_key"];
      if (silentReasons.includes(passport.reason)) return null;
      // Render small error chip only for actual operational failures
      // (rate limit, server error, network)
      return (
        <section
          data-section="passport"
          data-state="error"
          className="border border-border bg-surface"
          style={{ padding: "12px 20px" }}
        >
          <span
            className="font-mono uppercase text-t3"
            style={{ fontSize: "10px", letterSpacing: "0.18em" }}
          >
            Gitcoin Passport · {passport.reason}
          </span>
        </section>
      );
    }
    return null;
  }

  const v = passport.value;
  const color = tierColor(v.score);
  const label = tierLabel(v.score);

  return (
    <section
      data-section="passport"
      data-passport-score={v.score.toFixed(1)}
      data-passport-passing={v.passing}
      aria-label="Gitcoin Passport sybil-resistance score"
      className="border border-border bg-surface"
    >
      <header
        className="font-mono uppercase text-t3 flex items-baseline justify-between gap-2"
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--color-border)",
          fontSize: "10px",
          letterSpacing: "0.18em",
        }}
      >
        <span>Gitcoin Passport · sybil resistance · score-neutral</span>
        <a
          href={`https://passport.human.tech/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-t3 hover:underline"
          style={{ fontSize: "10px", letterSpacing: "0.04em", fontStyle: "italic", fontFamily: "var(--font-serif)" }}
        >
          about ↗
        </a>
      </header>

      <div
        className="grid gap-4 sm:grid-cols-3"
        style={{
          padding: "20px",
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <div className="flex flex-col">
          <span
            className="text-t3 uppercase"
            style={{ fontSize: "10px", letterSpacing: "0.18em" }}
          >
            score
          </span>
          <span
            data-field="score-big"
            className="text-t1"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "32px",
              fontWeight: 700,
              lineHeight: 1,
              color,
              marginTop: "8px",
            }}
          >
            {v.score.toFixed(1)}
          </span>
          <span
            className="text-t3 mt-1"
            style={{ fontSize: "10px", fontStyle: "italic", fontFamily: "var(--font-serif)" }}
          >
            {label} · threshold {v.threshold.toFixed(0)}
          </span>
        </div>

        <div className="flex flex-col">
          <span
            className="text-t3 uppercase"
            style={{ fontSize: "10px", letterSpacing: "0.18em" }}
          >
            stamps
          </span>
          <span
            data-field="stamp-count"
            className="text-t1"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "32px",
              fontWeight: 700,
              lineHeight: 1,
              marginTop: "8px",
            }}
          >
            {v.stampCount}
          </span>
          <span
            className="text-t3 mt-1"
            style={{ fontSize: "10px" }}
          >
            verified credentials
          </span>
        </div>

        <div className="flex flex-col">
          <span
            className="text-t3 uppercase"
            style={{ fontSize: "10px", letterSpacing: "0.18em" }}
          >
            status
          </span>
          <span
            data-field="passing"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "16px",
              fontWeight: 600,
              lineHeight: 1.2,
              marginTop: "8px",
              color: v.passing ? "var(--color-src-verified)" : "var(--color-src-discounted)",
            }}
          >
            {v.passing ? "PASSING" : "BELOW THRESHOLD"}
          </span>
          {v.evidenceTimestamp && (
            <span
              className="text-t3 mt-1"
              style={{ fontSize: "10px", fontFamily: "var(--font-serif)", fontStyle: "italic" }}
            >
              latest stamp: {new Date(v.evidenceTimestamp).toISOString().slice(0, 10)}
            </span>
          )}
        </div>
      </div>

      <p
        className="text-t3"
        style={{
          padding: "10px 20px 14px",
          fontSize: "10px",
          letterSpacing: "0.04em",
          fontStyle: "italic",
          fontFamily: "var(--font-serif)",
          background: "var(--color-bg)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        Gitcoin Passport aggregates Web3 identity verifications (ENS,
        GitHub, Twitter, BrightID, Coinbase, Proof of Humanity) into a
        Sybil-resistance score 0–100. Score-neutral in Bench v1 — surfaced
        for cross-reference. Threshold 20 = single human pass.
      </p>
    </section>
  );
}
