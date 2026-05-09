import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { SourcifyDrawer } from "./SourcifyDrawer";

import type {
  SourcifyEntryEvidence,
} from "@upgrade-siren/evidence";

function okEntry(
  overrides: Partial<{
    chainId: number;
    address: `0x${string}`;
    label: string;
    match: "exact_match" | "match" | "not_found";
    isProxy: boolean;
    proxyType: string | null;
    implementations: ReadonlyArray<{
      address: `0x${string}`;
      name: string | null;
    }>;
    compilerVersion: string | null;
    licenses: ReadonlyArray<{ path: string; license: string }> | null;
  }> = {},
): SourcifyEntryEvidence {
  return {
    kind: "ok",
    chainId: overrides.chainId ?? 1,
    address: overrides.address ?? ("0xVAULT" as `0x${string}`),
    label: overrides.label ?? "Demo Vault",
    deep: {
      chainId: overrides.chainId ?? 1,
      address: overrides.address ?? ("0xVAULT" as `0x${string}`),
      match: overrides.match ?? "exact_match",
      creationMatch: overrides.match ?? "exact_match",
      runtimeMatch: overrides.match ?? "exact_match",
      compilation: overrides.compilerVersion
        ? { compilerVersion: overrides.compilerVersion, evmVersion: "paris" }
        : null,
      functionSignatures: null,
      eventSignatures: null,
      licenses: overrides.licenses ?? null,
      userdoc: null,
      devdoc: null,
      proxyResolution:
        overrides.isProxy === undefined
          ? null
          : {
              isProxy: overrides.isProxy,
              proxyType: overrides.proxyType ?? "EIP1967",
              implementations: overrides.implementations ?? [],
            },
    },
    patterns: [],
    licenseCompiler: {} as unknown as SourcifyEntryEvidence extends {
      licenseCompiler: infer LC;
    }
      ? LC
      : never,
  } as unknown as SourcifyEntryEvidence;
}

function errEntry(
  overrides: Partial<{ reason: string; message: string }> = {},
): SourcifyEntryEvidence {
  return {
    kind: "error",
    chainId: 1,
    address: "0xERROR" as `0x${string}`,
    label: "Failed Entry",
    reason: overrides.reason ?? "404",
    message: overrides.message ?? "not found",
  } as SourcifyEntryEvidence;
}

describe("SourcifyDrawer (US-135)", () => {
  it("renders absent state with dashed border when entries is empty", () => {
    const { container } = render(
      <SourcifyDrawer entries={[]} initialOpen />,
    );
    const drawer = container.querySelector(
      '[data-section="sourcify-drawer"]',
    ) as HTMLElement;
    expect(drawer.getAttribute("data-state")).toBe("absent");
    expect(drawer.style.border).toMatch(/dashed/);
    expect(drawer.textContent).toMatch(/declares no sourcify projects/i);
  });

  it("renders entry-count + verified/failed split in summary", () => {
    const { container } = render(
      <SourcifyDrawer
        entries={[okEntry(), okEntry({ address: "0xB" as `0x${string}` }), errEntry()]}
        initialOpen
      />,
    );
    const drawer = container.querySelector(
      '[data-section="sourcify-drawer"]',
    );
    expect(drawer?.getAttribute("data-entry-count")).toBe("3");
    expect(drawer?.textContent).toMatch(/3 entries/i);
    expect(drawer?.textContent).toMatch(/2 verified.*1 failed/i);
  });

  it("each ok entry renders a SOURCIFY tag (v3 §C-11 canonical) + verified trust pill", () => {
    const { container } = render(
      <SourcifyDrawer entries={[okEntry({ match: "exact_match" })]} initialOpen />,
    );
    const article = container.querySelector("[data-entry-index]");
    expect(
      article?.querySelector('[data-field="entry-tag"]')?.textContent,
    ).toBe("SOURCIFY");
    const pill = article?.querySelector('[data-trust-pill]') as HTMLElement;
    expect(pill.getAttribute("data-trust-pill")).toBe("verified");
    expect(pill.getAttribute("data-label")).toBe("× 1.00");
  });

  it("match level 'match' (partial) renders × 0.85 partial trust pill", () => {
    const { container } = render(
      <SourcifyDrawer entries={[okEntry({ match: "match" })]} initialOpen />,
    );
    const pill = container.querySelector("[data-trust-pill]") as HTMLElement;
    expect(pill.getAttribute("data-trust-pill")).toBe("partial");
    expect(pill.getAttribute("data-label")).toBe("× 0.85");
  });

  it("error entry renders INVALID pill (v3 §C-04: multiplier OR INVALID, never both)", () => {
    const { container } = render(
      <SourcifyDrawer
        entries={[errEntry({ reason: "404", message: "not found" })]}
        initialOpen
      />,
    );
    const article = container.querySelector(
      '[data-entry-state="invalid"]',
    );
    const pill = article?.querySelector("[data-trust-pill]") as HTMLElement;
    expect(pill.getAttribute("data-trust-pill")).toBe("invalid");
    expect(pill.getAttribute("data-label")).toBe("INVALID");
    expect(article?.textContent).toMatch(/404/);
    expect(article?.textContent).toMatch(/not found/);
  });

  it("entry address links to the canonical Sourcify lookup URL", () => {
    const { container } = render(
      <SourcifyDrawer
        entries={[okEntry({ address: "0xABC" as `0x${string}` })]}
        initialOpen
      />,
    );
    const link = container.querySelector(
      '[data-field="entry-address"]',
    ) as HTMLAnchorElement;
    expect(link.href).toBe("https://sourcify.dev/#/lookup/0xABC");
  });

  it("renders compiler chip when deep.compilation is present", () => {
    const { container } = render(
      <SourcifyDrawer
        entries={[okEntry({ compilerVersion: "0.8.20+commit.a1b79de6" })]}
        initialOpen
      />,
    );
    const chip = container.querySelector('[data-field="compiler-chip"]');
    expect(chip?.textContent).toMatch(/0\.8\.20/);
    expect(chip?.textContent).toMatch(/paris/i);
  });

  it("proxy entries surface implementation history with chain label", () => {
    const { container } = render(
      <SourcifyDrawer
        entries={[
          okEntry({
            chainId: 11155111,
            isProxy: true,
            proxyType: "EIP1967",
            implementations: [
              { address: "0xIMPL1" as `0x${string}`, name: "VaultV1" },
              { address: "0xIMPL2" as `0x${string}`, name: null },
            ],
          }),
        ]}
        initialOpen
      />,
    );
    const history = container.querySelector(
      '[data-section="impl-history"]',
    );
    expect(history).not.toBeNull();
    expect(history?.textContent).toMatch(/2 impls/);
    expect(history?.querySelectorAll("[data-impl-address]").length).toBe(2);
    expect(history?.textContent).toMatch(/VaultV1/);
    expect(history?.textContent).toMatch(/sepolia/i);
  });

  it("non-proxy entries do NOT render impl-history section", () => {
    const { container } = render(
      <SourcifyDrawer
        entries={[okEntry({ isProxy: false })]}
        initialOpen
      />,
    );
    expect(
      container.querySelector('[data-section="impl-history"]'),
    ).toBeNull();
  });

  it("proxy entries note that storage hygiene aggregator is pending Stream B wiring", () => {
    const { container } = render(
      <SourcifyDrawer
        entries={[
          okEntry({
            isProxy: true,
            implementations: [
              { address: "0xA" as `0x${string}`, name: null },
            ],
          }),
        ]}
        initialOpen
      />,
    );
    expect(
      container.querySelector('[data-field="hygiene-pending"]')?.textContent,
    ).toMatch(/aggregator.*US-119.*not yet wired/i);
  });

  it("each entry renders /lookup/<address> deep-dive link to /r/[name] surface", () => {
    const { container } = render(
      <SourcifyDrawer
        entries={[okEntry({ address: "0xDEEPLINK" as `0x${string}` })]}
        initialOpen
      />,
    );
    const link = container.querySelector(
      '[data-field="r-name-link"]',
    ) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/lookup/0xDEEPLINK");
    expect(link.textContent).toMatch(/per-contract verdict/i);
  });

  it("drawer footer carries 'Sourcify is the only verified seniority source' reminder", () => {
    const { container } = render(
      <SourcifyDrawer entries={[okEntry()]} initialOpen />,
    );
    const meta = container.querySelector('[data-field="drawer-meta"]');
    expect(meta?.textContent).toMatch(
      /only verified seniority source.*× 1\.00/i,
    );
  });

  it("chain label maps mainnet (1) and sepolia (11155111) correctly", () => {
    const { container } = render(
      <SourcifyDrawer
        entries={[
          okEntry({ chainId: 1, address: "0xM" as `0x${string}` }),
          okEntry({ chainId: 11155111, address: "0xS" as `0x${string}` }),
        ]}
        initialOpen
      />,
    );
    expect(
      container
        .querySelectorAll('[data-field="entry-chain"]')[0]
        ?.textContent,
    ).toMatch(/mainnet/i);
    expect(
      container
        .querySelectorAll('[data-field="entry-chain"]')[1]
        ?.textContent,
    ).toMatch(/sepolia/i);
  });
});
