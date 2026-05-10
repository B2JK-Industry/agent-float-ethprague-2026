import { describe, it, expect } from "vitest";

import type {
  GithubEvidence,
  EnsInternalEvidence,
  MultiSourceEvidence,
  OnchainEntryEvidence,
  ScoreResult,
  SourcifyEntryEvidence,
} from "@upgrade-siren/evidence";

import {
  buildPayloadFromForm,
  buildPrefilledForm,
} from "./buildUmiaVenturePayload";
import { validateUmiaPayload } from "./validate";

interface RepoStub {
  readonly fullName: string;
  readonly archived?: boolean;
  readonly pushedAt?: string | null;
  readonly fetchStatus?: "ok" | "partial" | "error";
}

function makeEvidence(overrides: {
  name?: string;
  primaryAddress?: string | null;
  inferredTexts?: Record<string, string>;
  github?: GithubEvidence | { owner: string; repos: ReadonlyArray<RepoStub> };
} = {}): MultiSourceEvidence {
  const sourcify: ReadonlyArray<SourcifyEntryEvidence> = [];
  const onchain: ReadonlyArray<OnchainEntryEvidence> = [];
  const ensInternal: EnsInternalEvidence = { kind: "absent" };

  let github: GithubEvidence;
  if (!overrides.github) {
    github = { kind: "absent" };
  } else if ("kind" in overrides.github) {
    github = overrides.github;
  } else {
    github = {
      kind: "ok",
      value: {
        owner: overrides.github.owner,
        user: null,
        repos: overrides.github.repos.map((r) => ({
          name: r.fullName.split("/")[1] ?? r.fullName,
          fullName: r.fullName,
          createdAt: null,
          pushedAt: r.pushedAt ?? null,
          archived: r.archived ?? false,
          defaultBranch: "main",
          license: null,
          topics: [],
          hasTestDir: false,
          hasSubstantialReadme: false,
          readmeBytes: null,
          hasLicense: false,
          fetchStatus: r.fetchStatus ?? "ok",
        })),
      },
    };
  }

  return {
    subject: {
      name: overrides.name ?? "alice.eth",
      chainId: 1,
      mode: "public-read",
      primaryAddress:
        (overrides.primaryAddress ??
          "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01") as `0x${string}` | null,
      kind: null,
      manifest: null,
      inferredTexts: overrides.inferredTexts ?? {},
    },
    sourcify,
    github,
    onchain,
    ensInternal,
    crossChain: null,
    failures: [],
  };
}

const fakeScore: ScoreResult = {
  score_100: 62,
  tier: "A",
  axes: { seniority: 0.6, relevance: 0.64 },
  ceiling: { applied: false, capLabel: null },
  reason: "ok",
} as unknown as ScoreResult;

const longDescription =
  "We are building a public ENS-anchored upgrade-risk verdict surface for Ethereum. Sourcify is the proof.";

describe("buildPrefilledForm (canonical Umia Community Track schema)", () => {
  it("locks ENS-sourced fields and leaves missing required fields editable", () => {
    const evidence = makeEvidence({
      name: "siren.eth",
      inferredTexts: {
        "com.github": "B2JK-Industry",
        description: longDescription,
        url: "https://upgrade-siren.vercel.app",
        "org.telegram": "Daniel_Babjak",
      },
    });
    const form = buildPrefilledForm({ evidence, score: fakeScore });

    // Project name comes from ENS → locked.
    expect(form.project.name.locked).toBe(true);
    expect(form.project.name.value).toBe("siren.eth");
    expect(form.project.name.sourceLabel).toContain("ENS");

    // Description comes from ENS → locked.
    expect(form.project.description.locked).toBe(true);
    expect(form.project.description.value).toBe(longDescription);

    // Pitch is not in ENS → editable, empty.
    expect(form.project.pitch.locked).toBe(false);
    expect(form.project.pitch.value).toBe("");

    // Stage is a default → editable.
    expect(form.project.stage.locked).toBe(false);
    expect(form.project.stage.value).toBe("Pre-MVP");

    // Telegram came from ENS → locked into the seeded contact AND links.
    expect(form.owner_contacts[0]?.telegram.locked).toBe(true);
    expect(form.owner_contacts[0]?.telegram.value).toBe("Daniel_Babjak");
    expect(form.project.links.telegram.locked).toBe(true);
    expect(form.project.links.telegram.value).toBe("https://t.me/Daniel_Babjak");

    // Email is not in ENS → editable, empty.
    expect(form.owner_contacts[0]?.email.locked).toBe(false);
    expect(form.owner_contacts[0]?.email.value).toBe("");

    // GitHub repos NEVER auto-fabricated from a com.github username
    // because the canonical schema requires owner/repo URL pattern.
    expect(form.project.links.github_repositories.value).toEqual([]);
    expect(form.project.links.github_repositories.locked).toBe(false);

    // GitHub organization URL IS auto-derived from com.github → locked.
    expect(form.project.links.github_organization.locked).toBe(true);
    expect(form.project.links.github_organization.value).toBe(
      "https://github.com/B2JK-Industry",
    );
  });

  it("includes the upgrade_siren_report ref with subject + score", () => {
    const evidence = makeEvidence({ name: "x.eth" });
    const form = buildPrefilledForm({ evidence, score: fakeScore });
    const ref = form.upgrade_siren_report;
    expect(ref).not.toBeNull();
    expect(ref?.subject_ens).toBe("x.eth");
    expect(ref?.url).toBe("https://upgrade-siren.vercel.app/b/x.eth");
    expect(ref?.score_100).toBe(62);
    expect(ref?.tier).toBe("A");
  });

  it("auto-fills github_repositories from fetched GitHub evidence (top non-archived by recent push)", () => {
    const evidence = makeEvidence({
      name: "siren.eth",
      github: {
        owner: "B2JK-Industry",
        repos: [
          // Newest push wins.
          { fullName: "B2JK-Industry/Upgrade-Siren-ETHPrague2026", pushedAt: "2026-05-10T10:00:00Z" },
          // Older but still active.
          { fullName: "B2JK-Industry/older", pushedAt: "2024-01-01T00:00:00Z" },
          // Archived → excluded.
          { fullName: "B2JK-Industry/legacy", pushedAt: "2026-05-09T00:00:00Z", archived: true },
          // Partial fetch → excluded.
          { fullName: "B2JK-Industry/partial", pushedAt: "2026-05-08T00:00:00Z", fetchStatus: "partial" },
        ],
      },
    });
    const form = buildPrefilledForm({ evidence, score: fakeScore });
    const repos = form.project.links.github_repositories;
    expect(repos.value).toEqual([
      "https://github.com/B2JK-Industry/Upgrade-Siren-ETHPrague2026",
      "https://github.com/B2JK-Industry/older",
    ]);
    expect(repos.origin).toBe("report");
    expect(repos.locked).toBe(true);
    expect(repos.sourceLabel).toMatch(/from GitHub/);
  });

  it("auto-filled github_repositories satisfy schema validation when seeded", () => {
    const evidence = makeEvidence({
      name: "siren.eth",
      inferredTexts: {
        description: longDescription,
      },
      github: {
        owner: "B2JK-Industry",
        repos: [
          { fullName: "B2JK-Industry/Upgrade-Siren-ETHPrague2026", pushedAt: "2026-05-10T10:00:00Z" },
        ],
      },
    });
    const form = buildPrefilledForm({ evidence, score: fakeScore });
    const payload = buildPayloadFromForm({
      form,
      userEdits: {
        owner_contacts: [
          { name: "Daniel Babjak", role: "Founder", email: "d@example.com", preferred_contact: "email" },
        ],
        members: [{ name: "Daniel Babjak", role: "Founder" }],
        project: {
          pitch: "Public ENS-anchored upgrade-risk verdict surface.",
          stage: "MVP",
        },
      },
    });
    const result = validateUmiaPayload(payload);
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.payload.project.links.github_repositories).toEqual([
        "https://github.com/B2JK-Industry/Upgrade-Siren-ETHPrague2026",
      ]);
    }
  });

  it("does NOT fabricate missing required fields", () => {
    const evidence = makeEvidence({
      name: "bare.eth",
      inferredTexts: {},
    });
    const form = buildPrefilledForm({ evidence, score: null });

    expect(form.project.pitch.value).toBe("");
    expect(form.project.pitch.locked).toBe(false);
    expect(form.project.description.value).toBe("");
    expect(form.project.description.locked).toBe(false);
    expect(form.project.links.github_repositories.value).toEqual([]);
    expect(form.owner_contacts[0]?.email.value).toBe("");
    expect(form.owner_contacts[0]?.telegram.value).toBe("");
    expect(form.team.members[0]?.name.value).toBe("");
  });
});

describe("buildPayloadFromForm + validateUmiaPayload", () => {
  it("blocks download when required fields are missing", () => {
    const evidence = makeEvidence({
      name: "minimal.eth",
      inferredTexts: {},
    });
    const form = buildPrefilledForm({ evidence, score: null });
    const payload = buildPayloadFromForm({ form });
    const result = validateUmiaPayload(payload);
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      const paths = result.errors.map((e) => e.path);
      // owner_contacts[0].name missing OR project.description too short
      // OR project.links.github_repositories below minItems.
      expect(paths.length).toBeGreaterThan(0);
    }
  });

  it("validates a fully-completed payload", () => {
    const evidence = makeEvidence({
      name: "siren.eth",
      inferredTexts: {
        "com.github": "B2JK-Industry",
        description: longDescription,
        url: "https://upgrade-siren.vercel.app",
        "org.telegram": "Daniel_Babjak",
      },
    });
    const form = buildPrefilledForm({ evidence, score: fakeScore });
    const payload = buildPayloadFromForm({
      form,
      userEdits: {
        owner_contacts: [
          {
            name: "Daniel Babjak",
            role: "Founder",
            preferred_contact: "telegram",
          },
        ],
        members: [
          {
            name: "Daniel Babjak",
            role: "Founder",
          },
        ],
        project: {
          pitch: "Public ENS-anchored upgrade-risk verdict surface.",
          stage: "MVP",
          links: {
            github_repositories: [
              "https://github.com/B2JK-Industry/Upgrade-Siren-ETHPrague2026",
            ],
          },
        },
      },
    });
    const result = validateUmiaPayload(payload);
    if (result.kind === "error") {
      // eslint-disable-next-line no-console
      console.error(result.errors);
    }
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.payload.schema_version).toBe("0.1.0");
      expect(result.payload.target_command).toBe("umia venture apply");
      expect(result.payload.submission_track).toBe("community");
      // Report ref is materialised into submission_notes.
      expect(result.payload.submission_notes).toContain("siren.eth");
      expect(result.payload.submission_notes).toContain("score_100: 62");
      expect(result.payload.submission_notes).toContain("tier: A");
      // Locked telegram from ENS flowed through to the contact.
      expect(result.payload.owner_contacts[0]?.telegram).toBe("Daniel_Babjak");
    }
  });

  it("locked fields are NOT overridable by userEdits", () => {
    const evidence = makeEvidence({
      name: "siren.eth",
      inferredTexts: {
        "com.github": "B2JK-Industry",
        description: longDescription,
        url: "https://example.com",
        "org.telegram": "Daniel_Babjak",
      },
    });
    const form = buildPrefilledForm({ evidence, score: fakeScore });
    const payload = buildPayloadFromForm({
      form,
      userEdits: {
        owner_contacts: [
          {
            name: "Daniel Babjak",
            role: "Founder",
            telegram: "different_handle", // Locked → should be ignored.
            preferred_contact: "telegram",
          },
        ],
        members: [{ name: "Daniel Babjak", role: "Founder" }],
        project: {
          name: "totally-different-name", // Locked → should be ignored.
          description: "rewritten short text", // Locked → should be ignored.
          pitch: "Help us launch a public verification surface for ENS.",
          stage: "MVP",
          links: {
            github_repositories: [
              "https://github.com/B2JK-Industry/Upgrade-Siren-ETHPrague2026",
            ],
          },
        },
      },
    });
    expect(payload.project.name).toBe("siren.eth");
    expect(payload.project.description).toBe(longDescription);
    expect(payload.owner_contacts[0]?.telegram).toBe("Daniel_Babjak");
  });

  it("normalises ENS social handles into proper URLs in project.links", () => {
    const evidence = makeEvidence({
      name: "siren.eth",
      inferredTexts: {
        "com.twitter": "upgradesiren",
        "org.telegram": "@Daniel_Babjak",
      },
    });
    const form = buildPrefilledForm({ evidence, score: null });
    expect(form.project.links.twitter.value).toBe("https://twitter.com/upgradesiren");
    expect(form.project.links.telegram.value).toBe("https://t.me/Daniel_Babjak");
  });
});
