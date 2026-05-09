import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SignatureStatusBadge } from "./SignatureStatusBadge";
import type { SirenReport } from "@upgrade-siren/shared";

const SIGNER = "0xAbCdef1234567890aBcDef1234567890ABCdef12";

function authFixture(
  overrides: Partial<SirenReport["auth"]> = {},
): SirenReport["auth"] {
  return {
    status: "valid",
    signatureType: "EIP-712",
    signer: SIGNER,
    signature: "0xdeadbeef",
    signedAt: "2026-05-09T12:00:00Z",
    ...overrides,
  };
}

describe("SignatureStatusBadge", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("renders the signed state with truncated signer address and copy affordance", () => {
    render(<SignatureStatusBadge auth={authFixture()} />);
    const badge = screen.getByRole("status");
    expect(badge.getAttribute("data-status")).toBe("signed");
    expect(badge.textContent).toMatch(/0xAbCd…ef12/);
    expect(
      screen.getByRole("button", { name: /copy signer address/i }),
    ).toBeInTheDocument();
  });

  it("renders the unsigned state with the warning glyph", () => {
    render(
      <SignatureStatusBadge
        auth={authFixture({
          status: "unsigned",
          signer: null,
          signature: null,
          signedAt: null,
        })}
      />,
    );
    const badge = screen.getByRole("status");
    expect(badge.getAttribute("data-status")).toBe("unsigned");
    expect(badge.textContent).toMatch(/no operator signature/i);
    expect(
      screen.queryByRole("button", { name: /copy/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the signature-invalid state with the cross glyph", () => {
    render(
      <SignatureStatusBadge
        auth={authFixture({
          status: "invalid",
          signer: SIGNER,
        })}
      />,
    );
    const badge = screen.getByRole("status");
    expect(badge.getAttribute("data-status")).toBe("signature-invalid");
    expect(badge.textContent).toMatch(/signature mismatch/i);
  });

  it("invokes navigator.clipboard.writeText with the full signer when copy is clicked", async () => {
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);

    render(<SignatureStatusBadge auth={authFixture()} />);

    await user.click(
      screen.getByRole("button", { name: /copy signer address/i }),
    );

    expect(writeText).toHaveBeenCalledWith(SIGNER);
    writeText.mockRestore();
  });
});
