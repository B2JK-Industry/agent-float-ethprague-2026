import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { MockBadge } from "./MockBadge";

describe("MockBadge", () => {
  it("renders nothing when visible is false", () => {
    const { container } = render(<MockBadge visible={false} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByLabelText("Mock data path")).not.toBeInTheDocument();
  });

  it("renders the default MOCK label when visible", () => {
    render(<MockBadge visible={true} />);
    const badge = screen.getByLabelText("Mock data path");
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe("MOCK");
    expect(badge.getAttribute("data-mock")).toBe("true");
  });

  it("renders a custom label when one is provided", () => {
    render(<MockBadge visible={true} label="DEMO" />);
    expect(screen.getByLabelText("Mock data path").textContent).toBe("DEMO");
  });
});
