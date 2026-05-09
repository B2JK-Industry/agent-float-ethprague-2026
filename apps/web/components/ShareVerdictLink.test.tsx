import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ShareVerdictLink, buildShareUrl } from "./ShareVerdictLink";

const NAME = "vault.upgrade-siren-demo.eth";
const TIMESTAMP = "2026-05-09T12:00:00Z";

describe("buildShareUrl", () => {
  it("builds a path-only URL when origin is omitted", () => {
    expect(buildShareUrl(NAME, "SAFE", TIMESTAMP)).toBe(
      `/r/${NAME}?v=SAFE&t=${encodeURIComponent(TIMESTAMP)}`,
    );
  });

  it("builds an absolute URL when origin is supplied", () => {
    expect(buildShareUrl(NAME, "SIREN", TIMESTAMP, "https://upgradesiren.app")).toBe(
      `https://upgradesiren.app/r/${NAME}?v=SIREN&t=${encodeURIComponent(TIMESTAMP)}`,
    );
  });

  it("URL-encodes ENS names with characters that need escaping", () => {
    const url = buildShareUrl("weird name.eth", "REVIEW", TIMESTAMP);
    expect(url).toContain("/r/weird%20name.eth");
    expect(url).toContain("v=REVIEW");
  });

  it("URL-encodes the timestamp inside the query string", () => {
    const url = buildShareUrl(NAME, "SAFE", "2026-05-09T12:00:00+02:00");
    // `+` must be percent-encoded in query strings via URLSearchParams.
    expect(url).toContain("t=2026-05-09T12%3A00%3A00%2B02%3A00");
  });
});

describe("ShareVerdictLink", () => {
  it("renders a button labelled 'Share verdict' with verdict + name in the aria-label", () => {
    render(
      <ShareVerdictLink name={NAME} verdict="SIREN" generatedAt={TIMESTAMP} />,
    );
    const button = screen.getByRole("button", {
      name: /copy share url with precomputed siren verdict/i,
    });
    expect(button).toBeInTheDocument();
    expect(button.textContent).toBe("Share verdict");
    expect(button.getAttribute("data-verdict")).toBe("SIREN");
  });

  it("copies the absolute share URL when origin is available", async () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { origin: "https://upgradesiren.app" },
    });
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);

    render(
      <ShareVerdictLink name={NAME} verdict="SAFE" generatedAt={TIMESTAMP} />,
    );
    await user.click(screen.getByRole("button"));

    expect(writeText).toHaveBeenCalledWith(
      `https://upgradesiren.app/r/${NAME}?v=SAFE&t=${encodeURIComponent(TIMESTAMP)}`,
    );
    writeText.mockRestore();
  });

  it("shows 'Copied' label after a successful copy", async () => {
    const user = userEvent.setup();
    vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);

    render(
      <ShareVerdictLink name={NAME} verdict="REVIEW" generatedAt={TIMESTAMP} />,
    );
    const button = screen.getByRole("button");
    await user.click(button);
    expect(button.textContent).toBe("Copied");
  });
});
