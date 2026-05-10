import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

import type {
  GithubEvidence,
  EnsInternalEvidence,
  MultiSourceEvidence,
  OnchainEntryEvidence,
  ScoreResult,
  SourcifyEntryEvidence,
} from "@upgrade-siren/evidence";

import { UmiaVentureApplySection } from "./UmiaVentureApplySection";

const longDescription =
  "Public ENS-anchored upgrade-risk verdict surface for Ethereum. Sourcify is the proof.";

function makeEvidence(overrides: {
  inferredTexts?: Record<string, string>;
} = {}): MultiSourceEvidence {
  const sourcify: ReadonlyArray<SourcifyEntryEvidence> = [];
  const onchain: ReadonlyArray<OnchainEntryEvidence> = [];
  const github: GithubEvidence = { kind: "absent" };
  const ensInternal: EnsInternalEvidence = { kind: "absent" };
  return {
    subject: {
      name: "siren.eth",
      chainId: 1,
      mode: "public-read",
      primaryAddress: "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01" as `0x${string}`,
      kind: null,
      manifest: null,
      inferredTexts: overrides.inferredTexts ?? {
        "com.github": "B2JK-Industry",
        description: longDescription,
        url: "https://upgrade-siren.vercel.app",
        "org.telegram": "Daniel_Babjak",
      },
    },
    sourcify,
    github,
    onchain,
    ensInternal,
    crossChain: null,
    failures: [],
  };
}

const fakeScore: ScoreResult = {
  score_100: 62,
  tier: "A",
  axes: { seniority: 0.6, relevance: 0.64 },
  ceiling: { applied: false, capLabel: null },
  reason: "ok",
} as unknown as ScoreResult;

describe("UmiaVentureApplySection (canonical schema)", () => {
  it("renders the CTA and expands to a form", () => {
    render(
      <UmiaVentureApplySection evidence={makeEvidence()} score={fakeScore} />,
    );
    const cta = screen.getByRole("button", {
      name: /Prepare Umia application/i,
    });
    expect(cta).toBeTruthy();
    fireEvent.click(cta);
    expect(screen.getByText(/GitHub repositories/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Collapse/i })).toBeTruthy();
  });

  it("ENS-sourced fields render as locked / read-only with source label", () => {
    render(
      <UmiaVentureApplySection evidence={makeEvidence()} score={fakeScore} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Prepare Umia application/i }),
    );

    const desc = document.querySelector(
      'label[data-field="Description (≥ 50 chars)"]',
    );
    expect(desc).toBeTruthy();
    expect(desc?.getAttribute("data-locked")).toBe("true");
    const textarea = desc?.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.readOnly).toBe(true);
    expect(within(desc as HTMLElement).getByText(/from ENS · description/i)).toBeTruthy();
  });

  it("blocks Download CTA when required fields are missing", () => {
    render(
      <UmiaVentureApplySection
        evidence={makeEvidence({ inferredTexts: {} })}
        score={null}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Prepare Umia application/i }),
    );
    const dlBtn = screen.getByRole("button", {
      name: /Fix errors to enable download/i,
    });
    expect(dlBtn.hasAttribute("disabled")).toBe(true);

    const errors = document.querySelector('[data-field="validation-errors"]');
    expect(errors).toBeTruthy();
  });

  it("enables Download CTA after the user fills the missing required fields", () => {
    render(
      <UmiaVentureApplySection evidence={makeEvidence()} score={fakeScore} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Prepare Umia application/i }),
    );

    // Fill pitch
    const pitchLabel = document.querySelector(
      'label[data-field="Pitch (10–500 chars)"]',
    );
    const pitchTextarea = pitchLabel?.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.change(pitchTextarea, {
      target: { value: "Public ENS-anchored verification surface." },
    });

    // Fill at least one github_repository (canonical schema requires
    // owner/repo URL, not the auto-detected org URL).
    const ghLabel = document.querySelector(
      'label[data-field="GitHub repositories (comma-separated owner/repo URLs)"]',
    );
    const ghTextarea = ghLabel?.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.change(ghTextarea, {
      target: {
        value: "https://github.com/B2JK-Industry/Upgrade-Siren-ETHPrague2026",
      },
    });

    // Fill owner contact name (required) — telegram is auto-locked from ENS.
    const contactNameLabel = document.querySelectorAll('label[data-field="Name"]')[1];
    const contactNameInput = contactNameLabel?.querySelector("input") as HTMLInputElement;
    fireEvent.change(contactNameInput, { target: { value: "Daniel Babjak" } });

    // Fill team member name (required).
    const memberNameLabel = document.querySelectorAll('label[data-field="Name"]')[2];
    const memberNameInput = memberNameLabel?.querySelector("input") as HTMLInputElement;
    fireEvent.change(memberNameInput, { target: { value: "Daniel Babjak" } });

    const dlBtn = screen.getByRole("button", {
      name: /Download Umia application JSON/i,
    });
    expect(dlBtn.hasAttribute("disabled")).toBe(false);
    expect(document.querySelector('[data-field="validation-ok"]')).toBeTruthy();
  });

  it("upgrade_siren_report locked block renders subject + score + tier", () => {
    render(
      <UmiaVentureApplySection evidence={makeEvidence()} score={fakeScore} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Prepare Umia application/i }),
    );
    const block = document.querySelector('[data-section="umia-report-ref"]');
    expect(block).toBeTruthy();
    const txt = block?.textContent ?? "";
    expect(txt).toContain("siren.eth");
    expect(txt).toContain("62");
    expect(txt).toContain("A");
  });
});
