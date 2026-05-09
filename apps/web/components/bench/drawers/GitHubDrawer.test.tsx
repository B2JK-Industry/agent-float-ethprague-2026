import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { GitHubDrawer } from "./GitHubDrawer";

import type {
  GithubEvidence,
  GithubP0Signals,
  GithubRepoP0,
} from "@upgrade-siren/evidence";

function repo(overrides: Partial<GithubRepoP0> = {}): GithubRepoP0 {
  return {
    name: "demo",
    fullName: "owner/demo",
    createdAt: "2025-01-01T00:00:00Z",
    pushedAt: "2026-05-01T00:00:00Z",
    archived: false,
    defaultBranch: "main",
    license: "MIT",
    topics: [],
    hasTestDir: true,
    hasSubstantialReadme: true,
    readmeBytes: 1200,
    hasLicense: true,
    fetchStatus: "ok",
    ciRuns: { successful: 46, total: 50 },
    bugIssues: { closed: 7, total: 9 },
    releasesLast12m: 6,
    hasSecurity: true,
    hasDependabot: true,
    hasBranchProtection: false,
    p1FetchStatus: "ok",
    ...overrides,
  } as GithubRepoP0;
}

function evidence(value: Partial<GithubP0Signals> = {}): GithubEvidence {
  return {
    kind: "ok",
    value: {
      owner: "owner",
      user: { login: "owner", createdAt: null, publicRepos: 12, followers: 88 },
      repos: [repo()],
      ...value,
    },
  } as GithubEvidence;
}

describe("GitHubDrawer (US-136)", () => {
  it("renders the heartbeat dot + owner header when github.kind === 'ok'", () => {
    const { container } = render(
      <GitHubDrawer github={evidence()} initialOpen />,
    );
    const drawer = container.querySelector('[data-section="github-drawer"]');
    expect(drawer?.getAttribute("data-state")).toBe("ok");
    expect(drawer?.getAttribute("data-owner")).toBe("owner");
    expect(
      drawer?.querySelector('[data-heartbeat="ok"]'),
    ).not.toBeNull();
  });

  it("renders absent state with dashed border + missing-badge copy", () => {
    const { container } = render(
      <GitHubDrawer github={{ kind: "absent" }} initialOpen />,
    );
    const drawer = container.querySelector(
      '[data-section="github-drawer"]',
    ) as HTMLElement;
    expect(drawer.getAttribute("data-state")).toBe("absent");
    expect(drawer.style.border).toMatch(/dashed/);
    expect(drawer.textContent).toMatch(/no github claim.*pat not configured/i);
  });

  it("renders error state with siren-red border + reason in summary", () => {
    const { container } = render(
      <GitHubDrawer
        github={{
          kind: "error",
          reason: "rate_limited",
          message: "429",
        }}
        initialOpen
      />,
    );
    const drawer = container.querySelector(
      '[data-section="github-drawer"]',
    ) as HTMLElement;
    expect(drawer.getAttribute("data-state")).toBe("error");
    expect(drawer.textContent).toMatch(/invalid.*rate_limited/i);
    expect(drawer.textContent).toMatch(/429/);
  });

  it("caps repos at 20 (top-N by recent activity)", () => {
    const repos: GithubRepoP0[] = Array.from({ length: 25 }, (_, i) =>
      repo({ name: `r${i}`, fullName: `owner/r${i}` }),
    );
    const { container } = render(
      <GitHubDrawer github={evidence({ repos })} initialOpen />,
    );
    const cards = container.querySelectorAll("[data-repo]");
    expect(cards.length).toBe(20);
  });

  it("each repo card shows name, pushed-at date, CI/bugs trust pills, releases count", () => {
    const { container } = render(
      <GitHubDrawer github={evidence()} initialOpen />,
    );
    const card = container.querySelector('[data-repo="owner/demo"]');
    expect(card?.querySelector('[data-field="repo-name"]')?.textContent).toBe(
      "owner/demo",
    );
    expect(
      card?.querySelector('[data-field="repo-pushed"]')?.textContent,
    ).toBe("2026-05-01");
    expect(
      card?.querySelector('[data-field="ci-meta"]')?.textContent,
    ).toMatch(/46\/50 runs/);
    expect(
      card?.querySelector('[data-field="bug-meta"]')?.textContent,
    ).toMatch(/7\/9 closed/);
    expect(
      card?.querySelector('[data-field="releases-meta"]')?.textContent,
    ).toBe("6");
  });

  it("CI trust pill renders × 0.92 (variant=verified) for 46/50 successful", () => {
    const { container } = render(
      <GitHubDrawer github={evidence()} initialOpen />,
    );
    const card = container.querySelector('[data-repo="owner/demo"]');
    const pills = card?.querySelectorAll("[data-trust-pill]");
    const ci = pills?.[0] as HTMLElement;
    expect(ci.getAttribute("data-trust-pill")).toBe("verified");
    expect(ci.getAttribute("data-label")).toBe("× 0.92");
  });

  it("missing US-114b enrichment renders × 0.00 missing pill, no crash", () => {
    const { container } = render(
      <GitHubDrawer
        github={evidence({
          repos: [
            repo({
              ciRuns: undefined,
              bugIssues: undefined,
              releasesLast12m: undefined,
              hasSecurity: undefined,
              hasDependabot: undefined,
              hasBranchProtection: undefined,
            }),
          ],
        })}
        initialOpen
      />,
    );
    const card = container.querySelector('[data-repo="owner/demo"]');
    const pills = card?.querySelectorAll("[data-trust-pill]");
    const ci = pills?.[0] as HTMLElement;
    expect(ci.getAttribute("data-trust-pill")).toBe("missing");
    expect(
      card?.querySelector('[data-field="releases-meta"]')?.textContent,
    ).toBe("—");
  });

  it("hygiene flags render verified-checkmark for present and dashed-· for absent", () => {
    const { container } = render(
      <GitHubDrawer
        github={evidence({
          repos: [
            repo({ hasLicense: true, hasSecurity: false, hasDependabot: false }),
          ],
        })}
        initialOpen
      />,
    );
    const license = container.querySelector('[data-hygiene="LICENSE"]');
    const security = container.querySelector('[data-hygiene="SECURITY"]');
    expect(license?.getAttribute("data-present")).toBe("true");
    expect(license?.textContent).toMatch(/✓/);
    expect(security?.getAttribute("data-present")).toBe("false");
    expect(security?.textContent).toMatch(/^· /);
  });

  it("renders archived flag when repo.archived === true", () => {
    const { container } = render(
      <GitHubDrawer
        github={evidence({ repos: [repo({ archived: true })] })}
        initialOpen
      />,
    );
    const card = container.querySelector('[data-repo="owner/demo"]');
    expect(card?.getAttribute("data-archived")).toBe("true");
    expect(
      card?.querySelector('[data-field="archived-flag"]')?.textContent,
    ).toMatch(/archived/i);
  });

  it("drawer footer carries trust-discount reminder copy (× 0.6 GitHub)", () => {
    const { container } = render(
      <GitHubDrawer github={evidence()} initialOpen />,
    );
    const meta = container.querySelector('[data-field="drawer-meta"]');
    expect(meta?.textContent).toMatch(
      /every signal counts × 0\.6 until cross-/i,
    );
  });

  it("zero repos renders honest empty state (no crash on brand-new account)", () => {
    const { container } = render(
      <GitHubDrawer github={evidence({ repos: [] })} initialOpen />,
    );
    expect(
      container.querySelector('[data-field="no-repos"]')?.textContent,
    ).toMatch(/no repos returned/i);
  });
});
