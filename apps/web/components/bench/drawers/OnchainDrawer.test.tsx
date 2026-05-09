import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { OnchainDrawer } from "./OnchainDrawer";

import type {
  OnchainEntryEvidence,
} from "@upgrade-siren/evidence";

function okEntry(
  overrides: Partial<{
    chainId: number;
    nonce: number;
    firstTxBlock: bigint | null;
    firstTxTimestamp: number | null;
    latestBlock: bigint;
    transferCountRecent90d: number | null | undefined;
    transferCountProvider: "alchemy" | "etherscan" | null | undefined;
  }> = {},
): OnchainEntryEvidence {
  return {
    kind: "ok",
    chainId: overrides.chainId ?? 1,
    value: {
      chainId: overrides.chainId ?? 1,
      address:
        ("0xPRIMARY00000000000000000000000000000000" as unknown) as `0x${string}`,
      nonce: overrides.nonce ?? 142,
      firstTxBlock:
        overrides.firstTxBlock === undefined
          ? 14_000_000n
          : overrides.firstTxBlock,
      firstTxTimestamp:
        overrides.firstTxTimestamp === undefined
          ? 1_647_000_000
          : overrides.firstTxTimestamp,
      latestBlock: overrides.latestBlock ?? 19_000_000n,
      transferCountRecent90d: overrides.transferCountRecent90d,
      transferCountProvider: overrides.transferCountProvider,
    },
  } as unknown as OnchainEntryEvidence;
}

function errEntry(
  overrides: Partial<{ chainId: number; reason: string; message: string }> = {},
): OnchainEntryEvidence {
  return {
    kind: "error",
    chainId: overrides.chainId ?? 11155111,
    reason: overrides.reason ?? "rpc_error",
    message: overrides.message ?? "503 from rpc",
  } as unknown as OnchainEntryEvidence;
}

describe("OnchainDrawer (US-137)", () => {
  it("renders absent state with dashed border when entries is empty", () => {
    const { container } = render(
      <OnchainDrawer entries={[]} initialOpen />,
    );
    const drawer = container.querySelector(
      '[data-section="onchain-drawer"]',
    ) as HTMLElement;
    expect(drawer.getAttribute("data-state")).toBe("absent");
    expect(drawer.style.border).toMatch(/dashed/);
    expect(drawer.textContent).toMatch(/no on-chain primary address/i);
  });

  it("renders one card per chain in evidence.onchain order", () => {
    const { container } = render(
      <OnchainDrawer
        entries={[
          okEntry({ chainId: 1 }),
          okEntry({ chainId: 8453 }),
          errEntry({ chainId: 42161, reason: "rpc_error" }),
        ]}
        initialOpen
      />,
    );
    const cards = container.querySelectorAll("[data-chain-id]");
    expect(cards.length).toBe(3);
    expect(cards[0]?.getAttribute("data-chain-id")).toBe("1");
    expect(cards[1]?.getAttribute("data-chain-id")).toBe("8453");
    expect(cards[2]?.getAttribute("data-chain-id")).toBe("42161");
  });

  it("verified chain header carries ✓ glyph + chain name + chainId pill + × 1.00 trust pill", () => {
    const { container } = render(
      <OnchainDrawer entries={[okEntry({ chainId: 1 })]} initialOpen />,
    );
    const card = container.querySelector('[data-chain-id="1"]') as HTMLElement;
    expect(card.getAttribute("data-state")).toBe("verified");
    expect(card.querySelector('[data-field="chain-glyph"]')?.textContent).toBe("✓");
    expect(card.querySelector('[data-field="chain-name"]')?.textContent).toMatch(/Mainnet/);
    expect(card.querySelector('[data-field="chain-id"]')?.textContent).toMatch(/chainId 1/);
    const pill = card.querySelector("[data-trust-pill]") as HTMLElement;
    expect(pill.getAttribute("data-trust-pill")).toBe("verified");
    expect(pill.getAttribute("data-label")).toBe("× 1.00");
  });

  it("rpc_timeout error → degraded state with ⚠ glyph + DEGRADED trust pill (carry-rule §2B)", () => {
    const { container } = render(
      <OnchainDrawer
        entries={[errEntry({ chainId: 1, reason: "rpc_timeout", message: "timeout" })]}
        initialOpen
      />,
    );
    const card = container.querySelector('[data-chain-id="1"]') as HTMLElement;
    expect(card.getAttribute("data-state")).toBe("degraded");
    expect(card.querySelector('[data-field="chain-glyph"]')?.textContent).toBe("⚠");
    const pill = card.querySelector("[data-trust-pill]") as HTMLElement;
    expect(pill.getAttribute("data-trust-pill")).toBe("degraded");
    expect(pill.getAttribute("data-label")).toBe("DEGRADED");
    expect(card.querySelector('[data-field="error-reason"]')?.textContent).toMatch(
      /rpc_timeout/,
    );
    expect(card.querySelector('[data-field="error-message"]')?.textContent).toMatch(
      /timeout/,
    );
  });

  it("non-timeout error → discounted state with ✕ glyph + INVALID trust pill", () => {
    const { container } = render(
      <OnchainDrawer
        entries={[errEntry({ chainId: 1, reason: "rpc_error", message: "503" })]}
        initialOpen
      />,
    );
    const card = container.querySelector('[data-chain-id="1"]') as HTMLElement;
    expect(card.getAttribute("data-state")).toBe("discounted");
    expect(card.querySelector('[data-field="chain-glyph"]')?.textContent).toBe("✕");
    const pill = card.querySelector("[data-trust-pill]") as HTMLElement;
    expect(pill.getAttribute("data-trust-pill")).toBe("discounted");
    expect(pill.getAttribute("data-label")).toBe("INVALID");
  });

  it("renders the nonce as the headline number (display 700, no transition — banned-motion compliant)", () => {
    const { container } = render(
      <OnchainDrawer entries={[okEntry({ nonce: 4096 })]} initialOpen />,
    );
    const nonce = container.querySelector(
      '[data-field="nonce-value"]',
    ) as HTMLElement;
    expect(nonce.textContent).toBe("4096");
    expect(nonce.style.fontFamily).toMatch(/--font-display/);
    expect(nonce.style.fontWeight).toBe("700");
    expect(nonce.style.fontVariantNumeric).toBe("tabular-nums");
    expect(nonce.style.transition).toBe("none");
  });

  it("renders firstTxBlock + age estimate when both present", () => {
    const { container } = render(
      <OnchainDrawer
        entries={[
          okEntry({
            firstTxBlock: 14_000_000n,
            firstTxTimestamp: 1_647_000_000,
          }),
        ]}
        initialOpen
      />,
    );
    const block = container.querySelector('[data-field="first-tx-block"]');
    expect(block?.textContent).toMatch(/block 14000000/);
    expect(
      container.querySelector('[data-field="first-tx-age"]')?.textContent,
    ).toMatch(/\d+(y|mo|d)\s*ago/);
  });

  it("renders 'no outbound txs' when firstTxBlock === null (fresh address)", () => {
    const { container } = render(
      <OnchainDrawer
        entries={[
          okEntry({
            firstTxBlock: null,
            firstTxTimestamp: null,
            nonce: 0,
          }),
        ]}
        initialOpen
      />,
    );
    expect(
      container.querySelector('[data-field="first-tx-empty"]')?.textContent,
    ).toMatch(/no outbound txs/i);
  });

  it("transferCountRecent90d present → renders count + provider label, no missing pill", () => {
    const { container } = render(
      <OnchainDrawer
        entries={[
          okEntry({
            transferCountRecent90d: 412,
            transferCountProvider: "alchemy",
          }),
        ]}
        initialOpen
      />,
    );
    expect(
      container.querySelector('[data-field="transfer-count"]')?.textContent,
    ).toBe("412");
    expect(
      container.querySelector('[data-field="transfer-provider"]')?.textContent,
    ).toMatch(/alchemy/i);
    expect(
      container.querySelector('[data-field="transfer-missing"]'),
    ).toBeNull();
  });

  it("transferCountRecent90d undefined → dashed-border missing pill with carry-rule (·, label, fallback note)", () => {
    const { container } = render(
      <OnchainDrawer
        entries={[
          okEntry({
            transferCountRecent90d: undefined,
            transferCountProvider: undefined,
          }),
        ]}
        initialOpen
      />,
    );
    const missing = container.querySelector(
      '[data-field="transfer-missing"]',
    ) as HTMLElement;
    expect(missing).not.toBeNull();
    expect(missing.style.border).toMatch(/dashed/);
    expect(missing.getAttribute("data-state")).toBe("missing");
    // Carry-rule §2B: dashed border PLUS glyph PLUS label co-present
    // (color is redundancy, not the sole signal).
    expect(missing.textContent).toMatch(/·/);
    expect(
      missing.querySelector('[data-field="transfer-missing-label"]')?.textContent,
    ).toMatch(/indexer absent/i);
    expect(
      missing.querySelector('[data-field="transfer-missing-note"]')?.textContent,
    ).toMatch(/fallback nonce\/cap 1000/i);
  });

  it("transferCountRecent90d explicit null → dashed-border missing pill (regression: not just undefined)", () => {
    const { container } = render(
      <OnchainDrawer
        entries={[okEntry({ transferCountRecent90d: null })]}
        initialOpen
      />,
    );
    expect(
      container.querySelector('[data-field="transfer-missing"]'),
    ).not.toBeNull();
  });

  it("chain name fallback for unknown chainId — 'chain <id>' format", () => {
    const { container } = render(
      <OnchainDrawer
        entries={[okEntry({ chainId: 999_999 })]}
        initialOpen
      />,
    );
    expect(
      container.querySelector('[data-field="chain-name"]')?.textContent,
    ).toMatch(/chain 999999/);
  });

  it("known chains map to canonical labels (Mainnet / Sepolia / Optimism / Base / Arbitrum)", () => {
    const cases: Array<[number, RegExp]> = [
      [1, /Mainnet/i],
      [11155111, /Sepolia/i],
      [10, /Optimism/i],
      [8453, /Base/i],
      [42161, /Arbitrum/i],
    ];
    for (const [chainId, label] of cases) {
      const { container } = render(
        <OnchainDrawer entries={[okEntry({ chainId })]} initialOpen />,
      );
      expect(
        container.querySelector('[data-field="chain-name"]')?.textContent,
      ).toMatch(label);
    }
  });

  it("drawer footer carries trust-discount lineage copy (RPC truth × 1.00)", () => {
    const { container } = render(
      <OnchainDrawer entries={[okEntry()]} initialOpen />,
    );
    const meta = container.querySelector('[data-field="drawer-meta"]');
    expect(meta?.textContent).toMatch(/rpc truth.*× 1\.00/i);
    expect(meta?.textContent).toMatch(/US-115b indexer keys/i);
  });

  it("summary surfaces ok / failed counts (e.g. '2 verified · 1 failed')", () => {
    const { container } = render(
      <OnchainDrawer
        entries={[okEntry({ chainId: 1 }), okEntry({ chainId: 11155111 }), errEntry()]}
        initialOpen
      />,
    );
    const drawer = container.querySelector(
      '[data-section="onchain-drawer"]',
    );
    expect(drawer?.getAttribute("data-entry-count")).toBe("3");
    expect(drawer?.textContent).toMatch(/2 verified.*1 failed/i);
  });
});
