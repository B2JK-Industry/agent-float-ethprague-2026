"use client";

// Umia Bid Permit — server-permit issuer surface.
//
// Renders below UmiaVentureApplySection on /b/[name]. Lets a wallet that
// controls the subject ENS mint an EIP-712 ServerPermit it can drop into
// a Tailored Auction bid as `hookData`. The on-chain UmiaValidationHook
// recovers our signer (set by the auction founder via setSigner(...)) and
// admits the bid based on the subject's Bench tier.
//
// Strict UI rules:
//   - subject is pulled from the page route, not user input.
//   - wallet is pulled from the connected wagmi account; when no wallet is
//     connected we render a connect CTA only.
//   - mock mode (REPORT_SIGNER_PRIVATE_KEY absent) renders a visible
//     "mock: true" badge per CLAUDE.md rule.
//   - validation errors come back from the API with structured reason
//     codes; we surface them inline next to the relevant input.

import { useMemo, useState } from "react";
import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";

const DEFAULT_CHAIN_ID = "11155111"; // Sepolia
const DEFAULT_STEP = "1";
const DEFAULT_MIN_TIER = "B" as const;
const DEFAULT_DEADLINE_SECONDS = 30 * 60;

type Tier = "S" | "A" | "B" | "C" | "D";
const TIERS: ReadonlyArray<Tier> = ["S", "A", "B", "C", "D"];

interface Props {
  readonly subjectName: string;
}

interface PermitOk {
  readonly ok: true;
  readonly mode: "signed" | "mock";
  readonly mock: boolean;
  readonly permit: {
    readonly hookData: string;
    readonly signer: string;
    readonly signedAt: number;
    readonly expiresAt: number;
    readonly wallet: string;
    readonly step: string;
    readonly deadline: string;
    readonly hookAddress: string;
    readonly chainId: number;
  };
  readonly evidence: {
    readonly subject: string;
    readonly observedTier: string;
    readonly score_100: number;
    readonly required: string;
  };
}

interface PermitErr {
  readonly ok: false;
  readonly reason: string;
  readonly message?: string;
  readonly observed?: string;
  readonly required?: string;
}

type PermitResult = PermitOk | PermitErr;
type FlowState =
  | { kind: "idle" }
  | { kind: "fetching" }
  | { kind: "result"; data: PermitResult };

export function UmiaPermitSection({ subjectName }: Props): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const { address, isConnected } = useAccount();

  const [hookAddress, setHookAddress] = useState("");
  const [chainId, setChainId] = useState(DEFAULT_CHAIN_ID);
  const [step, setStep] = useState(DEFAULT_STEP);
  const [minTier, setMinTier] = useState<Tier>(DEFAULT_MIN_TIER);
  const [controllerCheck, setControllerCheck] = useState(true);
  const [flow, setFlow] = useState<FlowState>({ kind: "idle" });

  const formValid = useMemo(() => {
    if (!isConnected || !address) return false;
    if (!/^0x[a-fA-F0-9]{40}$/.test(hookAddress.trim())) return false;
    if (!/^\d+$/.test(chainId.trim())) return false;
    if (!/^\d+$/.test(step.trim())) return false;
    return true;
  }, [isConnected, address, hookAddress, chainId, step]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!formValid || !address) return;
    setFlow({ kind: "fetching" });
    const deadline = Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS;
    const params = new URLSearchParams({
      subject: subjectName,
      wallet: address,
      step: step.trim(),
      minTier,
      hookAddress: hookAddress.trim(),
      chainId: chainId.trim(),
      deadline: String(deadline),
      controllerCheck: controllerCheck ? "true" : "false",
    });
    try {
      const res = await fetch(`/api/umia/permit?${params.toString()}`);
      const data = (await res.json()) as PermitResult;
      setFlow({ kind: "result", data });
    } catch (err) {
      setFlow({
        kind: "result",
        data: {
          ok: false,
          reason: "network_error",
          message: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  function copyHookData(hookData: string): void {
    void navigator.clipboard.writeText(hookData);
  }

  return (
    <section
      data-section="umia-permit"
      data-expanded={expanded ? "true" : "false"}
      aria-label="Mint Umia bid permit"
      className="border border-border bg-surface"
    >
      <header
        className="flex flex-col gap-1"
        style={{
          padding: "16px 20px",
          borderBottom: expanded ? "1px solid var(--color-border)" : "none",
        }}
      >
        <span
          className="font-mono uppercase text-t3"
          style={{ fontSize: "10px", letterSpacing: "0.18em" }}
        >
          Mint Umia bid permit · UmiaValidationHook EIP-712 ServerPermit
        </span>
        <h2
          className="font-display text-t1"
          style={{ fontSize: "20px", fontWeight: 700, lineHeight: 1.2 }}
        >
          Bench score → Tailored Auction step gate
        </h2>
        <p
          className="text-t2"
          style={{
            fontSize: "12px",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
          }}
        >
          A Tailored Auction founder gates a step on Bench tier ≥ X. A bidder
          who controls this subject ENS mints a permit here, then drops the
          returned <code className="font-mono">hookData</code> into their bid.
          The on-chain hook recovers our signer and admits the bid.
        </p>
        <div className="flex items-center justify-end">
          <button
            type="button"
            data-action="toggle-umia-permit"
            onClick={() => setExpanded((v) => !v)}
            className="border border-t1 px-3 py-1 font-mono text-t1 hover:bg-bg"
            style={{
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {expanded ? "Collapse" : "Mint bid permit"}
          </button>
        </div>
      </header>

      {expanded ? (
        <div
          data-section="umia-permit-form"
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            fontFamily: "var(--font-mono)",
          }}
        >
          {!isConnected ? (
            <div data-state="disconnected">
              <p
                className="text-t2"
                style={{ fontSize: "12px", marginBottom: "10px" }}
              >
                Connect the wallet that controls{" "}
                <code className="font-mono text-t1">{subjectName}</code> to
                mint a permit.
              </p>
              <ConnectKitButton />
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <Field label="Subject (locked)">
                <input
                  type="text"
                  value={subjectName}
                  readOnly
                  className="font-mono"
                  style={inputStyle({ locked: true })}
                />
              </Field>

              <Field label="Wallet (from connected account, locked)">
                <input
                  type="text"
                  value={address ?? ""}
                  readOnly
                  className="font-mono"
                  style={inputStyle({ locked: true })}
                />
              </Field>

              <Field label="UmiaValidationHook address *">
                <input
                  type="text"
                  value={hookAddress}
                  onChange={(e) => setHookAddress(e.target.value)}
                  placeholder="0x…"
                  className="font-mono"
                  style={inputStyle({ locked: false })}
                />
              </Field>

              <div style={{ display: "flex", gap: "12px" }}>
                <Field label="Chain ID *">
                  <input
                    type="text"
                    value={chainId}
                    onChange={(e) => setChainId(e.target.value)}
                    className="font-mono"
                    style={inputStyle({ locked: false })}
                  />
                </Field>
                <Field label="Step *">
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => setStep(e.target.value)}
                    className="font-mono"
                    style={inputStyle({ locked: false })}
                  />
                </Field>
                <Field label="Required tier *">
                  <select
                    value={minTier}
                    onChange={(e) => setMinTier(e.target.value as Tier)}
                    className="font-mono"
                    style={inputStyle({ locked: false })}
                  >
                    {TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <label
                className="text-t2"
                style={{
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <input
                  type="checkbox"
                  checked={controllerCheck}
                  onChange={(e) => setControllerCheck(e.target.checked)}
                />
                Enforce controller check (require addr({subjectName}) ==
                wallet) — uncheck for testing only
              </label>

              <button
                type="submit"
                disabled={!formValid || flow.kind === "fetching"}
                className="border px-3 py-2 font-mono"
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  borderColor: formValid
                    ? "var(--color-t1)"
                    : "var(--color-border)",
                  color: formValid ? "var(--color-t1)" : "var(--color-t3)",
                  background: formValid ? "var(--color-bg)" : "transparent",
                  cursor:
                    formValid && flow.kind !== "fetching"
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {flow.kind === "fetching"
                  ? "Minting permit…"
                  : "Mint bid permit"}
              </button>
            </form>
          )}

          {flow.kind === "result" ? (
            <ResultPanel
              data={flow.data}
              onCopy={copyHookData}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ResultPanel({
  data,
  onCopy,
}: {
  data: PermitResult;
  onCopy: (s: string) => void;
}): React.JSX.Element {
  if (!data.ok) {
    return (
      <div
        data-state="permit-error"
        style={{
          background: "var(--color-bg)",
          border: "1px solid var(--color-verdict-siren, #c33)",
          padding: "10px 14px",
          fontSize: "11px",
          lineHeight: 1.5,
        }}
      >
        <div
          className="font-mono uppercase text-t3"
          style={{
            fontSize: "10px",
            letterSpacing: "0.18em",
            marginBottom: "6px",
          }}
        >
          Permit denied · {data.reason}
        </div>
        {data.message ? (
          <div className="text-t2">{data.message}</div>
        ) : null}
        {data.observed && data.required ? (
          <div className="text-t1" style={{ marginTop: "6px" }}>
            Observed tier <code className="font-mono">{data.observed}</code>{" "}
            &lt; required tier{" "}
            <code className="font-mono">{data.required}</code>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      data-state="permit-ok"
      style={{
        background: "var(--color-bg)",
        border: "1px solid var(--color-verdict-safe, #4a4)",
        padding: "12px 14px",
        fontSize: "11px",
        lineHeight: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="font-mono uppercase text-t3"
          style={{ fontSize: "10px", letterSpacing: "0.18em" }}
        >
          Permit issued · {data.mode}
          {data.mock ? " (mock: true)" : ""}
        </span>
        <span
          className="font-mono text-t2"
          style={{ fontSize: "10px" }}
        >
          tier {data.evidence.observedTier} (score {data.evidence.score_100})
          ≥ required {data.evidence.required}
        </span>
      </div>
      <div>
        <div
          className="font-mono uppercase text-t3"
          style={{
            fontSize: "10px",
            letterSpacing: "0.18em",
            marginBottom: "4px",
          }}
        >
          hookData
        </div>
        <textarea
          readOnly
          value={data.permit.hookData}
          rows={4}
          className="font-mono"
          style={{
            width: "100%",
            padding: "6px 8px",
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-t1)",
            fontSize: "10px",
            wordBreak: "break-all",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            data-action="copy-hookdata"
            onClick={() => onCopy(data.permit.hookData)}
            className="border border-border px-2 py-1 font-mono text-t2 hover:border-t1 hover:text-t1"
            style={{
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginTop: "4px",
            }}
          >
            Copy
          </button>
        </div>
      </div>
      <ul
        className="m-0 list-none p-0 font-mono"
        style={{ fontSize: "10px", lineHeight: 1.6, color: "var(--color-t2)" }}
      >
        <li>
          signer: <code>{data.permit.signer}</code>
        </li>
        <li>
          hookAddress: <code>{data.permit.hookAddress}</code>
        </li>
        <li>
          chainId: <code>{data.permit.chainId}</code>
        </li>
        <li>
          step: <code>{data.permit.step}</code>
        </li>
        <li>
          deadline (unix): <code>{data.permit.deadline}</code>
          {" · "}
          {Math.max(
            0,
            data.permit.expiresAt - Math.floor(Date.now() / 1000),
          )}
          s remaining
        </li>
      </ul>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
      <span
        className="text-t1"
        style={{ fontSize: "11px", letterSpacing: "0.04em" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function inputStyle({ locked }: { locked: boolean }): React.CSSProperties {
  return {
    width: "100%",
    padding: "6px 8px",
    border: "1px solid var(--color-border)",
    background: locked ? "var(--color-bg)" : "var(--color-surface)",
    color: locked ? "var(--color-t2)" : "var(--color-t1)",
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
  };
}
