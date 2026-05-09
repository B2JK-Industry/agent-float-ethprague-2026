import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  ImplementationComparison,
  type ImplementationSide,
} from "./ImplementationComparison";

const PREV: ImplementationSide = {
  address: "0x2222222222222222222222222222222222222222",
  verified: true,
  sourcifyUrl: "https://sourcify.dev/#/lookup/0x2222",
  deployedAtBlock: 5_000_000,
  changedAt: "2026-04-01T10:00:00Z",
};

const CURR: ImplementationSide = {
  address: "0x3333333333333333333333333333333333333333",
  verified: false,
  deployedAtBlock: 5_000_900,
  changedAt: "2026-05-09T12:00:00Z",
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
    expect(unverified?.textContent).toBe("unverified");
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

  it("renders neither verified state honestly when verification is unknown", () => {
    render(
      <ImplementationComparison
        previous={{ address: PREV.address }}
        current={{ address: CURR.address }}
      />,
    );
    const unknowns = screen
      .getAllByText(/verification unknown/i);
    expect(unknowns).toHaveLength(2);
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
