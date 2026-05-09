import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { StorageDiffRenderer } from "./StorageDiffRenderer";
import type { StorageDiffResult } from "@upgrade-siren/evidence";

const COMPATIBLE: StorageDiffResult = {
  kind: "compatible_appended_only",
  changes: [],
  appended: [
    { slot: "0x2", offset: 0, type: "uint256", label: "deposits" },
  ],
};

const CHANGED_TYPE: StorageDiffResult = {
  kind: "incompatible_changed_type",
  changes: [
    {
      position: 0,
      previous: { slot: "0x0", offset: 0, type: "uint256", label: "balance" },
      current: { slot: "0x0", offset: 0, type: "address", label: "balance" },
      note: 'slot 0x0 variable "balance" changed type uint256 -> address',
    },
  ],
  appended: [],
};

const REORDERED: StorageDiffResult = {
  kind: "incompatible_reordered",
  changes: [
    {
      position: 0,
      previous: { slot: "0x0", offset: 0, type: "address", label: "owner" },
      current: { slot: "0x1", offset: 0, type: "address", label: "owner" },
      note: 'variable "owner" moved (0x0:0 -> 0x1:0)',
    },
  ],
  appended: [],
};

const INSERTED: StorageDiffResult = {
  kind: "incompatible_inserted_before_existing",
  changes: [
    {
      position: 0,
      previous: { slot: "0x0", offset: 0, type: "uint256", label: "totalSupply" },
      current: { slot: "0x0", offset: 0, type: "address", label: "newField" },
      note: 'inserted "newField" before existing "totalSupply"',
    },
  ],
  appended: [],
};

const UNKNOWN: StorageDiffResult = {
  kind: "unknown_missing_layout",
  changes: [],
  appended: [],
};

describe("StorageDiffRenderer", () => {
  it("renders compatible_appended_only with the safe tone and the appended summary", () => {
    render(<StorageDiffRenderer diff={COMPATIBLE} />);
    const tag = screen
      .getByRole("region", { name: /storage layout/i })
      .querySelector("[data-storage-kind]");
    expect(tag?.getAttribute("data-storage-kind")).toBe(
      "compatible_appended_only",
    );
    expect(tag?.getAttribute("data-tone")).toBe("safe");
    expect(screen.getByText(/1 new slot appended/i)).toBeInTheDocument();
  });

  it("renders incompatible_changed_type with the siren tone and the change row", () => {
    render(<StorageDiffRenderer diff={CHANGED_TYPE} />);
    const tag = screen
      .getByRole("region", { name: /storage layout/i })
      .querySelector("[data-storage-kind]");
    expect(tag?.getAttribute("data-tone")).toBe("siren");
    const table = screen.getByRole("table", { name: /storage layout changes/i });
    expect(table.textContent).toMatch(/uint256 balance/);
    expect(table.textContent).toMatch(/address balance/);
    expect(table.textContent).toMatch(/changed type/);
  });

  it("renders incompatible_reordered with the siren tone", () => {
    render(<StorageDiffRenderer diff={REORDERED} />);
    expect(
      screen
        .getByRole("region", { name: /storage layout/i })
        .querySelector("[data-storage-kind]")
        ?.getAttribute("data-tone"),
    ).toBe("siren");
  });

  it("renders incompatible_inserted_before_existing with the siren tone", () => {
    render(<StorageDiffRenderer diff={INSERTED} />);
    expect(
      screen
        .getByRole("region", { name: /storage layout/i })
        .querySelector("[data-storage-kind]")
        ?.getAttribute("data-tone"),
    ).toBe("siren");
  });

  it("renders unknown_missing_layout honestly with review tone (not safe)", () => {
    render(<StorageDiffRenderer diff={UNKNOWN} />);
    const tag = screen
      .getByRole("region", { name: /storage layout/i })
      .querySelector("[data-storage-kind]");
    expect(tag?.getAttribute("data-tone")).toBe("review");
    expect(tag?.textContent).toMatch(/storage layout not published/i);
    expect(
      screen.getByText(/cannot be asserted/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("table", { name: /storage layout changes/i }),
    ).not.toBeInTheDocument();
  });
});
