import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { EnsDrawer } from "./EnsDrawer";

import type { EnsInternalEvidence } from "@upgrade-siren/evidence";

function okEvidence(
  overrides: Partial<{
    name: string;
    registrationDate: number | null;
    subnameCount: number;
    textRecordCount: number;
    lastRecordUpdateBlock: bigint | null;
  }> = {},
): EnsInternalEvidence {
  return {
    kind: "ok",
    value: {
      name: overrides.name ?? "siren-agent-demo.upgrade-siren-demo.eth",
      registrationDate:
        overrides.registrationDate === undefined
          ? 1_700_000_000
          : overrides.registrationDate,
      subnameCount: overrides.subnameCount ?? 4,
      textRecordCount: overrides.textRecordCount ?? 7,
      lastRecordUpdateBlock:
        overrides.lastRecordUpdateBlock === undefined
          ? 19_200_000n
          : overrides.lastRecordUpdateBlock,
    },
  } as unknown as EnsInternalEvidence;
}

describe("EnsDrawer (US-138)", () => {
  it("absent state: dashed border + missing pill + GRAPH_API_KEY hint", () => {
    const { container } = render(
      <EnsDrawer
        subjectName="vitalik.eth"
        ens={{ kind: "absent" }}
        initialOpen
      />,
    );
    const drawer = container.querySelector(
      '[data-section="ens-drawer"]',
    ) as HTMLElement;
    expect(drawer.getAttribute("data-state")).toBe("absent");
    expect(drawer.style.border).toMatch(/dashed/);
    const pill = drawer.querySelector("[data-trust-pill]") as HTMLElement;
    expect(pill.getAttribute("data-trust-pill")).toBe("missing");
    expect(pill.getAttribute("data-label")).toBe("× 0.00");
    expect(
      drawer.querySelector('[data-field="absent-note"]')?.textContent,
    ).toMatch(/GRAPH_API_KEY/);
  });

  it("absent state: carry-rule §2B — glyph (·) + label (missing) + dashed border co-present", () => {
    const { container } = render(
      <EnsDrawer
        subjectName="vitalik.eth"
        ens={{ kind: "absent" }}
        initialOpen
      />,
    );
    const header = container.querySelector('[data-field="header"]');
    expect(header?.textContent).toMatch(/·/); // glyph
    expect(
      container.querySelector('[data-field="header-label"]')?.textContent,
    ).toMatch(/missing/i); // label
    // dashed border asserted in previous test
  });

  it("error state: siren-red border + INVALID pill + reason + retry hint", () => {
    const { container } = render(
      <EnsDrawer
        subjectName="vitalik.eth"
        ens={{
          kind: "error",
          reason: "rate_limited",
          message: "429 too many requests",
        }}
        initialOpen
      />,
    );
    const drawer = container.querySelector(
      '[data-section="ens-drawer"]',
    ) as HTMLElement;
    expect(drawer.getAttribute("data-state")).toBe("invalid");
    const pill = drawer.querySelector("[data-trust-pill]") as HTMLElement;
    expect(pill.getAttribute("data-trust-pill")).toBe("invalid");
    expect(pill.getAttribute("data-label")).toBe("INVALID");
    expect(
      drawer.querySelector('[data-field="error-reason"]')?.textContent,
    ).toMatch(/rate_limited/);
    expect(
      drawer.querySelector('[data-field="error-message"]')?.textContent,
    ).toMatch(/429/);
    expect(
      drawer.querySelector('[data-field="error-retry"]')?.textContent,
    ).toMatch(/rate-limit windows reset/i);
  });

  it("ok state: subname count + text record count rendered as display-700 32px tabular-nums", () => {
    const { container } = render(
      <EnsDrawer
        subjectName="someagent.eth"
        ens={okEvidence({ subnameCount: 12, textRecordCount: 5 })}
        initialOpen
      />,
    );
    const drawer = container.querySelector(
      '[data-section="ens-drawer"]',
    ) as HTMLElement;
    expect(drawer.getAttribute("data-state")).toBe("verified");

    const subnames = drawer.querySelector(
      '[data-field="subnames-value"]',
    ) as HTMLElement;
    expect(subnames.textContent).toBe("12");
    expect(subnames.style.fontFamily).toMatch(/--font-display/);
    expect(subnames.style.fontWeight).toBe("700");
    expect(subnames.style.fontVariantNumeric).toBe("tabular-nums");
    expect(subnames.style.transition).toBe("none"); // banned-motion v2 §5C

    const records = drawer.querySelector(
      '[data-field="text-records-value"]',
    ) as HTMLElement;
    expect(records.textContent).toBe("5");
    expect(records.style.fontFamily).toMatch(/--font-display/);
  });

  it("ok state: registration date renders ISO YYYY-MM-DD slice + age estimate", () => {
    const { container } = render(
      <EnsDrawer
        subjectName="someagent.eth"
        ens={okEvidence({ registrationDate: 1_700_000_000 })}
        initialOpen
      />,
    );
    const reg = container.querySelector('[data-field="registration-date"]');
    // Unix 1_700_000_000 → 2023-11-14 (UTC)
    expect(reg?.textContent).toMatch(/2023-11-14/);
    // Age estimate appears as (Xy/Xmo/Xd) suffix
    expect(reg?.textContent).toMatch(/\(\d+(y|mo|d)\)/);
  });

  it("ok state: last record update block + age estimate rendered when present", () => {
    const { container } = render(
      <EnsDrawer
        subjectName="someagent.eth"
        ens={okEvidence({ lastRecordUpdateBlock: 19_200_000n })}
        initialOpen
      />,
    );
    const block = container.querySelector('[data-field="last-update-block"]');
    expect(block?.textContent).toMatch(/block 19200000/);
    const age = container.querySelector('[data-field="last-update-age"]');
    expect(age?.textContent).toMatch(/(~\d+(y|mo)|<1mo)\s*ago/);
  });

  it("ok state: lastRecordUpdateBlock === null → 'no record updates' honest empty", () => {
    const { container } = render(
      <EnsDrawer
        subjectName="freshname.eth"
        ens={okEvidence({ lastRecordUpdateBlock: null })}
        initialOpen
      />,
    );
    expect(
      container.querySelector('[data-field="last-update-empty"]')?.textContent,
    ).toMatch(/no record updates/i);
  });

  it("ok state: registrationDate === null → 'unregistered' label", () => {
    const { container } = render(
      <EnsDrawer
        subjectName="x.eth"
        ens={okEvidence({ registrationDate: null })}
        initialOpen
      />,
    );
    expect(
      container.querySelector('[data-field="registration-date"]')?.textContent,
    ).toMatch(/unregistered/i);
  });

  it("renders honest disclaimer (self-attested + 7.5% ceiling) in tier-c brass color, italic serif", () => {
    const { container } = render(
      <EnsDrawer subjectName="x.eth" ens={okEvidence()} initialOpen />,
    );
    const disclaimer = container.querySelector(
      '[data-field="ens-disclaimer"]',
    ) as HTMLElement;
    expect(disclaimer.textContent).toMatch(/self-attested/i);
    expect(disclaimer.textContent).toMatch(/7\.5%/);
    expect(disclaimer.style.color).toBe("var(--color-tier-c)");
    expect(disclaimer.style.fontFamily).toMatch(/--font-serif/);
    expect(disclaimer.style.fontStyle).toBe("italic");
  });

  it("disclaimer renders on absent state too (carry-rule §2B + GATE-14: never hide the discount math)", () => {
    const { container } = render(
      <EnsDrawer
        subjectName="vitalik.eth"
        ens={{ kind: "absent" }}
        initialOpen
      />,
    );
    expect(
      container.querySelector('[data-field="ens-disclaimer"]'),
    ).not.toBeNull();
  });

  it("disclaimer renders on error state too", () => {
    const { container } = render(
      <EnsDrawer
        subjectName="vitalik.eth"
        ens={{
          kind: "error",
          reason: "graphql_error",
          message: "boom",
        }}
        initialOpen
      />,
    );
    expect(
      container.querySelector('[data-field="ens-disclaimer"]'),
    ).not.toBeNull();
  });

  it("ok header carries ✓ glyph + × 1.00 trust pill (carry-rule §2B)", () => {
    const { container } = render(
      <EnsDrawer subjectName="x.eth" ens={okEvidence()} initialOpen />,
    );
    expect(
      container.querySelector('[data-field="header-glyph"]')?.textContent,
    ).toBe("✓");
    const pill = container.querySelector("[data-trust-pill]") as HTMLElement;
    expect(pill.getAttribute("data-trust-pill")).toBe("verified");
    expect(pill.getAttribute("data-label")).toBe("× 1.00");
  });

  it("subject name appears in the drawer header on every state", () => {
    const states: EnsInternalEvidence[] = [
      okEvidence(),
      { kind: "error", reason: "graphql_error", message: "boom" },
      { kind: "absent" },
    ];
    for (const ens of states) {
      const { container, unmount } = render(
        <EnsDrawer subjectName="vitalik.eth" ens={ens} initialOpen />,
      );
      expect(
        container.querySelector('[data-field="header"]')?.textContent,
      ).toMatch(/vitalik\.eth/);
      unmount();
    }
  });
});
