import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import {
  SourceDiffRenderer,
  type SourceDiff,
} from "./SourceDiffRenderer";

const SWEEP_DIFF: SourceDiff = {
  files: [
    {
      path: "contracts/VaultV2Dangerous.sol",
      hunks: [
        {
          oldStart: 12,
          oldLines: 4,
          newStart: 12,
          newLines: 8,
          header: "function withdraw(address to, uint256 amount)",
          lines: [
            {
              kind: "context",
              content: "    function withdraw(address to, uint256 amount) external onlyOwner {",
              oldLineNo: 12,
              newLineNo: 12,
            },
            {
              kind: "remove",
              content: "        require(amount <= balance, \"insufficient\");",
              oldLineNo: 13,
            },
            {
              kind: "add",
              content: "        // amount cap removed in V2Dangerous",
              newLineNo: 13,
            },
            {
              kind: "add",
              content: "    }",
              newLineNo: 14,
            },
            {
              kind: "add",
              content: "",
              newLineNo: 15,
            },
            {
              kind: "add",
              content: "    function sweep(address payable to) external onlyOwner {",
              newLineNo: 16,
            },
            {
              kind: "add",
              content: "        to.transfer(address(this).balance);",
              newLineNo: 17,
            },
          ],
        },
      ],
      additionsCount: 5,
      deletionsCount: 1,
    },
  ],
};

const NO_DIFF: SourceDiff = { files: [] };

const RENAMED_FILE: SourceDiff = {
  files: [
    {
      path: "contracts/VaultV2Safe.sol",
      previousPath: "contracts/VaultV1.sol",
      hunks: [],
      additionsCount: 0,
      deletionsCount: 0,
    },
  ],
};

describe("SourceDiffRenderer", () => {
  it("renders the empty state when diff.files is empty", () => {
    render(<SourceDiffRenderer diff={NO_DIFF} />);
    expect(screen.getByTestId("source-diff-empty")).toBeInTheDocument();
  });

  it("renders one collapsible <details> per file with file-header badges", () => {
    render(<SourceDiffRenderer diff={SWEEP_DIFF} />);
    const file = screen
      .getByRole("region", { name: /source diff/i })
      .querySelector('details[data-file="contracts/VaultV2Dangerous.sol"]');
    expect(file).not.toBeNull();
    const additions = file?.querySelector('[data-badge="additions"]');
    const deletions = file?.querySelector('[data-badge="deletions"]');
    const hunks = file?.querySelector('[data-badge="hunks"]');
    expect(additions?.textContent).toBe("+5");
    expect(deletions?.textContent).toBe("−1");
    expect(hunks?.textContent).toMatch(/^1 hunk$/);
  });

  it("renders renamed-file annotation when previousPath is present", () => {
    render(<SourceDiffRenderer diff={RENAMED_FILE} />);
    const summary = screen
      .getByRole("region", { name: /source diff/i })
      .querySelector('details[data-file="contracts/VaultV2Safe.sol"] summary');
    expect(summary?.textContent).toMatch(/renamed from contracts\/VaultV1\.sol/);
  });

  it("renders add lines with the verdict-safe surface and remove lines with the verdict-siren surface", () => {
    render(
      <SourceDiffRenderer
        diff={SWEEP_DIFF}
        defaultOpenFiles={new Set(["contracts/VaultV2Dangerous.sol"])}
      />,
    );
    const fileRow = screen
      .getByRole("region", { name: /source diff/i })
      .querySelector("details[data-file]") as HTMLElement;

    const adds = fileRow.querySelectorAll('[data-line-kind="add"]');
    const removes = fileRow.querySelectorAll('[data-line-kind="remove"]');
    const ctx = fileRow.querySelectorAll('[data-line-kind="context"]');

    expect(adds.length).toBe(5);
    expect(removes.length).toBe(1);
    expect(ctx.length).toBe(1);

    for (const row of Array.from(adds)) {
      expect(row.className).toContain("bg-verdict-safe");
      expect(row.className).toContain("text-verdict-safe-surf");
      // sanity: must not be the dark surf tint background
      expect(row.className).not.toContain("bg-verdict-safe-surf");
    }
    for (const row of Array.from(removes)) {
      expect(row.className).toContain("bg-verdict-siren");
      expect(row.className).toContain("text-verdict-siren-surf");
      expect(row.className).not.toContain("bg-verdict-siren-surf");
    }
  });

  it("renders the hunk header line in @@ ... @@ form with the optional section header", () => {
    render(
      <SourceDiffRenderer
        diff={SWEEP_DIFF}
        defaultOpenFiles={new Set(["contracts/VaultV2Dangerous.sol"])}
      />,
    );
    const fileRow = screen
      .getByRole("region", { name: /source diff/i })
      .querySelector("details[data-file]") as HTMLElement;
    const hunk = fileRow.querySelector("[data-hunk]");
    expect(hunk?.textContent).toMatch(/@@ -12,4 \+12,8 @@/);
    expect(hunk?.textContent).toMatch(/function withdraw\(address to, uint256 amount\)/);
  });

  it("respects defaultOpenFiles by setting <details open>", () => {
    render(
      <SourceDiffRenderer
        diff={SWEEP_DIFF}
        defaultOpenFiles={new Set(["contracts/VaultV2Dangerous.sol"])}
      />,
    );
    const file = screen
      .getByRole("region", { name: /source diff/i })
      .querySelector(
        'details[data-file="contracts/VaultV2Dangerous.sol"]',
      ) as HTMLDetailsElement;
    expect(file.open).toBe(true);
  });

  it("collapses files that are not in defaultOpenFiles", () => {
    render(<SourceDiffRenderer diff={SWEEP_DIFF} />);
    const file = screen
      .getByRole("region", { name: /source diff/i })
      .querySelector(
        'details[data-file="contracts/VaultV2Dangerous.sol"]',
      ) as HTMLDetailsElement;
    expect(file.open).toBe(false);
  });
});
