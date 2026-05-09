import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EmptyStateNoRecords } from "./EmptyStateNoRecords";
import { ErrorStateRpc } from "./ErrorStateRpc";
import { ErrorStateSourcify } from "./ErrorStateSourcify";
import { ErrorStateMalformedManifest } from "./ErrorStateMalformedManifest";
import { ErrorStateUnsignedReport } from "./ErrorStateUnsignedReport";

describe("EmptyStateNoRecords", () => {
  it("renders public-read CTA pointing at /r/<encoded-name>?mode=public-read", () => {
    render(<EmptyStateNoRecords name="aave.eth" />);
    const cta = screen.getByRole("link", { name: /continue with public-read/i });
    expect(cta).toHaveAttribute("href", "/r/aave.eth?mode=public-read");
    expect(cta.getAttribute("data-cta")).toBe("public-read");
  });

  it("encodes special characters in the ENS name on the CTA href", () => {
    render(<EmptyStateNoRecords name="weird name.eth" />);
    expect(
      screen.getByRole("link", { name: /continue with public-read/i }),
    ).toHaveAttribute("href", "/r/weird%20name.eth?mode=public-read");
  });

  it("data-state attribute identifies the empty-records branch", () => {
    render(<EmptyStateNoRecords name="aave.eth" />);
    expect(
      screen.getByRole("region").getAttribute("data-state"),
    ).toBe("empty-no-records");
  });
});

describe("ErrorStateRpc", () => {
  it("renders an alert with retry button and /health link", () => {
    render(<ErrorStateRpc />);
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-state")).toBe("error-rpc");
    expect(
      screen.getByRole("button", { name: /retry/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /check \/health/i }),
    ).toHaveAttribute("href", "/health");
  });

  it("invokes the onRetry callback when supplied", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorStateRpc onRetry={onRetry} />);
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("surfaces the cached-verdict timestamp when provided", () => {
    render(<ErrorStateRpc cachedAt="2026-05-09T14:32Z" />);
    expect(
      screen.getByRole("alert").textContent,
    ).toMatch(/cached verdict from 2026-05-09T14:32Z/i);
  });

  it("surfaces the provider name in the eyebrow when provided", () => {
    render(<ErrorStateRpc provider="Alchemy" />);
    expect(
      screen.getByRole("alert").textContent,
    ).toMatch(/Alchemy/);
  });
});

describe("ErrorStateSourcify", () => {
  it("renders an alert with the bytecode-only fallback message and 503 status", () => {
    render(<ErrorStateSourcify status={503} />);
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-state")).toBe("error-sourcify");
    expect(alert.textContent).toMatch(/Sourcify · 503/);
    expect(alert.textContent).toMatch(/bytecode-only diff/i);
  });

  it("renders without a numeric status (falls back to 'unavailable')", () => {
    render(<ErrorStateSourcify />);
    expect(
      screen.getByRole("alert").textContent,
    ).toMatch(/Sourcify · unavailable/);
  });

  it("renders a cached-evidence note when cachedAt is provided", () => {
    render(<ErrorStateSourcify status={429} cachedAt="2026-05-09T14:00Z" />);
    expect(
      screen.getByRole("alert").textContent,
    ).toMatch(/cached evidence from 2026-05-09T14:00Z/i);
  });
});

describe("ErrorStateMalformedManifest", () => {
  it("renders the alert with the parser reason in the eyebrow", () => {
    render(
      <ErrorStateMalformedManifest
        raw='{"schema": "upgrade-siren-manifest@1"'
        reason="invalid JSON at line 1"
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-state")).toBe("error-malformed-manifest");
    expect(alert.textContent).toMatch(/invalid JSON at line 1/);
  });

  it("renders the raw manifest content in a collapsible details block", () => {
    const raw = '{"chainId":11155111,"proxy":"0xBROKEN}';
    render(
      <ErrorStateMalformedManifest
        raw={raw}
        reason="unexpected end of input"
      />,
    );
    expect(
      screen.getByTestId("malformed-manifest-raw").textContent,
    ).toBe(raw);
  });
});

describe("ErrorStateUnsignedReport", () => {
  it("locks the verdict to SIREN and tags the alert accordingly", () => {
    render(
      <ErrorStateUnsignedReport name="vault.upgrade-siren-demo.eth" />,
    );
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-state")).toBe("error-unsigned-report");
    expect(alert.getAttribute("data-verdict")).toBe("SIREN");
    expect(alert.textContent).toMatch(/SIREN/);
    expect(alert.textContent).toMatch(/no operator signature/i);
  });

  it("renders the owner address when provided", () => {
    const owner = "0x747E453F13B5B14313E25393Eb443fbAaA250cfC";
    render(
      <ErrorStateUnsignedReport
        name="vault.upgrade-siren-demo.eth"
        owner={owner}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(owner);
  });

  it("falls back to the upgrade-siren:owner literal when no owner address is supplied", () => {
    render(<ErrorStateUnsignedReport name="vault.upgrade-siren-demo.eth" />);
    expect(
      screen.getByRole("alert").textContent,
    ).toMatch(/upgrade-siren:owner/);
  });

  it("includes the contract-may-still-be-safe disclaimer", () => {
    render(<ErrorStateUnsignedReport name="vault.upgrade-siren-demo.eth" />);
    expect(
      screen.getByRole("alert").textContent,
    ).toMatch(/not a contract-content failure/i);
  });
});
