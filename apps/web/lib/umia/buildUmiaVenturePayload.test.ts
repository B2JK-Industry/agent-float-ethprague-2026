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

function makeEvidence(overrides: {
  name?: string;
  primaryAddress?: string | null;
  inferredTexts?: Record<string, string>;
} = {}): MultiSourceEvidence {
  const sourcify: ReadonlyArray<SourcifyEntryEvidence> = [];
  const onchain: ReadonlyArray<OnchainEntryEvidence> = [];
  const github: GithubEvidence = { kind: "absent" };
  const ensInternal: EnsInternalEvidence = { kind: "absent" };
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

describe("buildPrefilledForm", () => {
  it("locks ENS-sourced fields and leaves missing required fields editable", () => {
    const evidence = makeEvidence({
      name: "siren.eth",
      inferredTexts: {
        "com.github": "B2JK-Industry",
        description: "Public ENS-anchored upgrade alarm.",
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
    expect(form.project.description.value).toContain("alarm");

    // Pitch is not in ENS → editable, empty.
    expect(form.project.pitch.locked).toBe(false);
    expect(form.project.pitch.value).toBe("");

    // Stage is a default → editable.
    expect(form.project.stage.locked).toBe(false);
    expect(form.project.stage.value).toBe("prototype");

    // Telegram came from ENS → locked.
    expect(form.owner_contacts.telegram.locked).toBe(true);
    expect(form.owner_contacts.telegram.value).toBe("Daniel_Babjak");

    // Email is not in ENS → editable, empty.
    expect(form.owner_contacts.email.locked).toBe(false);
    expect(form.owner_contacts.email.value).toBe("");

    // GitHub repos derived from ENS com.github org URL → locked.
    expect(form.project.links.github_repositories.locked).toBe(true);
    expect(form.project.links.github_repositories.value).toEqual([
      "https://github.com/B2JK-Industry",
    ]);
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

  it("does NOT fabricate missing required fields", () => {
    const evidence = makeEvidence({
      name: "bare.eth",
      // Empty text records — only the ENS name is known.
      inferredTexts: {},
    });
    const form = buildPrefilledForm({ evidence, score: null });

    // Required by schema: project.pitch — must be editable + empty.
    expect(form.project.pitch.value).toBe("");
    expect(form.project.pitch.locked).toBe(false);

    // Required by schema: project.links.github_repositories — must be
    // editable + empty (no fabricated URL).
    expect(form.project.links.github_repositories.value).toEqual([]);
    expect(form.project.links.github_repositories.locked).toBe(false);

    // Required by schema: at least one owner_contact — all must be empty.
    expect(form.owner_contacts.email.value).toBe("");
    expect(form.owner_contacts.telegram.value).toBe("");
    expect(form.owner_contacts.twitter.value).toBe("");
    expect(form.owner_contacts.discord.value).toBe("");
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
      // Owner contacts anyOf failure + project.pitch + github_repositories.
      const paths = result.errors.map((e) => e.path);
      expect(paths.some((p) => p.includes("owner_contacts"))).toBe(true);
      expect(paths.some((p) => p.includes("pitch") || p.includes("project"))).toBe(true);
    }
  });

  it("validates a fully-completed payload", () => {
    const evidence = makeEvidence({
      name: "siren.eth",
      inferredTexts: {
        "com.github": "B2JK-Industry",
        description: "Public ENS-anchored upgrade alarm.",
        url: "https://upgrade-siren.vercel.app",
        "org.telegram": "Daniel_Babjak",
      },
    });
    const form = buildPrefilledForm({ evidence, score: fakeScore });
    const payload = buildPayloadFromForm({
      form,
      userEdits: {
        project: {
          pitch: "Help us launch a public verification surface for ENS.",
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
      expect(result.payload.upgrade_siren_report?.subject_ens).toBe("siren.eth");
    }
  });

  it("locked fields are NOT overridable by userEdits", () => {
    const evidence = makeEvidence({
      name: "siren.eth",
      inferredTexts: {
        "com.github": "B2JK-Industry",
        description: "Public alarm.",
        url: "https://example.com",
        "org.telegram": "Daniel_Babjak",
      },
    });
    const form = buildPrefilledForm({ evidence, score: fakeScore });
    const payload = buildPayloadFromForm({
      form,
      userEdits: {
        project: {
          name: "totally-different-name", // Locked → should be ignored.
          description: "rewritten",         // Locked → should be ignored.
          pitch: "valid pitch goes here.",
        },
        owner_contacts: {
          telegram: "different_handle",     // Locked → should be ignored.
        },
      },
    });
    expect(payload.project.name).toBe("siren.eth");
    expect(payload.project.description).toBe("Public alarm.");
    expect(payload.owner_contacts.telegram).toBe("Daniel_Babjak");
    expect(payload.project.pitch).toBe("valid pitch goes here.");
  });
});
