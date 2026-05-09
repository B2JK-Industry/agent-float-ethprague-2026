import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EnsLookupForm } from "./EnsLookupForm";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("EnsLookupForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("navigates to /lookup/<encoded-name> on valid submit (mode-detection per US-131)", async () => {
    const user = userEvent.setup();
    render(<EnsLookupForm />);

    await user.type(
      screen.getByLabelText(/ENS name/i),
      "vault.demo.upgradesiren.eth",
    );
    await user.click(screen.getByRole("button", { name: /look up/i }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith(
      "/lookup/vault.demo.upgradesiren.eth",
    );
  });

  it("shows inline error and does not navigate when input has no dot", async () => {
    const user = userEvent.setup();
    render(<EnsLookupForm />);

    await user.type(screen.getByLabelText(/ENS name/i), "invalidname");
    await user.click(screen.getByRole("button", { name: /look up/i }));

    expect(pushMock).not.toHaveBeenCalled();
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toMatch(/must contain a dot/i);
  });

  it("clears the error after the user starts editing again", async () => {
    const user = userEvent.setup();
    render(<EnsLookupForm />);
    const input = screen.getByLabelText(/ENS name/i);

    await user.type(input, "invalidname");
    await user.click(screen.getByRole("button", { name: /look up/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.type(input, ".eth");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
