import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { AbiDiffRenderer } from "./AbiDiffRenderer";
import type { AbiRiskyDiff } from "@upgrade-siren/evidence";

const EMPTY_DIFF: AbiRiskyDiff = {
  added: [],
  removed: [],
  addedAny: false,
  removedAny: false,
};

const SWEEP_ADDED: AbiRiskyDiff = {
  added: [
    {
      name: "sweep",
      selector: "0x01ffc9a7" as `0x${string}`,
      stateMutability: "nonpayable",
      inputs: ["address"],
    },
  ],
  removed: [],
  addedAny: true,
  removedAny: false,
};

const ADMIN_REMOVED: AbiRiskyDiff = {
  added: [],
  removed: [
    {
      name: "setAdmin",
      selector: "0xdeadbeef" as `0x${string}`,
      stateMutability: "nonpayable",
      inputs: ["address"],
    },
  ],
  addedAny: false,
  removedAny: true,
};

describe("AbiDiffRenderer", () => {
  it("renders 'no ABI changes detected' when both lists are empty (V1 -> V2Safe)", () => {
    render(<AbiDiffRenderer diff={EMPTY_DIFF} />);
    expect(
      screen.getByTestId("abi-diff-empty").textContent,
    ).toMatch(/no ABI changes detected/i);
  });

  it("renders the V1 -> V2Dangerous added sweep selector with risky severity badge", () => {
    render(<AbiDiffRenderer diff={SWEEP_ADDED} />);
    const row = screen
      .getByRole("region", { name: /abi selectors added/i })
      .querySelector('li[data-kind="added"]');
    expect(row).not.toBeNull();
    expect(row?.getAttribute("data-selector")).toBe("0x01ffc9a7");
    expect(row?.textContent).toMatch(/sweep/);
    expect(row?.querySelector('[data-severity="risky"]')?.textContent).toMatch(
      /risky/i,
    );
  });

  it("renders removed risky selectors in the removed section", () => {
    render(<AbiDiffRenderer diff={ADMIN_REMOVED} />);
    expect(
      screen.getByRole("region", { name: /abi selectors removed/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /abi selectors added/i }),
    ).not.toBeInTheDocument();
  });
});
