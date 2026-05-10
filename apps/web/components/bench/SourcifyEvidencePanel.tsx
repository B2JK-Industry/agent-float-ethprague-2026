// Rich Sourcify evidence rollup. Sits between SourceGrid and the
// existing per-source SourcifyDrawer on /b/[name] so judges (and the
// Sourcify Bounty reviewer) get a one-glance summary of the bytecode
// receipts behind the score:
//
//   - per-entry match level (exact_match / match / not_found) + creation
//     vs runtime match badges
//   - compiler + EVM version + optimizer settings + license
//   - OpenZeppelin pattern detection (Pausable / Ownable / UUPS / etc)
//     surfaced as labelled chips
//   - storage layout: first 12 entries (slot / label / type) — the #1
//     catastrophic risk surface for proxy upgrades
//   - cross-chain presence: every chain Sourcify has the same address
//     verified on
//   - "Verify on Sourcify" CTA when the contract is unverified
//
// Hides itself entirely when there are no Sourcify entries AND no
// fallback Etherscan entries — non-contract subjects render no
// clutter.
//
// 2026-05-10: Sourcify Bounty enrichment PR.

import type { MultiSourceEvidence } from "@upgrade-siren/evidence";
import type {
  SourcifyDeep,
  SourcifyDeepStorageEntry,
} from "@upgrade-siren/evidence";

const PATTERN_CHIP_COLOR: Record<string, string> = {
  pausable: "var(--color-tier-c, #c93)",
  ownable: "var(--color-src-verified, #2a8)",
  uups: "var(--color-accent, #7af)",
  access_control: "var(--color-src-verified, #2a8)",
  reentrancy_guard: "var(--color-src-verified, #2a8)",
  initializable: "var(--color-src-partial, #c93)",
};

function matchBadgeColor(match: string | null): string {
  if (match === "exact_match") return "var(--color-src-verified, #2a8)";
  if (match === "match") return "var(--color-src-partial, #c93)";
  return "var(--color-t3)";
}

function matchBadgeLabel(match: string | null): string {
  if (match === "exact_match") return "EXACT";
  if (match === "match") return "PARTIAL";
  if (match === "not_found") return "NOT FOUND";
  return "—";
}

function sourcifyRepoUrl(chainId: number, address: string): string {
  return `https://repo.sourcify.dev/contracts/full_match/${chainId}/${address}/`;
}

function sourcifyVerifyUrl(chainId: number, address: string): string {
  return `https://sourcify.dev/#/verifier?chainId=${chainId}&address=${address}`;
}

function sourcifyLookupUrl(address: string): string {
  return `https://sourcify.dev/#/lookup/${address}`;
}

export function SourcifyEvidencePanel({
  evidence,
}: {
  readonly evidence: MultiSourceEvidence;
}): React.JSX.Element | null {
  const okEntries = evidence.sourcify.filter(
    (e): e is Extract<typeof e, { kind: "ok" }> => e.kind === "ok",
  );
  const errorEntries = evidence.sourcify.filter(
    (e): e is Extract<typeof e, { kind: "error" }> => e.kind === "error",
  );
  const etherscanFallback = evidence.etherscanFallback ?? [];
  const etherscanOk = etherscanFallback.filter(
    (e): e is Extract<typeof e, { kind: "ok" }> => e.kind === "ok",
  );

  if (okEntries.length === 0 && errorEntries.length === 0 && etherscanOk.length === 0) {
    return null;
  }

  return (
    <section
      data-section="sourcify-evidence"
      data-ok-count={okEntries.length}
      data-error-count={errorEntries.length}
      data-etherscan-fallback-count={etherscanOk.length}
      aria-label="Sourcify-anchored evidence"
      className="border border-border bg-surface"
    >
      <header
        className="flex flex-wrap items-baseline justify-between gap-2"
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="flex flex-col gap-1">
          <span
            className="font-mono uppercase text-t3"
            style={{ fontSize: "10px", letterSpacing: "0.18em" }}
          >
            Sourcify · verified bytecode evidence
          </span>
          <span
            className="text-t2"
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
            }}
          >
            {okEntries.length} verified · {errorEntries.length} errored ·{" "}
            {etherscanOk.length} Etherscan fallback
          </span>
        </div>
        <a
          href="https://sourcify.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="text-t3 hover:underline"
          style={{ fontSize: "10px", letterSpacing: "0.06em" }}
        >
          about Sourcify ↗
        </a>
      </header>

      <ul
        className="m-0 list-none p-0"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          lineHeight: 1.55,
        }}
      >
        {okEntries.map((entry) => (
          <SourcifyOkEntry
            key={`${entry.chainId}-${entry.address}`}
            chainId={entry.chainId}
            address={entry.address}
            label={entry.label}
            deep={entry.deep}
            // Defensive reads — orchestrator always populates patterns/
            // licenseCompiler on `kind: "ok"` entries, but minimal test
            // fixtures construct partial `as unknown as MultiSourceEvidence`
            // shapes that omit them. Render safely either way.
            patterns={(entry.patterns ?? []).map((p) => p.pattern)}
            license={entry.licenseCompiler?.dominantLicense ?? null}
            compilerVersion={
              entry.licenseCompiler?.compiler?.major !== undefined
                ? `${entry.licenseCompiler.compiler.major}.${entry.licenseCompiler.compiler.minor}.${entry.licenseCompiler.compiler.patch}`
                : null
            }
          />
        ))}

        {errorEntries.map((entry) => (
          <li
            key={`err-${entry.chainId}-${entry.address}`}
            data-entry-state="error"
            data-chain-id={entry.chainId}
            style={{
              padding: "12px 20px",
              borderBottom: "1px dotted var(--color-border)",
            }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <code className="text-t2">
                chain {entry.chainId} · {truncateAddress(entry.address)}
              </code>
              <span
                style={{
                  color: "var(--color-verdict-siren, #c33)",
                  fontSize: "9px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {entry.reason}
              </span>
            </div>
            <p className="text-t3" style={{ fontSize: "10px", marginTop: "4px" }}>
              {entry.message}
            </p>
            <div className="mt-2 flex gap-3">
              <a
                href={sourcifyVerifyUrl(entry.chainId, entry.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
                style={{ fontSize: "10px", letterSpacing: "0.06em" }}
              >
                Verify on Sourcify ↗
              </a>
              <a
                href={sourcifyLookupUrl(entry.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-t2 hover:underline"
                style={{ fontSize: "10px", letterSpacing: "0.06em" }}
              >
                Lookup ↗
              </a>
            </div>
          </li>
        ))}

        {etherscanOk.map((entry) => (
          <li
            key={`et-${entry.chainId}`}
            data-entry-state="etherscan-fallback"
            data-chain-id={entry.chainId}
            style={{
              padding: "12px 20px",
              borderBottom: "1px dotted var(--color-border)",
              background: "var(--color-bg)",
            }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <code className="text-t1">
                chain {entry.chainId} · Etherscan fallback (×0.5 weight)
              </code>
              <span
                style={{
                  color: "var(--color-src-partial, #c93)",
                  fontSize: "9px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                etherscan
              </span>
            </div>
            <p className="text-t3" style={{ fontSize: "10px", marginTop: "4px" }}>
              Sourcify had no entry for this address; Etherscan returned
              a verified source. Counted at half-weight in compileSuccess
              acknowledging Sourcify supremacy. Submit to Sourcify to lift
              the score.
            </p>
            <div className="mt-2 flex gap-3">
              <a
                href={sourcifyVerifyUrl(entry.chainId, entry.value.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
                style={{ fontSize: "10px", letterSpacing: "0.06em" }}
              >
                Submit to Sourcify ↗
              </a>
            </div>
          </li>
        ))}
      </ul>

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
        Sourcify verifies that on-chain bytecode was compiled from the
        sources its author claims. Siren weighs Sourcify-verified
        contracts at full trust (×1.0) for the compileSuccess and
        sourcifyRecency components, plus a cross-chain breadth bonus
        for contracts verified on multiple chains.
      </p>
    </section>
  );
}

function SourcifyOkEntry({
  chainId,
  address,
  label,
  deep,
  patterns,
  license,
  compilerVersion,
}: {
  readonly chainId: number;
  readonly address: string;
  readonly label: string;
  readonly deep: SourcifyDeep | undefined;
  readonly patterns: ReadonlyArray<string>;
  readonly license: string | null;
  readonly compilerVersion: string | null;
}): React.JSX.Element {
  const sigCount = deep?.functionSignatures?.length ?? 0;
  const evtCount = deep?.eventSignatures?.length ?? 0;
  const storage = deep?.storageLayout?.entries ?? [];
  const storagePreview = storage.slice(0, 12);
  const proxyImpls = deep?.proxyResolution?.implementations ?? [];
  const matchLevel = deep?.match ?? null;
  const creationMatch = deep?.creationMatch ?? null;
  const runtimeMatch = deep?.runtimeMatch ?? null;
  const compilation = deep?.compilation ?? null;
  const proxyResolution = deep?.proxyResolution ?? null;

  return (
    <li
      data-entry-state="ok"
      data-chain-id={chainId}
      data-address={address}
      style={{
        padding: "14px 20px",
        borderBottom: "1px dotted var(--color-border)",
      }}
    >
      {/* Header row: address + match badge + chain */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-t1">{label}</span>
          <code className="text-t3" style={{ fontSize: "10px" }}>
            chain {chainId} · {truncateAddress(address)}
          </code>
        </div>
        <span
          data-field="match-badge"
          style={{
            fontSize: "10px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "3px 8px",
            border: `1px solid ${matchBadgeColor(matchLevel)}`,
            color: matchBadgeColor(matchLevel),
          }}
        >
          {matchBadgeLabel(matchLevel)}
        </span>
      </div>

      {/* creation + runtime match */}
      <div className="mt-2 flex flex-wrap gap-3 text-t3" style={{ fontSize: "10px" }}>
        <span>
          creation:{" "}
          <span style={{ color: matchBadgeColor(creationMatch) }}>
            {matchBadgeLabel(creationMatch)}
          </span>
        </span>
        <span>
          runtime:{" "}
          <span style={{ color: matchBadgeColor(runtimeMatch) }}>
            {matchBadgeLabel(runtimeMatch)}
          </span>
        </span>
        <span>
          functions: <span className="text-t1">{sigCount}</span>
        </span>
        <span>
          events: <span className="text-t1">{evtCount}</span>
        </span>
      </div>

      {/* Compiler + license + EVM */}
      {compilation || compilerVersion || license ? (
        <div className="mt-2 flex flex-wrap gap-3 text-t3" style={{ fontSize: "10px" }}>
          {(compilation?.compilerVersion ?? compilerVersion) ? (
            <span>
              compiler:{" "}
              <code className="text-t1">
                {compilation?.compilerVersion ?? compilerVersion}
              </code>
            </span>
          ) : null}
          {compilation?.evmVersion ? (
            <span>
              evm: <code className="text-t1">{compilation.evmVersion}</code>
            </span>
          ) : null}
          {compilation?.optimizerEnabled !== undefined &&
          compilation?.optimizerEnabled !== null ? (
            <span>
              optimizer:{" "}
              <code className="text-t1">
                {compilation.optimizerEnabled
                  ? `on (${compilation.optimizerRuns ?? "?"})`
                  : "off"}
              </code>
            </span>
          ) : null}
          {license ? (
            <span>
              license: <code className="text-t1">{license}</code>
            </span>
          ) : null}
        </div>
      ) : null}

      {/* OZ pattern chips */}
      {patterns.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {patterns.map((p) => (
            <span
              key={p}
              data-pattern={p}
              style={{
                fontSize: "9px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "2px 6px",
                border: `1px solid ${PATTERN_CHIP_COLOR[p] ?? "var(--color-t3)"}`,
                color: PATTERN_CHIP_COLOR[p] ?? "var(--color-t3)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {p.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      ) : null}

      {/* Proxy resolution */}
      {proxyResolution?.isProxy ? (
        <div className="mt-2 text-t3" style={{ fontSize: "10px" }}>
          proxy:{" "}
          <code className="text-t1">{proxyResolution.proxyType ?? "yes"}</code>
          {proxyImpls.length > 0 ? (
            <span>
              {" "}
              · impls:{" "}
              {proxyImpls.map((impl, i) => (
                <span key={impl.address}>
                  {i > 0 ? ", " : ""}
                  <code className="text-t1">{truncateAddress(impl.address)}</code>
                </span>
              ))}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Storage layout (first 12 entries) */}
      {storagePreview.length > 0 ? (
        <details className="mt-2">
          <summary
            className="cursor-pointer text-t3 hover:text-t1"
            style={{
              fontSize: "10px",
              letterSpacing: "0.06em",
            }}
          >
            storage layout · {storage.length} entries
            {storage.length > storagePreview.length
              ? ` (showing first ${storagePreview.length})`
              : ""}
          </summary>
          <table
            className="mt-2"
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ color: "var(--color-t3)" }}>
                <th style={cellStyle("left", "40px")}>slot</th>
                <th style={cellStyle("left", "auto")}>label</th>
                <th style={cellStyle("left", "auto")}>type</th>
                <th style={cellStyle("right", "40px")}>off</th>
              </tr>
            </thead>
            <tbody>
              {storagePreview.map((s: SourcifyDeepStorageEntry) => (
                <tr key={`${s.slot}-${s.label}`} style={{ color: "var(--color-t1)" }}>
                  <td style={cellStyle("left", "40px")}>
                    <code>{s.slot}</code>
                  </td>
                  <td style={cellStyle("left", "auto")}>
                    <code>{s.label}</code>
                  </td>
                  <td style={cellStyle("left", "auto")}>
                    <code>{s.type}</code>
                  </td>
                  <td style={cellStyle("right", "40px")}>
                    {s.offset === null ? "—" : <code>{s.offset}</code>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}

      {/* Action links */}
      <div className="mt-2 flex flex-wrap gap-3">
        <a
          href={sourcifyRepoUrl(chainId, address)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
          style={{ fontSize: "10px", letterSpacing: "0.06em" }}
        >
          Sourcify repo ↗
        </a>
        <a
          href={sourcifyLookupUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-t2 hover:underline"
          style={{ fontSize: "10px", letterSpacing: "0.06em" }}
        >
          Lookup ↗
        </a>
      </div>
    </li>
  );
}

function truncateAddress(addr: string | undefined | null): string {
  if (!addr || addr.length <= 12) return addr ?? "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function cellStyle(
  align: "left" | "right",
  width: string,
): React.CSSProperties {
  return {
    textAlign: align,
    width,
    padding: "3px 6px",
    borderBottom: "1px dotted var(--color-border)",
    fontWeight: "normal",
  };
}
