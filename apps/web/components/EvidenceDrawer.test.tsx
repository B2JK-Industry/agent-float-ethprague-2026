import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EvidenceDrawer } from "./EvidenceDrawer";
import type { SirenReport } from "@upgrade-siren/shared";

function reportFixture(overrides: Partial<SirenReport> = {}): SirenReport {
  return {
    schema: "siren-report@1",
    name: "vault.demo.upgradesiren.eth",
    chainId: 11155111,
    proxy: "0x1111111111111111111111111111111111111111",
    previousImplementation: "0x2222222222222222222222222222222222222222",
    currentImplementation: "0x3333333333333333333333333333333333333333",
    verdict: "REVIEW",
    summary: "Upgrade introduces no new risky selectors.",
    findings: [],
    sourcify: {
      previousVerified: true,
      currentVerified: true,
      links: [
        {
          label: "Sourcify (previous)",
          url: "https://sourcify.dev/#/lookup/0x2222222222222222222222222222222222222222",
        },
        {
          label: "Sourcify (current)",
          url: "https://sourcify.dev/#/lookup/0x3333333333333333333333333333333333333333",
        },
      ],
    },
    mode: "signed-manifest",
    confidence: "operator-signed",
    ens: {
      recordsResolvedLive: true,
      manifestHash: "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1",
      owner: "0xowner000000000000000000000000000000000000",
    },
    auth: {
      status: "valid",
      signatureType: "EIP-712",
      signer: "0xowner000000000000000000000000000000000000",
      signature: "0xdeadbeef",
      signedAt: "2026-05-09T12:00:00Z",
    },
    recommendedAction: "review",
    mock: false,
    generatedAt: "2026-05-09T12:00:00Z",
    ...overrides,
  };
}

describe("EvidenceDrawer", () => {
  it("starts closed and toggles open via the trigger button", async () => {
    const user = userEvent.setup();
    render(<EvidenceDrawer report={reportFixture()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /evidence/i }));
    expect(
      screen.getByRole("dialog", { name: /evidence drawer/i }),
    ).toBeInTheDocument();
  });

  it("renders Sourcify links and verification labels when verified", () => {
    render(<EvidenceDrawer report={reportFixture()} initialOpen />);
    expect(
      screen.getByRole("link", { name: /sourcify \(previous\)/i }),
    ).toHaveAttribute("href", expect.stringContaining("0x2222"));
    expect(
      screen.getByRole("link", { name: /sourcify \(current\)/i }),
    ).toHaveAttribute("href", expect.stringContaining("0x3333"));
    expect(
      screen.getByText(/previous: verified.*current: verified/i),
    ).toBeInTheDocument();
  });

  it("falls back to an unverified placeholder when no Sourcify links are present", () => {
    render(
      <EvidenceDrawer
        initialOpen
        report={reportFixture({
          sourcify: {
            previousVerified: null,
            currentVerified: false,
            links: [],
          },
        })}
      />,
    );
    expect(
      screen.getAllByText(/unverified/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows ABI summary counts when provided", () => {
    render(
      <EvidenceDrawer
        initialOpen
        report={reportFixture()}
        abiSummary={{ selectorCount: 12, riskyAddedCount: 1 }}
      />,
    );
    expect(screen.getByText(/12 selectors/)).toBeInTheDocument();
    expect(screen.getByText(/1 risky added/)).toBeInTheDocument();
  });

  it("shows the storage layout tag", () => {
    render(
      <EvidenceDrawer
        initialOpen
        report={reportFixture()}
        storageSummary={{ tag: "incompatible", label: "incompatible_slot_2" }}
      />,
    );
    const tag = screen
      .getByLabelText(/storage layout/i)
      .querySelector("[data-storage-tag]");
    expect(tag?.getAttribute("data-storage-tag")).toBe("incompatible");
    expect(tag?.textContent).toBe("incompatible_slot_2");
  });

  it("falls back to honest 'storage layout not published' when storageSummary is omitted", () => {
    render(<EvidenceDrawer initialOpen report={reportFixture()} />);
    expect(
      screen.getByText(/storage layout not published/i),
    ).toBeInTheDocument();
  });

  it("renders a Download report JSON link when reportUrl is provided", () => {
    render(
      <EvidenceDrawer
        initialOpen
        report={reportFixture()}
        reportUrl="https://reports.upgradesiren.app/vault.json"
      />,
    );
    const link = screen.getByRole("link", { name: /download report json/i });
    expect(link).toHaveAttribute(
      "href",
      "https://reports.upgradesiren.app/vault.json",
    );
  });

  it("closes the drawer when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(<EvidenceDrawer initialOpen report={reportFixture()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
