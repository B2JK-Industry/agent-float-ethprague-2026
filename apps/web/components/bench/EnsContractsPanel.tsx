// Surfaces 0x… addresses found in the subject's ENS text records as
// Sourcify lookup links. Daniel 2026-05-10: when a name like
// sbo3lagent.eth pins a contract address in an "Other Records" slot,
// the bench page should render that pointer with a click-through to
// the Sourcify repo URL — judges can verify the bytecode there.
//
// Hides itself silently when no contract addresses are present (so
// non-contract subjects render no clutter).

import type { MultiSourceEvidence } from "@upgrade-siren/evidence";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const SOURCIFY_KEYS = new Set([
  "eth.contracts",
  "org.sourcify",
  "sourcify",
  "contract",
  "verified-contract",
  "agent-bench:contract",
  "agent-bench:contracts",
]);

interface ContractFromEns {
  readonly key: string;
  readonly address: `0x${string}`;
}

function extractContracts(evidence: MultiSourceEvidence): ReadonlyArray<ContractFromEns> {
  const texts = evidence.subject.inferredTexts ?? {};
  const out: ContractFromEns[] = [];
  const seen = new Set<string>();
  for (const [key, raw] of Object.entries(texts)) {
    if (typeof raw !== "string") continue;
    // Multi-value records may pack several addresses — split on common
    // delimiters and try each token. Most names use a single value.
    const tokens = raw
      .split(/[\s,;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    for (const token of tokens) {
      const isAddr = ADDRESS_RE.test(token);
      const isPinned = SOURCIFY_KEYS.has(key);
      if (!isAddr || !isPinned) continue;
      const lc = token.toLowerCase();
      if (seen.has(lc)) continue;
      seen.add(lc);
      out.push({ key, address: token as `0x${string}` });
    }
  }
  return out;
}

function sourcifyRepoUrl(chainId: number, address: string): string {
  return `https://repo.sourcify.dev/contracts/full_match/${chainId}/${address}/`;
}

function sourcifyLookupUrl(address: string): string {
  // Sourcify v2 search auto-detects the chain when you query an address.
  return `https://sourcify.dev/#/lookup/${address}`;
}

function easscanContractUrl(address: string): string {
  // Etherscan mainnet — covers the common case; the Sourcify lookup URL
  // is the chain-agnostic primary CTA.
  return `https://etherscan.io/address/${address}`;
}

export function EnsContractsPanel({
  evidence,
}: {
  readonly evidence: MultiSourceEvidence;
}): React.JSX.Element | null {
  const contracts = extractContracts(evidence);
  if (contracts.length === 0) return null;

  return (
    <section
      data-section="ens-contracts"
      data-contract-count={contracts.length}
      aria-label="Contract identifiers from ENS records"
      className="border border-border bg-surface"
    >
      <header
        className="font-mono uppercase text-t3"
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--color-border)",
          fontSize: "10px",
          letterSpacing: "0.18em",
        }}
      >
        Contract identifiers · pinned in ENS records
      </header>

      <ul
        className="m-0 list-none p-0"
        style={{
          padding: "12px 20px",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          lineHeight: 1.55,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {contracts.map(({ key, address }) => (
          <li
            key={`${key}-${address}`}
            data-record-key={key}
            data-address={address}
            style={{
              borderBottom: "1px dotted var(--color-border)",
              paddingBottom: "10px",
            }}
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <span
                className="text-t3"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.04em",
                }}
              >
                <code>{key}</code>
              </span>
              <code className="text-t1">{address}</code>
            </div>
            <div className="mt-1 flex flex-wrap gap-3">
              <a
                href={sourcifyLookupUrl(address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
                style={{ fontSize: "10px", letterSpacing: "0.06em" }}
              >
                Sourcify lookup ↗
              </a>
              <a
                href={sourcifyRepoUrl(1, address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-t2 hover:underline"
                style={{ fontSize: "10px", letterSpacing: "0.06em" }}
              >
                Sourcify repo (mainnet) ↗
              </a>
              <a
                href={easscanContractUrl(address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-t2 hover:underline"
                style={{ fontSize: "10px", letterSpacing: "0.06em" }}
              >
                Etherscan ↗
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
        These addresses were pinned by the subject in their ENS text
        records. The Sourcify links resolve verified bytecode (when
        present); diff vs the live deployed bytecode lives in the
        Sourcify drawer above.
      </p>
    </section>
  );
}
