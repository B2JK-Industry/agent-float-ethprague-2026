import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GovernanceComment } from "./GovernanceComment";
import {
  shortTemplate,
  forumTemplate,
  voteReasonTemplate,
  SHORT_MAX_CHARS,
  VOTE_REASON_MAX_CHARS,
} from "../lib/governanceTemplates";
import type { SirenReport } from "@upgrade-siren/shared";

const REPORT_URL = "https://reports.upgradesiren.app/vault.json";
const NAME = "vault.demo.upgradesiren.eth";

function reportFixture(overrides: Partial<SirenReport> = {}): SirenReport {
  return {
    schema: "siren-report@1",
    name: NAME,
    chainId: 11155111,
    proxy: "0x1111111111111111111111111111111111111111",
    previousImplementation: "0x2222222222222222222222222222222222222222",
    currentImplementation: "0x3333333333333333333333333333333333333333",
    verdict: "SIREN",
    summary:
      "Current implementation is unverified on Sourcify and adds a sweep() selector that drains the vault.",
    findings: [
      {
        id: "F-1",
        severity: "critical",
        title: "Unverified current implementation",
        evidence: { sourcify: "no-match" },
      },
      {
        id: "F-2",
        severity: "critical",
        title: "New sweep() selector exposes treasury",
        evidence: { selector: "0x01ffc9a7" },
      },
      {
        id: "F-3",
        severity: "warning",
        title: "Storage layout extends previous V1 (compatible append)",
        evidence: { tag: "compatible_appended_only" },
      },
      {
        id: "F-4",
        severity: "info",
        title: "ENS manifest hash chain valid",
        evidence: { previousManifestHash: "0xabc" },
      },
    ],
    sourcify: {
      previousVerified: true,
      currentVerified: false,
      links: [],
    },
    mode: "signed-manifest",
    confidence: "operator-signed",
    ens: {
      recordsResolvedLive: true,
      manifestHash:
        "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1",
      owner: "0xowner000000000000000000000000000000000000",
    },
    auth: {
      status: "valid",
      signatureType: "EIP-712",
      signer: "0xowner000000000000000000000000000000000000",
      signature: "0xdeadbeef",
      signedAt: "2026-05-09T12:00:00Z",
    },
    recommendedAction: "reject",
    mock: false,
    generatedAt: "2026-05-09T12:00:00Z",
    ...overrides,
  };
}

describe("governanceTemplates", () => {
  it("short template fits within SHORT_MAX_CHARS and includes the report URL", () => {
    const text = shortTemplate(reportFixture(), NAME, REPORT_URL);
    expect(text.length).toBeLessThanOrEqual(SHORT_MAX_CHARS);
    expect(text).toContain(REPORT_URL);
    expect(text).toMatch(/SIREN/);
  });

  it("preserves the full report URL even when the ENS name is long enough to force clamping (Codex P2 fix)", () => {
    const longName = `${"a".repeat(180)}.upgrade-siren-demo.eth`;
    const text = shortTemplate(reportFixture(), longName, REPORT_URL);
    expect(text.length).toBeLessThanOrEqual(SHORT_MAX_CHARS);
    expect(text).toContain(REPORT_URL);
    expect(text).toMatch(/SIREN/);
    // The clamp lands on the *head*, not the URL.
    expect(text.endsWith(REPORT_URL)).toBe(true);
  });

  it("falls back to a whole-string clamp only when the URL alone exceeds the cap", () => {
    const giantUrl = `https://reports.upgradesiren.app/${"x".repeat(SHORT_MAX_CHARS)}.json`;
    const text = shortTemplate(reportFixture(), NAME, giantUrl);
    expect(text.length).toBeLessThanOrEqual(SHORT_MAX_CHARS);
  });

  it("vote-reason template fits within VOTE_REASON_MAX_CHARS", () => {
    const text = voteReasonTemplate(reportFixture(), NAME);
    expect(text.length).toBeLessThanOrEqual(VOTE_REASON_MAX_CHARS);
    expect(text).toMatch(/SIREN/);
  });

  it("forum template includes the top 3 findings as bullets", () => {
    const text = forumTemplate(reportFixture(), NAME, REPORT_URL);
    const bullets = text.split("\n").filter((line) => line.startsWith("- "));
    expect(bullets).toHaveLength(3);
    expect(bullets[0]).toMatch(/Unverified current implementation/);
    expect(bullets[1]).toMatch(/sweep\(\) selector/);
    expect(bullets[2]).toMatch(/Storage layout/);
    expect(text).toContain(REPORT_URL);
  });

  it("forum template renders 'No specific findings.' when findings is empty", () => {
    const text = forumTemplate(
      reportFixture({ findings: [] }),
      NAME,
      REPORT_URL,
    );
    expect(text).toContain("- No specific findings.");
  });
});

describe("GovernanceComment", () => {
  it("starts in the short format and renders short-template text", () => {
    render(
      <GovernanceComment
        report={reportFixture()}
        name={NAME}
        reportUrl={REPORT_URL}
      />,
    );
    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("data-format")).toBe("short");
    expect(panel.textContent).toBe(
      shortTemplate(reportFixture(), NAME, REPORT_URL),
    );
  });

  it("switches to the forum format when the forum tab is clicked", async () => {
    const user = userEvent.setup();
    render(
      <GovernanceComment
        report={reportFixture()}
        name={NAME}
        reportUrl={REPORT_URL}
      />,
    );
    await user.click(screen.getByRole("tab", { name: /forum/i }));
    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("data-format")).toBe("forum");
    expect(panel.textContent).toContain("Top findings:");
  });

  it("switches to the vote-reason format when the vote-reason tab is clicked", async () => {
    const user = userEvent.setup();
    render(
      <GovernanceComment
        report={reportFixture()}
        name={NAME}
        reportUrl={REPORT_URL}
      />,
    );
    await user.click(screen.getByRole("tab", { name: /vote reason/i }));
    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("data-format")).toBe("vote-reason");
    expect(panel.textContent).toBe(
      voteReasonTemplate(reportFixture(), NAME),
    );
  });

  it("copies the rendered text via navigator.clipboard.writeText", async () => {
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);

    render(
      <GovernanceComment
        report={reportFixture()}
        name={NAME}
        reportUrl={REPORT_URL}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /copy comment to clipboard/i }),
    );
    expect(writeText).toHaveBeenCalledWith(
      shortTemplate(reportFixture(), NAME, REPORT_URL),
    );
    writeText.mockRestore();
  });
});
