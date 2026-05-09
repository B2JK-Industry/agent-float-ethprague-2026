import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EvidenceDrawer } from "./EvidenceDrawer";
import type { BytecodeMatchResult } from "./BytecodeHypothesis";
import type { SourceDiff } from "./SourceDiffRenderer";
import type { SirenReport } from "@upgrade-siren/shared";

const SAMPLE_BYTECODE_MATCH: BytecodeMatchResult = {
  confidence: 1.0,
  hypothesis: "V1-derived",
  matchedSelectors: [
    { name: "deposit", selector: "0xb6b55f25" as `0x${string}` },
    { name: "withdraw", selector: "0x2e1a7d4d" as `0x${string}` },
  ],
  unmatchedSelectors: [],
  storageConstants: {
    eip1967Slot: true,
    initializableNamespace: true,
    ozPatterns: false,
  },
  metadataTrailPresent: false,
};

const SAMPLE_SOURCE_DIFF: SourceDiff = {
  files: [
    {
      path: "contracts/VaultV2Dangerous.sol",
      hunks: [
        {
          oldStart: 1,
          oldLines: 1,
          newStart: 1,
          newLines: 2,
          lines: [
            { kind: "context", content: "pragma solidity ^0.8.20;", oldLineNo: 1, newLineNo: 1 },
            { kind: "add", content: "// new comment", newLineNo: 2 },
          ],
        },
      ],
      additionsCount: 1,
      deletionsCount: 0,
    },
  ],
};

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

  it("renders the Source diff section between ABI and Storage", () => {
    render(<EvidenceDrawer initialOpen report={reportFixture()} />);
    const drawer = screen.getByRole("dialog", { name: /evidence drawer/i });
    const sections = Array.from(
      drawer.querySelectorAll("section[aria-label]"),
    ).map((s) => s.getAttribute("aria-label"));
    const abiIndex = sections.indexOf("ABI summary");
    const sourceIndex = sections.indexOf("Source diff");
    const storageIndex = sections.indexOf("Storage layout");
    expect(abiIndex).toBeGreaterThanOrEqual(0);
    expect(sourceIndex).toBe(abiIndex + 1);
    expect(storageIndex).toBe(sourceIndex + 1);
  });

  it("renders 'no source diff available' when sourceDiff is omitted", () => {
    render(<EvidenceDrawer initialOpen report={reportFixture()} />);
    const section = screen
      .getByRole("dialog", { name: /evidence drawer/i })
      .querySelector('[data-section="source-diff"]');
    expect(section?.textContent).toMatch(/no source diff available/i);
    expect(
      section?.querySelector('button[data-action="toggle-source-diff"]'),
    ).toBeNull();
  });

  it("hides the SourceDiffRenderer behind a 'Show diff' button when sourceDiff is supplied", async () => {
    const user = userEvent.setup();
    render(
      <EvidenceDrawer
        initialOpen
        report={reportFixture()}
        sourceDiff={SAMPLE_SOURCE_DIFF}
      />,
    );
    const toggle = screen.getByRole("button", { name: /show diff/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(
      screen.queryByTestId("source-diff-renderer"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/1 file changed/i)).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toMatch(/hide diff/i);
    expect(screen.getByTestId("source-diff-renderer")).toBeInTheDocument();
  });

  it("renders the BytecodeHypothesis section between Sourcify and ABI when bytecodeMatch is supplied", () => {
    render(
      <EvidenceDrawer
        initialOpen
        report={reportFixture()}
        bytecodeMatch={SAMPLE_BYTECODE_MATCH}
      />,
    );
    const drawer = screen.getByRole("dialog", { name: /evidence drawer/i });
    const sections = Array.from(
      drawer.querySelectorAll("section[aria-label]"),
    ).map((s) => s.getAttribute("aria-label"));
    const sourcifyIndex = sections.indexOf("Sourcify links");
    const hypothesisIndex = sections.indexOf("Bytecode hypothesis");
    const abiIndex = sections.indexOf("ABI summary");
    expect(sourcifyIndex).toBeGreaterThanOrEqual(0);
    expect(hypothesisIndex).toBe(sourcifyIndex + 1);
    expect(abiIndex).toBe(hypothesisIndex + 1);
  });

  it("hides the BytecodeHypothesis section entirely when bytecodeMatch is omitted (no stub layout)", () => {
    render(<EvidenceDrawer initialOpen report={reportFixture()} />);
    expect(
      screen.queryByRole("region", { name: /bytecode hypothesis/i }),
    ).not.toBeInTheDocument();
  });

  it("forwards the BytecodeMatchResult into the rendered hypothesis (data-hypothesis attr)", () => {
    render(
      <EvidenceDrawer
        initialOpen
        report={reportFixture()}
        bytecodeMatch={SAMPLE_BYTECODE_MATCH}
      />,
    );
    const section = screen.getByRole("region", {
      name: /bytecode hypothesis/i,
    });
    expect(section.getAttribute("data-hypothesis")).toBe("V1-derived");
    expect(
      section.querySelector('[data-metadata-trail="missing"]'),
    ).not.toBeNull();
  });
});
