// Hardcoded Siren Report fixtures for the four demo subnames live on Sepolia
// (per `contracts/DEPLOYMENTS.md`). Each fixture is rendered with `mock: true`
// so the verdict-card corner shows the MOCK badge — these values are not yet
// produced from a live verdict-engine call (Stream B wire-up is a follow-up).
//
// The addresses below match the live deployment exactly:
//   Proxy            0x8391fa804d3755493e3C9D362D49c339C4469388
//   VaultV1          0xC53d3879aCF9Dd9d6fCF8Ed9B335A410Cc66Eb30
//   VaultV2Safe      0x9A9DCb4CE0F03aCB6aa8e26905D6aBb93c95B774
//   VaultV2Dangerous 0xfD7F5B48C260a32102AA05117C13a599B0d4d568
//   UnverifiedImpl   0x819326b9d318e1bb8c3EA73e744dEEC0c9aAbe77
//   Operator         0x747E453F13B5B14313E25393Eb443fbAaA250cfC

import type {
  Address,
  SirenReport,
} from "@upgrade-siren/shared";

export const FIXTURE_KEYS = [
  "vault",
  "safe",
  "dangerous",
  "unverified",
] as const;

export type FixtureKey = (typeof FIXTURE_KEYS)[number];

export const FIXTURE_SUBNAMES: Record<FixtureKey, string> = {
  vault: "vault.upgrade-siren-demo.eth",
  safe: "safe.upgrade-siren-demo.eth",
  dangerous: "dangerous.upgrade-siren-demo.eth",
  unverified: "unverified.upgrade-siren-demo.eth",
};

export const SUBNAME_TO_FIXTURE: Record<string, FixtureKey> = Object.fromEntries(
  (Object.entries(FIXTURE_SUBNAMES) as [FixtureKey, string][]).map(
    ([k, v]) => [v, k],
  ),
);

const PROXY: Address = "0x8391fa804d3755493e3C9D362D49c339C4469388";
const VAULT_V1: Address = "0xC53d3879aCF9Dd9d6fCF8Ed9B335A410Cc66Eb30";
const VAULT_V2_SAFE: Address = "0x9A9DCb4CE0F03aCB6aa8e26905D6aBb93c95B774";
const VAULT_V2_DANGEROUS: Address =
  "0xfD7F5B48C260a32102AA05117C13a599B0d4d568";
const UNVERIFIED_IMPL: Address =
  "0x819326b9d318e1bb8c3EA73e744dEEC0c9aAbe77";
const OPERATOR: Address = "0x747E453F13B5B14313E25393Eb443fbAaA250cfC";

const SOURCIFY_PREV = `https://sourcify.dev/#/lookup/${VAULT_V1}`;
const SOURCIFY_SAFE = `https://sourcify.dev/#/lookup/${VAULT_V2_SAFE}`;
const SOURCIFY_DANGEROUS = `https://sourcify.dev/#/lookup/${VAULT_V2_DANGEROUS}`;

const SIGNED_AT = "2026-05-09T12:00:00Z";

function signedAuth(): SirenReport["auth"] {
  return {
    status: "valid",
    signatureType: "EIP-712",
    signer: OPERATOR,
    signature: "0x".padEnd(132, "a") as `0x${string}`,
    signedAt: SIGNED_AT,
  };
}

function unsignedAuth(): SirenReport["auth"] {
  return {
    status: "unsigned",
    signatureType: null,
    signer: null,
    signature: null,
    signedAt: null,
  };
}

const ENS_RESOLVED: SirenReport["ens"] = {
  recordsResolvedLive: true,
  manifestHash:
    "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1",
  owner: OPERATOR,
};

const VAULT_FIXTURE: SirenReport = {
  schema: "siren-report@1",
  name: FIXTURE_SUBNAMES.vault,
  chainId: 11155111,
  proxy: PROXY,
  previousImplementation: VAULT_V1,
  currentImplementation: VAULT_V1,
  verdict: "SAFE",
  summary:
    "Canonical baseline. Implementation matches the signed manifest; no upgrade has been applied.",
  findings: [
    {
      id: "F-vault-1",
      severity: "info",
      title: "Implementation matches manifest currentImpl",
      evidence: { proxy: PROXY, impl: VAULT_V1 },
    },
  ],
  sourcify: {
    previousVerified: true,
    currentVerified: true,
    links: [
      { label: "Sourcify · current", url: SOURCIFY_PREV },
    ],
  },
  mode: "signed-manifest",
  confidence: "mock",
  ens: ENS_RESOLVED,
  auth: signedAuth(),
  recommendedAction: "approve",
  mock: true,
  generatedAt: SIGNED_AT,
};

const SAFE_FIXTURE: SirenReport = {
  schema: "siren-report@1",
  name: FIXTURE_SUBNAMES.safe,
  chainId: 11155111,
  proxy: PROXY,
  previousImplementation: VAULT_V1,
  currentImplementation: VAULT_V2_SAFE,
  verdict: "SAFE",
  summary:
    "Verified V1 → V2Safe upgrade. ABI compatible. Storage layout extends previous state with appended slots only.",
  findings: [
    {
      id: "F-safe-1",
      severity: "info",
      title: "Both implementations verified on Sourcify",
      evidence: { previous: VAULT_V1, current: VAULT_V2_SAFE },
    },
    {
      id: "F-safe-2",
      severity: "info",
      title: "Storage layout: compatible_appended_only",
      evidence: { tag: "compatible_appended_only" },
    },
  ],
  sourcify: {
    previousVerified: true,
    currentVerified: true,
    links: [
      { label: "Sourcify · previous (V1)", url: SOURCIFY_PREV },
      { label: "Sourcify · current (V2Safe)", url: SOURCIFY_SAFE },
    ],
  },
  mode: "signed-manifest",
  confidence: "mock",
  ens: ENS_RESOLVED,
  auth: signedAuth(),
  recommendedAction: "approve",
  mock: true,
  generatedAt: SIGNED_AT,
};

const DANGEROUS_FIXTURE: SirenReport = {
  schema: "siren-report@1",
  name: FIXTURE_SUBNAMES.dangerous,
  chainId: 11155111,
  proxy: PROXY,
  previousImplementation: VAULT_V1,
  currentImplementation: VAULT_V2_DANGEROUS,
  verdict: "SIREN",
  summary:
    "Verified upgrade introduces sweep() and reorders storage. Treasury drain risk. Do not approve.",
  findings: [
    {
      id: "F-dangerous-1",
      severity: "critical",
      title: "New sweep() selector exposes treasury drain",
      evidence: { selector: "0x01ffc9a7", name: "sweep" },
    },
    {
      id: "F-dangerous-2",
      severity: "critical",
      title: "Storage layout: incompatible_reordered",
      evidence: { tag: "incompatible_reordered" },
    },
    {
      id: "F-dangerous-3",
      severity: "warning",
      title: "Operator signature is valid; the contract content is the risk",
      evidence: { signer: OPERATOR },
    },
  ],
  sourcify: {
    previousVerified: true,
    currentVerified: true,
    links: [
      { label: "Sourcify · previous (V1)", url: SOURCIFY_PREV },
      { label: "Sourcify · current (V2Dangerous)", url: SOURCIFY_DANGEROUS },
    ],
  },
  mode: "signed-manifest",
  confidence: "mock",
  ens: ENS_RESOLVED,
  auth: signedAuth(),
  recommendedAction: "reject",
  mock: true,
  generatedAt: SIGNED_AT,
};

const UNVERIFIED_FIXTURE: SirenReport = {
  schema: "siren-report@1",
  name: FIXTURE_SUBNAMES.unverified,
  chainId: 11155111,
  proxy: PROXY,
  previousImplementation: VAULT_V1,
  currentImplementation: UNVERIFIED_IMPL,
  verdict: "SIREN",
  summary:
    "Current implementation is not verified on Sourcify. No source means no upgrade.",
  findings: [
    {
      id: "F-unverified-1",
      severity: "critical",
      title: "Current implementation is unverified on Sourcify",
      evidence: { impl: UNVERIFIED_IMPL, sourcify: "no-match" },
    },
    {
      id: "F-unverified-2",
      severity: "warning",
      title: "Manifest signature recovers cleanly to upgrade-siren:owner",
      evidence: { signer: OPERATOR },
    },
  ],
  sourcify: {
    previousVerified: true,
    currentVerified: false,
    links: [{ label: "Sourcify · previous (V1)", url: SOURCIFY_PREV }],
  },
  mode: "signed-manifest",
  confidence: "mock",
  ens: ENS_RESOLVED,
  auth: signedAuth(),
  recommendedAction: "reject",
  mock: true,
  generatedAt: SIGNED_AT,
};

export const FIXTURE_REPORTS: Record<FixtureKey, SirenReport> = {
  vault: VAULT_FIXTURE,
  safe: SAFE_FIXTURE,
  dangerous: DANGEROUS_FIXTURE,
  unverified: UNVERIFIED_FIXTURE,
};

/**
 * Build a public-read REVIEW fixture for an arbitrary name (used when the user
 * lands on `/r/<unknown>?mode=public-read`). Honest about being a placeholder
 * surface — `mock: true`, no operator signature, never SAFE.
 */
export function publicReadFixture(name: string): SirenReport {
  return {
    schema: "siren-report@1",
    name,
    chainId: 1,
    proxy: PROXY,
    previousImplementation: null,
    currentImplementation: PROXY,
    verdict: "REVIEW",
    summary:
      "No upgrade-siren records found on this name. Verdict comes from public chain state only — never SAFE, never operator-attested.",
    findings: [
      {
        id: "F-public-read-1",
        severity: "info",
        title: "No upgrade-siren:* records on this name",
        evidence: { name },
      },
    ],
    sourcify: {
      previousVerified: null,
      currentVerified: false,
      links: [],
    },
    mode: "public-read",
    confidence: "mock",
    ens: {
      recordsResolvedLive: true,
      manifestHash: null,
      owner: null,
    },
    auth: unsignedAuth(),
    recommendedAction: "review",
    mock: true,
    generatedAt: SIGNED_AT,
  };
}
