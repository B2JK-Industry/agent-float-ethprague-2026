import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  ImplementationComparison,
  type ImplementationCurrentSide,
  type ImplementationPreviousSide,
} from "./ImplementationComparison";

const PREV: ImplementationPreviousSide = {
  address: "0x2222222222222222222222222222222222222222",
  verified: true,
  sourcifyUrl: "https://sourcify.dev/#/lookup/0x2222",
  deployedAtBlock: 5_000_000,
  changedAt: "2026-04-01T10:00:00Z",
};

const CURR: ImplementationCurrentSide = {
  address: "0x3333333333333333333333333333333333333333",
  verified: false,
  deployedAtBlock: 5_000_900,
  changedAt: "2026-05-09T12:00:00Z",
};

const CURR_VERIFIED_NO_URL: ImplementationCurrentSide = {
  address: "0x4444444444444444444444444444444444444444",
  verified: true,
};

describe("ImplementationComparison", () => {
  it("renders both sides with truncated address and copy button", () => {
    render(<ImplementationComparison previous={PREV} current={CURR} />);
    const previous = screen.getByTestId("impl-previous");
    const current = screen.getByTestId("impl-current");
    expect(previous.textContent).toMatch(/0x2222…2222/);
    expect(current.textContent).toMatch(/0x3333…3333/);
    expect(
      screen.getAllByRole("button", { name: /copy address/i }),
    ).toHaveLength(2);
  });

  it("renders verified status as a Sourcify link, unverified status as red label", () => {
    render(<ImplementationComparison previous={PREV} current={CURR} />);
    const verifiedLink = screen.getByRole("link", { name: /verified on sourcify/i });
    expect(verifiedLink).toHaveAttribute(
      "href",
      "https://sourcify.dev/#/lookup/0x2222",
    );
    const unverified = screen
      .getByTestId("impl-current")
      .querySelector('[data-verification="unverified"]');
    // Layout v2 (Bench v3 polish): glyph + label inline ("× unverified").
    expect(unverified?.textContent).toMatch(/unverified/);
  });

  it("renders 'none' when previous address is null", () => {
    render(
      <ImplementationComparison
        previous={{ address: null }}
        current={CURR}
      />,
    );
    const previous = screen.getByTestId("impl-previous");
    expect(previous.textContent).toMatch(/none/i);
  });

  it("renders 'verification unknown' for the previous side when its verified flag is omitted", () => {
    render(
      <ImplementationComparison
        previous={{ address: PREV.address }}
        current={CURR}
      />,
    );
    const previous = screen.getByTestId("impl-previous");
    expect(
      previous.querySelector('[data-verification="unknown"]')?.textContent,
    ).toMatch(/verification unknown/i);
  });

  it("derives a Sourcify lookup URL for a verified current side that did not ship a pre-baked link (Codex P2 fix)", () => {
    render(
      <ImplementationComparison
        previous={{ address: null }}
        current={CURR_VERIFIED_NO_URL}
      />,
    );
    const link = screen.getByRole("link", { name: /verified on sourcify/i });
    expect(link).toHaveAttribute(
      "href",
      `https://sourcify.dev/#/lookup/${CURR_VERIFIED_NO_URL.address}`,
    );
  });

  it("copies the full untruncated address when copy is clicked", async () => {
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);

    render(<ImplementationComparison previous={PREV} current={CURR} />);

    const buttons = screen.getAllByRole("button", { name: /copy address/i });
    await user.click(buttons[0]);
    expect(writeText).toHaveBeenCalledWith(PREV.address);

    writeText.mockRestore();
  });

  it("uses CSS grid that stacks below md breakpoint (responsive contract)", () => {
    render(<ImplementationComparison previous={PREV} current={CURR} />);
    const section = screen.getByRole("region", { name: /implementation comparison/i });
    expect(section.className).toContain("grid-cols-1");
    expect(section.className).toContain("md:grid-cols-2");
  });
});
