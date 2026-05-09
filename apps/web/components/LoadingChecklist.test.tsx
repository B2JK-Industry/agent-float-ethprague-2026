import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { LoadingChecklist, type ChecklistStep } from "./LoadingChecklist";

const ALL_STEPS: ChecklistStep[] = [
  { key: "ens", label: "ENS", status: "success", durationMs: 412 },
  { key: "chain", label: "Chain state", status: "success", durationMs: 320 },
  { key: "sourcify", label: "Sourcify", status: "running" },
  { key: "diff", label: "Diff", status: "pending" },
  { key: "signature", label: "Signature", status: "pending" },
];

describe("LoadingChecklist", () => {
  it("renders one row per step with the step's status as a data attribute", () => {
    render(<LoadingChecklist steps={ALL_STEPS} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(5);
    expect(rows[0].getAttribute("data-status")).toBe("success");
    expect(rows[2].getAttribute("data-status")).toBe("running");
    expect(rows[3].getAttribute("data-status")).toBe("pending");
  });

  it("shows duration in ms for successful steps and omits it for non-success", () => {
    render(<LoadingChecklist steps={ALL_STEPS} />);
    // Layout v2 (Bench v3 polish): "Nms" → "N ms" with thin space for readability.
    expect(screen.getByText("412 ms")).toBeInTheDocument();
    expect(screen.getByText("320 ms")).toBeInTheDocument();
    // Pending and running rows must not render any duration badge.
    const pendingRow = screen
      .getAllByRole("listitem")
      .find((row) => row.getAttribute("data-key") === "diff");
    expect(pendingRow?.textContent).not.toMatch(/\d+\s?ms/);
    const runningRow = screen
      .getAllByRole("listitem")
      .find((row) => row.getAttribute("data-key") === "sourcify");
    expect(runningRow?.textContent).not.toMatch(/\d+\s?ms/);
  });

  it("renders the failure error message inside an alert role", () => {
    const steps: ChecklistStep[] = [
      {
        key: "sourcify",
        label: "Sourcify",
        status: "failure",
        error: "rate limit exceeded",
      },
    ];
    render(<LoadingChecklist steps={steps} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("rate limit exceeded");
  });

  it("re-renders to show updated statuses when props change (drives the under-50ms feel)", () => {
    const initial: ChecklistStep[] = [
      { key: "ens", label: "ENS", status: "running" },
    ];
    const { rerender } = render(<LoadingChecklist steps={initial} />);
    expect(
      screen.getByRole("listitem").getAttribute("data-status"),
    ).toBe("running");

    const next: ChecklistStep[] = [
      { key: "ens", label: "ENS", status: "success", durationMs: 92 },
    ];
    rerender(<LoadingChecklist steps={next} />);
    expect(
      screen.getByRole("listitem").getAttribute("data-status"),
    ).toBe("success");
    expect(screen.getByText("92 ms")).toBeInTheDocument();
  });

  it("uses an accessible label on the list", () => {
    render(<LoadingChecklist steps={ALL_STEPS} />);
    expect(
      screen.getByRole("list", { name: /loading evidence/i }),
    ).toBeInTheDocument();
  });
});
