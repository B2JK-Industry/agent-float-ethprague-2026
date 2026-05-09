import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PublicReadInput } from "./PublicReadInput";

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

const VALID_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";

describe("PublicReadInput", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("navigates to /r/<address>?mode=public-read for a 0x hex address", async () => {
    const user = userEvent.setup();
    render(<PublicReadInput />);

    await user.type(screen.getByLabelText(/address or ens/i), VALID_ADDRESS);
    await user.click(screen.getByRole("button", { name: /read public/i }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith(
      `/r/${VALID_ADDRESS}?mode=public-read`,
    );
  });

  it("navigates to /r/<name>?mode=public-read for an ENS name", async () => {
    const user = userEvent.setup();
    render(<PublicReadInput />);

    await user.type(screen.getByLabelText(/address or ens/i), "aave.eth");
    await user.click(screen.getByRole("button", { name: /read public/i }));

    expect(pushMock).toHaveBeenCalledWith("/r/aave.eth?mode=public-read");
  });

  it("rejects strings that are neither hex address nor ENS name", async () => {
    const user = userEvent.setup();
    render(<PublicReadInput />);

    await user.type(screen.getByLabelText(/address or ens/i), "notvalid");
    await user.click(screen.getByRole("button", { name: /read public/i }));

    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(
      /0x-prefixed|ENS name/i,
    );
  });

  it("rejects a hex string that is too short", async () => {
    const user = userEvent.setup();
    render(<PublicReadInput />);

    await user.type(
      screen.getByLabelText(/address or ens/i),
      "0xabc",
    );
    await user.click(screen.getByRole("button", { name: /read public/i }));

    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
