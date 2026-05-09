// Daniel constraint 2026-05-10: social platform handles (LinkedIn,
// X.com / Twitter, Discord, Telegram, Farcaster, Lens) MUST NOT
// contribute to the Bench score. They are display-only — clickable
// profile links surfaced as a "Linked profiles" panel under the
// engines breakdown.
//
// Sources merged into one panel:
//   • subject.inferredTexts['com.twitter']  → twitter.com/{handle}
//   • subject.inferredTexts['com.discord']  → discord display (no public URL)
//   • subject.inferredTexts['org.telegram'] → t.me/{handle}
//   • urlEngine evidence "Social profile URL" entry (LinkedIn /
//     Farcaster / Lens detected by domain classifier)
//
// Ordering is stable: detected-via-url-engine first, then ENS text
// records in PUBLIC_READ_TEXT_KEYS order.

import type { EngineContribution, MultiSourceEvidence } from "@upgrade-siren/evidence";

interface SocialEntry {
  readonly platform: string;        // human-readable label (LinkedIn, X, Discord, Telegram, Farcaster, Lens)
  readonly handle: string;          // raw handle / id
  readonly link: string | null;     // clickable URL, null when platform has no public profile URL (Discord)
  readonly source: 'url-engine' | 'ens-text';
  readonly source_label: string;    // raw record key for transparency ("url" / "com.twitter" / etc.)
}

function trim(value: string | undefined): string | null {
  if (!value) return null;
  const t = value.trim();
  return t.length === 0 ? null : t;
}

function buildXLink(handle: string): string {
  // Strip leading @, ensure clean handle
  const clean = handle.replace(/^@/, '').trim();
  return `https://x.com/${clean}`;
}

function buildTelegramLink(handle: string): string {
  // Telegram: handles can come as @user or t.me/user — normalize.
  const clean = handle.replace(/^@/, '').replace(/^https?:\/\/(t\.me|telegram\.me)\//, '').trim();
  return `https://t.me/${clean}`;
}

function fromUrlEngine(engines: ReadonlyArray<EngineContribution>): SocialEntry[] {
  const url = engines.find((e) => e.engineId === 'url');
  if (!url || !url.exists) return [];
  const social = url.signals.seniorityBreakdown.find((s) => s.name === 'socialPlatformDetected');
  if (!social || !social.raw) return [];
  const raw = social.raw as { platform?: string; handle?: string };
  if (!raw.platform || !raw.handle) return [];
  const link = url.evidence.find((e) => e.label === 'Social profile URL')?.link ?? null;
  const platformLabel: Record<string, string> = {
    linkedin: 'LinkedIn',
    github: 'GitHub',
    twitter: 'X',
    farcaster: 'Farcaster',
    lens: 'Lens',
  };
  // GitHub from url engine is a duplicate of the github source engine
  // surface — skip to avoid double-listing.
  if (raw.platform === 'github') return [];
  return [
    {
      platform: platformLabel[raw.platform] ?? raw.platform,
      handle: raw.handle,
      link,
      source: 'url-engine',
      source_label: 'url',
    },
  ];
}

function buildLinkedInLink(handle: string): string {
  const clean = handle.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '').trim();
  return `https://www.linkedin.com/in/${clean}`;
}

function buildFarcasterLink(handle: string): string {
  const clean = handle.replace(/^@/, '').trim();
  return `https://warpcast.com/${clean}`;
}

function buildLensLink(handle: string): string {
  const clean = handle.replace(/^@/, '').trim();
  return `https://hey.xyz/u/${clean}`;
}

function fromInferredTexts(
  evidence: MultiSourceEvidence,
): SocialEntry[] {
  const texts = evidence.subject.inferredTexts ?? {};
  const out: SocialEntry[] = [];

  // X / Twitter — accept both keys (X is the rebrand convention,
  // com.twitter is the ENSIP-5 canonical key).
  const xHandle = trim(texts['X']) ?? trim(texts['com.twitter']);
  const xKey = trim(texts['X']) ? 'X' : 'com.twitter';
  if (xHandle) {
    out.push({
      platform: 'X',
      handle: xHandle,
      link: buildXLink(xHandle),
      source: 'ens-text',
      source_label: xKey,
    });
  }

  const linkedin = trim(texts['com.linkedin']);
  if (linkedin) {
    out.push({
      platform: 'LinkedIn',
      handle: linkedin,
      link: buildLinkedInLink(linkedin),
      source: 'ens-text',
      source_label: 'com.linkedin',
    });
  }

  const farcaster = trim(texts['xyz.farcaster']);
  if (farcaster) {
    out.push({
      platform: 'Farcaster',
      handle: farcaster,
      link: buildFarcasterLink(farcaster),
      source: 'ens-text',
      source_label: 'xyz.farcaster',
    });
  }

  const lens = trim(texts['org.lens']);
  if (lens) {
    out.push({
      platform: 'Lens',
      handle: lens,
      link: buildLensLink(lens),
      source: 'ens-text',
      source_label: 'org.lens',
    });
  }

  const discord = trim(texts['com.discord']);
  if (discord) {
    out.push({
      platform: 'Discord',
      handle: discord,
      link: null, // Discord has no canonical public-profile URL
      source: 'ens-text',
      source_label: 'com.discord',
    });
  }

  const telegram = trim(texts['org.telegram']);
  if (telegram) {
    out.push({
      platform: 'Telegram',
      handle: telegram,
      link: buildTelegramLink(telegram),
      source: 'ens-text',
      source_label: 'org.telegram',
    });
  }

  return out;
}

export function SocialsPanel({
  evidence,
  engines,
}: {
  readonly evidence: MultiSourceEvidence;
  readonly engines: ReadonlyArray<EngineContribution>;
}): React.JSX.Element | null {
  const entries: SocialEntry[] = [
    ...fromUrlEngine(engines),
    ...fromInferredTexts(evidence),
  ];
  const primaryNameUsed = evidence.subject.primaryNameUsed ?? null;
  const contentHash = evidence.subject.contentHash ?? null;
  if (entries.length === 0 && contentHash === null && primaryNameUsed === null) return null;

  return (
    <section
      data-section="socials"
      data-entry-count={entries.length}
      data-primary-name={primaryNameUsed ?? undefined}
      aria-label="Linked social profiles"
      className="border border-border bg-surface"
    >
      <header
        className="font-mono uppercase text-t3 flex flex-wrap items-baseline justify-between gap-2"
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--color-border)",
          fontSize: "10px",
          letterSpacing: "0.18em",
        }}
      >
        <span>Linked profiles · {entries.length} · score-neutral</span>
        {primaryNameUsed && (
          <span
            data-field="primary-name-badge"
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "10px",
              letterSpacing: 0,
              color: "var(--color-src-partial)",
            }}
          >
            via primary name {primaryNameUsed}
          </span>
        )}
      </header>

      <ul
        className="m-0 grid list-none gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3"
        data-block="socials-grid"
      >
        {entries.map((entry, idx) => (
          <li
            key={`${entry.source_label}-${idx}`}
            data-platform={entry.platform.toLowerCase()}
            data-source={entry.source}
            className="flex flex-col gap-1"
            style={{
              padding: "10px 12px",
              border: "1px solid var(--color-border)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.04em",
              lineHeight: 1.4,
            }}
          >
            <span
              data-field="platform"
              className="text-t3 uppercase"
              style={{
                fontSize: "10px",
                letterSpacing: "0.18em",
              }}
            >
              {entry.platform}
            </span>
            {entry.link ? (
              <a
                data-field="profile-link"
                href={entry.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-t1 underline-offset-2 hover:underline"
                style={{ wordBreak: "break-all" }}
              >
                {entry.handle}
              </a>
            ) : (
              <span data-field="profile-handle" className="text-t1" style={{ wordBreak: "break-all" }}>
                {entry.handle}
              </span>
            )}
            <span
              data-field="source-record"
              className="text-t3"
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "10px",
                letterSpacing: 0,
              }}
            >
              from ENS {entry.source_label}
            </span>
          </li>
        ))}
      </ul>

      {contentHash && (
        <div
          data-block="content-hash"
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--color-border)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.04em",
          }}
        >
          <span
            className="text-t3 uppercase"
            style={{ fontSize: "10px", letterSpacing: "0.18em", marginRight: "10px" }}
          >
            ENS contentHash
          </span>
          <a
            href={contentHash.startsWith("ipfs://")
              ? `https://ipfs.io/ipfs/${contentHash.replace(/^ipfs:\/\//, "")}`
              : contentHash}
            target="_blank"
            rel="noopener noreferrer"
            className="text-t1 underline-offset-2 hover:underline"
            style={{ wordBreak: "break-all" }}
          >
            {contentHash}
          </a>
        </div>
      )}
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
        Social profiles are surfaced for navigation only. They do not
        contribute to the Bench score — only on-chain evidence,
        Sourcify verifications, GitHub source code, and ENS-internal
        signals are scored.
      </p>
    </section>
  );
}
