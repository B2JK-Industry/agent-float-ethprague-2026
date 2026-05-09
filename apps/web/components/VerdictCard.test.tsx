import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { VerdictCard, type VerdictCardProps } from "./VerdictCard";
import type { SirenReport } from "@upgrade-siren/shared";

const SIGNED_AUTH: SirenReport["auth"] = {
  status: "valid",
  signatureType: "EIP-712",
  signer: "0x747E453F13B5B14313E25393Eb443fbAaA250cfC",
  signature: "0xdeadbeef",
  signedAt: "2026-05-09T12:00:00Z",
};

const UNSIGNED_AUTH: SirenReport["auth"] = {
  status: "unsigned",
  signatureType: null,
  signer: null,
  signature: null,
  signedAt: null,
};

function baseProps(
  overrides: Partial<VerdictCardProps> = {},
): VerdictCardProps {
  return {
    verdict: "SAFE",
    name: "vault.upgrade-siren-demo.eth",
    proxy: "0x8391fa804d3755493e3C9D362D49c339C4469388",
    summary: "Implementation matches signed manifest. ABI compatible.",
    auth: SIGNED_AUTH,
    mode: "signed-manifest",
    mock: false,
    ...overrides,
  };
}

describe("VerdictCard", () => {
  it("renders SAFE with the check glyph and the SAFE word", () => {
    render(<VerdictCard {...baseProps({ verdict: "SAFE" })} />);
    const card = screen.getByRole("region");
    expect(card.getAttribute("data-verdict")).toBe("SAFE");
    expect(card.querySelector('[data-glyph="check"]')).not.toBeNull();
    expect(screen.getByTestId("verdict-word").textContent).toBe("SAFE");
  });

  it("renders REVIEW with the bars glyph and the REVIEW word", () => {
    render(<VerdictCard {...baseProps({ verdict: "REVIEW" })} />);
    const card = screen.getByRole("region");
    expect(card.getAttribute("data-verdict")).toBe("REVIEW");
    expect(card.querySelector('[data-glyph="bars"]')).not.toBeNull();
    expect(screen.getByTestId("verdict-word").textContent).toBe("REVIEW");
  });

  it("renders SIREN with the alarm-bar glyph and the SIREN word", () => {
    render(<VerdictCard {...baseProps({ verdict: "SIREN" })} />);
    const card = screen.getByRole("region");
    expect(card.getAttribute("data-verdict")).toBe("SIREN");
    expect(card.querySelector('[data-glyph="alarm-bar"]')).not.toBeNull();
    expect(screen.getByTestId("verdict-word").textContent).toBe("SIREN");
  });

  it("verdict word is the largest text on the card (clamp max 88px)", () => {
    render(<VerdictCard {...baseProps()} />);
    const word = screen.getByTestId("verdict-word");
    // The brand manual says 88px max via clamp(56px,9vw,88px). Asserting the
    // class string here keeps the spec testable without brittle getComputedStyle.
    expect(word.className).toContain("text-[clamp(56px,9vw,88px)]");
    // No other text on the card carries that token.
    const card = screen.getByRole("region");
    const otherLargeText = within(card)
      .queryAllByText(/.+/)
      .filter(
        (el) =>
          el !== word && el.className.includes("text-[clamp(56px,9vw,88px)]"),
      );
    expect(otherLargeText).toHaveLength(0);
  });

  it("embeds SignatureStatusBadge in the badge row (signed state by default)", () => {
    render(<VerdictCard {...baseProps()} />);
    const sigBadge = screen
      .getAllByRole("status")
      .find((el) => el.getAttribute("data-status") !== null);
    expect(sigBadge?.getAttribute("data-status")).toBe("signed");
  });

  it("forwards an unsigned auth state to SignatureStatusBadge", () => {
    render(<VerdictCard {...baseProps({ auth: UNSIGNED_AUTH })} />);
    const sigBadge = screen
      .getAllByRole("status")
      .find((el) => el.getAttribute("data-status") !== null);
    expect(sigBadge?.getAttribute("data-status")).toBe("unsigned");
  });

  it("renders the confidence mode pill matching `mode`", () => {
    const { rerender } = render(
      <VerdictCard {...baseProps({ mode: "signed-manifest" })} />,
    );
    expect(
      screen.getByRole("region").querySelector("[data-mode-pill]")
        ?.getAttribute("data-mode-pill"),
    ).toBe("signed-manifest");

    rerender(<VerdictCard {...baseProps({ mode: "public-read" })} />);
    expect(
      screen.getByRole("region").querySelector("[data-mode-pill]")
        ?.getAttribute("data-mode-pill"),
    ).toBe("public-read");
    expect(
      screen.getByRole("region").querySelector("[data-mode-pill]")
        ?.textContent,
    ).toMatch(/PUBLIC-READ/);

    rerender(<VerdictCard {...baseProps({ mode: "mock" })} />);
    expect(
      screen.getByRole("region").querySelector("[data-mode-pill]")
        ?.getAttribute("data-mode-pill"),
    ).toBe("mock");
  });

  it("renders MockBadge in the corner only when mock=true", () => {
    const { rerender } = render(<VerdictCard {...baseProps({ mock: false })} />);
    expect(
      screen.queryByLabelText("Mock data path"),
    ).not.toBeInTheDocument();

    rerender(<VerdictCard {...baseProps({ mock: true })} />);
    expect(screen.getByLabelText("Mock data path")).toBeInTheDocument();
    expect(screen.getByRole("region").getAttribute("data-mock")).toBe("true");
  });

  it("renders truncated proxy address (6+4) and the full ENS name", () => {
    render(<VerdictCard {...baseProps()} />);
    const card = screen.getByRole("region");
    expect(card.textContent).toMatch(/vault\.upgrade-siren-demo\.eth/);
    expect(card.textContent).toMatch(/0x8391…9388/);
  });

  it("uses the verdict-safe surface + foreground tokens for SAFE state", () => {
    render(<VerdictCard {...baseProps({ verdict: "SAFE" })} />);
    const card = screen.getByRole("region");
    expect(card.className).toContain("bg-verdict-safe-surf");
    expect(card.className).toContain("text-verdict-safe");
    expect(card.className).toContain("border-verdict-safe");
  });

  it("uses the verdict-siren surface + foreground tokens for SIREN state", () => {
    render(<VerdictCard {...baseProps({ verdict: "SIREN" })} />);
    const card = screen.getByRole("region");
    expect(card.className).toContain("bg-verdict-siren-surf");
    expect(card.className).toContain("text-verdict-siren");
    expect(card.className).toContain("border-verdict-siren");
  });
});
