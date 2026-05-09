import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EnsRecordsPanel } from "./EnsRecordsPanel";
import type { EnsResolutionResult } from "@upgrade-siren/evidence";

const SIGNED_MANIFEST: EnsResolutionResult = {
  kind: "ok",
  name: "vault.demo.upgradesiren.eth",
  chainId: 11155111,
  records: {
    chainId: "11155111",
    proxy: "0x1111111111111111111111111111111111111111",
    owner: "0xowner000000000000000000000000000000000000",
    schema: "upgrade-siren-manifest@1",
    upgradeManifestRaw: JSON.stringify({
      schema: "upgrade-siren-manifest@1",
      chainId: 11155111,
      proxy: "0x1111111111111111111111111111111111111111",
      previousImpl: "0x2222222222222222222222222222222222222222",
      currentImpl: "0x3333333333333333333333333333333333333333",
      reportUri: "https://reports.upgradesiren.app/vault.json",
      reportHash:
        "0xabababababababababababababababababababababababababababababababab",
      version: 3,
      effectiveFrom: "2026-05-09T12:00:00Z",
      previousManifestHash: null,
    }),
  },
  flags: {
    chainIdPresent: true,
    proxyPresent: true,
    ownerPresent: true,
    schemaPresent: true,
    upgradeManifestPresent: true,
    agentContextPresent: true,
    agentEndpointWebPresent: true,
    agentEndpointMcpPresent: false,
  },
  anyUpgradeSirenRecordPresent: true,
  agentContext: "Upgrade Siren risk report for vault.demo.upgradesiren.eth",
  agentEndpointWeb: "https://upgradesiren.app/r/vault.demo.upgradesiren.eth",
  agentEndpointMcp: null,
};

const PUBLIC_READ: EnsResolutionResult = {
  kind: "ok",
  name: "aave.eth",
  chainId: 1,
  records: {
    chainId: null,
    proxy: null,
    owner: null,
    schema: null,
    upgradeManifestRaw: null,
  },
  flags: {
    chainIdPresent: false,
    proxyPresent: false,
    ownerPresent: false,
    schemaPresent: false,
    upgradeManifestPresent: false,
    agentContextPresent: false,
    agentEndpointWebPresent: false,
    agentEndpointMcpPresent: false,
  },
  anyUpgradeSirenRecordPresent: false,
  agentContext: null,
  agentEndpointWeb: null,
  agentEndpointMcp: null,
};

const ERROR_RESULT: EnsResolutionResult = {
  kind: "error",
  reason: "rpc_error",
  message: "RPC timed out after 5000ms",
};

describe("EnsRecordsPanel", () => {
  it("renders signed-manifest mode with all four stable records present", () => {
    render(<EnsRecordsPanel ens={SIGNED_MANIFEST} />);
    const panel = screen.getByRole("region", { name: /ens records/i });
    expect(panel.getAttribute("data-state")).toBe("signed-manifest");
    expect(
      panel.querySelector('[data-record-key="upgrade-siren:proxy"]')?.getAttribute("data-present"),
    ).toBe("true");
    expect(
      panel.querySelector('[data-record-key="upgrade-siren:owner"]')?.getAttribute("data-present"),
    ).toBe("true");
  });

  it("renders public-read mode with all stable records absent", () => {
    render(<EnsRecordsPanel ens={PUBLIC_READ} />);
    const panel = screen.getByRole("region", { name: /ens records/i });
    expect(panel.getAttribute("data-state")).toBe("public-read");
    const absent = panel.querySelectorAll('[data-state="absent"]');
    expect(absent.length).toBeGreaterThanOrEqual(4);
  });

  it("renders the upgrade_manifest as a collapsed JSON panel that expands on click", async () => {
    const user = userEvent.setup();
    render(<EnsRecordsPanel ens={SIGNED_MANIFEST} />);
    const button = screen.getByRole("button", { name: /upgrade_manifest/i });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    await user.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    const pre = document.getElementById("manifest-json");
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toMatch(/"reportUri"/);
  });

  it("renders the ENSIP-26 sub-section only when at least one ENSIP-26 record is present", () => {
    const { rerender } = render(<EnsRecordsPanel ens={SIGNED_MANIFEST} />);
    expect(
      screen.getByRole("region", { name: /ensip-26 records/i }),
    ).toBeInTheDocument();

    rerender(<EnsRecordsPanel ens={PUBLIC_READ} />);
    expect(
      screen.queryByRole("region", { name: /ensip-26 records/i }),
    ).not.toBeInTheDocument();
  });

  it("renders an error state when ENS resolution fails", () => {
    render(<EnsRecordsPanel ens={ERROR_RESULT} />);
    const panel = screen.getByRole("region", { name: /ens records/i });
    expect(panel.getAttribute("data-state")).toBe("error");
    expect(panel.textContent).toMatch(/rpc_error/);
    expect(panel.textContent).toMatch(/RPC timed out/);
  });
});
