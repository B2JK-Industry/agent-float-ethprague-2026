// Booth-demo mocked LoadBenchResult fixtures.
//
// Daniel directive 2026-05-10 01:06: "v tychto testovacich case nesedi
// hodnota po kliknuti s tymi ktore vidime tu ... kludne si tie data
// namockuj a nemusia byt voci realnym ens name". Demo tile predicts a
// tier (B / D / D / A); the live `/b/[name]` page must land on that
// same tier so the booth doesn't surprise the visitor.
//
// Strategy: each of the four landing demo subjects gets a frozen
// LoadBenchResult here. `loadBench` checks this map BEFORE invoking
// the orchestrator and returns the mock when the subject matches.
// Live data dependence (Sepolia RPC, Sourcify, GitHub PAT, ENS
// subgraph) is bypassed for these four exact names — they always
// render the booth-tuned story.
//
// Most score breakdown numbers below remain hand-tuned legacy booth
// fixtures. The `vitalik.eth` Tier A fixture is the exception: it
// carries a full deterministic evidence object and derives its score
// from the real score engine so the source grid, drawers, and math
// ledger tell the same story.

import {
  computeScore,
  type GithubRepoP0,
  EngineContribution,
  MultiSourceEvidence,
  ScoreComponentBreakdown,
  ScoreResult,
} from "@upgrade-siren/evidence";

export type LoadBenchLoaded = {
  readonly kind: "loaded";
  readonly evidence: MultiSourceEvidence;
  readonly score: ScoreResult;
  readonly engines: ReadonlyArray<EngineContribution>;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const DEMO_NOW_SECONDS = 1_778_284_800; // 2026-05-10T00:00:00Z
const MAINNET_LATEST_BLOCK = 22_600_000n;

function comp(
  id: string,
  weight: number,
  value: number | null,
  trust: "verified" | "unverified",
  status: "computed" | "null_p1" | "null_no_data",
): ScoreComponentBreakdown {
  const trustFactor = trust === "verified" ? 1.0 : 0.6;
  const contribution = value === null ? 0 : weight * value * trustFactor;
  return {
    id,
    weight,
    value,
    trust,
    trustFactor,
    contribution,
    status,
  };
}

type MockSubjectInput = {
  readonly name: string;
  readonly chainId: number;
  readonly mode: "manifest" | "public-read";
  readonly kind: "ai-agent" | "human-team" | "project" | null;
  /** ENS-resolved primary address — also the wallet that may publish on-chain. */
  readonly primaryAddress?: `0x${string}` | null;
  readonly seniorityComponents: ReadonlyArray<ScoreComponentBreakdown>;
  readonly relevanceComponents: ReadonlyArray<ScoreComponentBreakdown>;
  readonly githubVerified: boolean;
  readonly nonZeroSourceCount: number;
  readonly evidenceOverride?: MultiSourceEvidence;
  readonly scoreFromEvidence?: boolean;
};

function buildScore(input: MockSubjectInput): ScoreResult {
  const seniority = input.seniorityComponents.reduce(
    (sum, c) => sum + c.contribution,
    0,
  );
  const relevance = input.relevanceComponents.reduce(
    (sum, c) => sum + c.contribution,
    0,
  );
  const score_raw = 0.5 * seniority + 0.5 * relevance;
  const score_100 = Math.round(score_raw * 100);

  let tier: ScoreResult["tier"];
  if (score_100 >= 90) tier = "S";
  else if (score_100 >= 75) tier = "A";
  else if (score_100 >= 60) tier = "B";
  else if (score_100 >= 45) tier = "C";
  else tier = "D";

  let ceilingApplied: ScoreResult["ceilingApplied"] = "none";
  if (input.mode === "public-read" && (tier === "S" || tier === "A")) {
    tier = "A";
    ceilingApplied = "public_read_a";
  }
  if (input.nonZeroSourceCount < 2) {
    tier = "U";
    ceilingApplied = "unrated";
  }

  return {
    seniority,
    relevance,
    score_raw,
    score_100,
    tier,
    ceilingApplied,
    breakdown: {
      seniority: {
        components: input.seniorityComponents,
        sum: seniority,
      },
      relevance: {
        components: input.relevanceComponents,
        sum: relevance,
      },
    },
    meta: {
      mode: input.mode,
      nonZeroSourceCount: input.nonZeroSourceCount,
      githubVerified: input.githubVerified,
      seniorityComponentIds: [
        "compileSuccess",
        "ciPassRate",
        "testPresence",
        "bugHygiene",
        "repoHygiene",
        "releaseCadence",
      ],
      relevanceComponentIds: [
        "sourcifyRecency",
        "githubRecency",
        "onchainRecency",
        "ensRecency",
      ],
    },
  };
}

function buildEvidence(input: MockSubjectInput): MultiSourceEvidence {
  if (input.evidenceOverride) return input.evidenceOverride;
  return {
    subject: {
      name: input.name,
      chainId: input.chainId,
      mode: input.mode,
      primaryAddress: input.primaryAddress ?? null,
      kind: input.kind,
      manifest: null,
    },
    sourcify: [],
    github: { kind: "absent" },
    onchain: [],
    ensInternal: { kind: "absent" },
    crossChain: null,
    failures: [],
  };
}

// Four booth subjects — predictions on the landing tile match the
// score_100 / tier each fixture lands on after buildScore() math.

// Operator wallet — also the address declared as primaryAddress in
// `apps/web/public/manifests/siren-agent-demo.upgrade-siren-demo.eth.json`.
// Daniel imports this key (OPERATOR_PRIVATE_KEY) into MetaMask to publish
// the booth-demo attestation on-chain.
const OPERATOR_WALLET = "0x747E453F13B5B14313E25393Eb443fbAaA250cfC" as const;

const AGENT_CURATED: MockSubjectInput = {
  name: "siren-agent-demo.upgrade-siren-demo.eth",
  chainId: 11155111,
  mode: "manifest",
  kind: "ai-agent",
  primaryAddress: OPERATOR_WALLET,
  // Seniority Σ ≈ 0.65: strong Sourcify (compileSuccess 1.0×1.0 = 0.25),
  // partial GitHub signals (ciPassRate 0.85, testPresence 0.95,
  // bugHygiene 0.80, repoHygiene 0.85, releaseCadence 0.55).
  seniorityComponents: [
    comp("compileSuccess", 0.25, 1.0, "verified", "computed"),
    comp("ciPassRate", 0.2, 0.85, "unverified", "computed"),
    comp("testPresence", 0.15, 0.95, "unverified", "computed"),
    comp("bugHygiene", 0.1, 0.8, "unverified", "computed"),
    comp("repoHygiene", 0.15, 0.85, "unverified", "computed"),
    comp("releaseCadence", 0.15, 0.55, "unverified", "computed"),
  ],
  // Relevance Σ ≈ 0.65: full Sourcify recency, GitHub 0.85,
  // on-chain 0.78 (recent activity), ENS 0.92 (newly registered).
  relevanceComponents: [
    comp("sourcifyRecency", 0.3, 1.0, "verified", "computed"),
    comp("githubRecency", 0.3, 0.85, "unverified", "computed"),
    comp("onchainRecency", 0.25, 0.78, "verified", "computed"),
    comp("ensRecency", 0.15, 0.92, "verified", "computed"),
  ],
  githubVerified: false,
  nonZeroSourceCount: 4,
};

const HUMAN_PUBLIC: MockSubjectInput = {
  name: "letadlo.eth",
  chainId: 11155111,
  mode: "public-read",
  kind: null,
  // Seniority Σ ≈ 0.21: no Sourcify (EOA, no contracts deployed),
  // partial GitHub (testPresence 0.4, repoHygiene 0.55, others P1-null).
  seniorityComponents: [
    comp("compileSuccess", 0.25, null, "verified", "null_no_data"),
    comp("ciPassRate", 0.2, null, "unverified", "null_p1"),
    comp("testPresence", 0.15, 0.4, "unverified", "computed"),
    comp("bugHygiene", 0.1, null, "unverified", "null_p1"),
    comp("repoHygiene", 0.15, 0.55, "unverified", "computed"),
    comp("releaseCadence", 0.15, null, "unverified", "null_p1"),
  ],
  // Relevance Σ ≈ 0.30: GitHub recency 0.6, on-chain 0.4,
  // ENS recency 0.85 (recently registered Sepolia name).
  relevanceComponents: [
    comp("sourcifyRecency", 0.3, null, "verified", "null_no_data"),
    comp("githubRecency", 0.3, 0.6, "unverified", "computed"),
    comp("onchainRecency", 0.25, 0.4, "verified", "computed"),
    comp("ensRecency", 0.15, 0.85, "verified", "computed"),
  ],
  githubVerified: false,
  nonZeroSourceCount: 3,
};

const RICH_RECORDS: MockSubjectInput = {
  name: "agent-kikiriki.eth",
  chainId: 11155111,
  mode: "public-read",
  kind: null,
  // Seniority Σ ≈ 0.21: testPresence 0.55, repoHygiene 0.6.
  seniorityComponents: [
    comp("compileSuccess", 0.25, null, "verified", "null_no_data"),
    comp("ciPassRate", 0.2, null, "unverified", "null_p1"),
    comp("testPresence", 0.15, 0.55, "unverified", "computed"),
    comp("bugHygiene", 0.1, null, "unverified", "null_p1"),
    comp("repoHygiene", 0.15, 0.6, "unverified", "computed"),
    comp("releaseCadence", 0.15, null, "unverified", "null_p1"),
  ],
  // Relevance Σ ≈ 0.34: GitHub recency 0.65, on-chain 0.45,
  // ENS recency 0.92 (very fresh, 11 text records).
  relevanceComponents: [
    comp("sourcifyRecency", 0.3, null, "verified", "null_no_data"),
    comp("githubRecency", 0.3, 0.65, "unverified", "computed"),
    comp("onchainRecency", 0.25, 0.45, "verified", "computed"),
    comp("ensRecency", 0.15, 0.92, "verified", "computed"),
  ],
  githubVerified: false,
  nonZeroSourceCount: 3,
};

type SourcifyOkEntry = Extract<
  MultiSourceEvidence["sourcify"][number],
  { kind: "ok" }
>;
type OnchainOkEntry = Extract<
  MultiSourceEvidence["onchain"][number],
  { kind: "ok" }
>;

function demoRepo(
  name: string,
  index: number,
  pushedAt: string | null,
  releasesLast12m: number,
): GithubRepoP0 {
  return {
    name,
    fullName: `vbuterin/${name}`,
    createdAt: `20${String(11 + (index % 9)).padStart(2, "0")}-0${
      (index % 8) + 1
    }-12T00:00:00Z`,
    pushedAt,
    archived: false,
    defaultBranch: "master",
    license: index % 3 === 0 ? "MIT" : "Apache-2.0",
    topics: ["ethereum", "research", "public-goods"],
    hasTestDir: true,
    hasSubstantialReadme: true,
    readmeBytes: 4_800 + index * 160,
    hasLicense: true,
    fetchStatus: "ok",
    ciRuns: { successful: index <= 10 ? 16 : 14, total: index <= 10 ? 17 : 15 },
    bugIssues:
      index <= 8
        ? { closed: 8, total: 9 }
        : { closed: 10, total: 10 },
    releasesLast12m,
    hasSecurity: true,
    hasDependabot: true,
    hasBranchProtection: true,
    p1FetchStatus: "ok",
  };
}

function demoSourcifyEntry(
  label: string,
  address: `0x${string}`,
  contractName: string,
): SourcifyOkEntry {
  return {
    kind: "ok",
    chainId: 1,
    address,
    label,
    deep: {
      chainId: 1,
      address,
      match: "exact_match",
      creationMatch: "exact_match",
      runtimeMatch: "exact_match",
      compilation: {
        compiler: "solc",
        compilerVersion: "0.8.24+commit.e11b9ed9",
        language: "Solidity",
        evmVersion: "paris",
        optimizerEnabled: true,
        optimizerRuns: 20_000,
        contractName,
        fullyQualifiedName: `contracts/demo/${contractName}.sol:${contractName}`,
      },
      functionSignatures: [
        { selector: "0x01ffc9a7", signature: "supportsInterface(bytes4)" },
        { selector: "0x8da5cb5b", signature: "owner()" },
        { selector: "0x3659cfe6", signature: "upgradeTo(address)" },
      ],
      eventSignatures: [
        {
          topicHash:
            "0xbc7cd75a20ee27fd9ade8dbc6ef9333db2ac192f4fe05d37de7a3c36dca2f743",
          signature: "Upgraded(address)",
        },
      ],
      licenses: [
        { path: `contracts/demo/${contractName}.sol`, license: "MIT" },
        { path: "contracts/demo/interfaces/IRegistry.sol", license: "MIT" },
      ],
      userdoc: { kind: "user", methods: {}, notice: "Curated booth fixture." },
      devdoc: {
        kind: "dev",
        title: contractName,
        details: "Mock verified contract metadata for the Tier A demo snapshot.",
      },
      proxyResolution: {
        isProxy: true,
        proxyType: "EIP1967Proxy",
        implementations: [
          {
            address: "0x1111111111111111111111111111111111111111",
            name: `${contractName}V1`,
          },
          {
            address: "0x2222222222222222222222222222222222222222",
            name: `${contractName}V2`,
          },
        ],
      },
    },
    patterns: [
      {
        pattern: "uups",
        label: "UUPS upgrade surface",
        evidence: ["upgradeTo(address)", "Upgraded(address)"],
        openzeppelin: true,
      },
      {
        pattern: "ownable",
        label: "Ownable access control",
        evidence: ["owner()"],
        openzeppelin: true,
      },
    ],
    licenseCompiler: {
      licenses: [{ spdx: "MIT", count: 2 }],
      dominantLicense: "MIT",
      compiler: {
        raw: "0.8.24+commit.e11b9ed9",
        major: 0,
        minor: 8,
        patch: 24,
        commit: "e11b9ed9",
        prerelease: null,
        recent: true,
      },
    },
  };
}

function demoOnchainEntry(
  chainId: number,
  nonce: number,
  transferCountRecent90d: number,
  transferCountTotal: number,
): OnchainOkEntry {
  return {
    kind: "ok",
    chainId,
    value: {
      chainId,
      address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      nonce,
      firstTxBlock: chainId === 1 ? 4_620_000n : 5_310_000n,
      firstTxTimestamp: chainId === 1 ? 1_509_494_400 : 1_710_201_600,
      latestBlock: chainId === 1 ? MAINNET_LATEST_BLOCK : 8_920_000n,
      transferCountRecent90d,
      transferCountTotal,
      transferCountProvider: "etherscan",
    },
  };
}

function buildVitalikTierADemoEvidence(): MultiSourceEvidence {
  const repos = [
    demoRepo("pyethereum", 1, "2026-05-02T10:15:00Z", 1),
    demoRepo("research", 2, "2026-04-28T18:20:00Z", 1),
    demoRepo("serenity", 3, "2026-04-12T12:00:00Z", 1),
    demoRepo("casper", 4, "2026-03-31T09:30:00Z", 1),
    demoRepo("eth2.0-specs", 5, "2026-03-20T15:45:00Z", 1),
    demoRepo("minimal-vm", 6, "2026-02-28T08:10:00Z", 1),
    demoRepo("public-goods-sim", 7, "2026-02-19T21:10:00Z", 1),
    demoRepo("account-abstraction-notes", 8, "2026-02-13T12:00:00Z", 1),
    demoRepo("zk-notes", 9, "2026-02-12T17:05:00Z", 1),
    demoRepo("rollup-research", 10, "2026-02-10T11:00:00Z", 1),
    demoRepo("quadratic-funding", 11, "2026-05-06T07:45:00Z", 0),
    demoRepo("archived-demo-reference", 12, "2025-11-18T09:00:00Z", 0),
  ];

  return {
    subject: {
      name: "vitalik.eth",
      chainId: 1,
      mode: "public-read",
      primaryAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      kind: null,
      manifest: null,
      inferredGithub: {
        owner: "vbuterin",
        verified: false,
        verificationGist: null,
      },
      inferredTexts: {
        "com.github": "vbuterin",
        "com.twitter": "VitalikButerin",
        "xyz.farcaster": "vitalik.eth",
        url: "https://vitalik.ca",
        description:
          "Curated booth fixture: deterministic mock evidence for Tier A public-read output.",
      },
      contentHash: "ipfs://bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku",
    },
    sourcify: [
      demoSourcifyEntry(
        "Curated demo registry proxy",
        "0x1000000000000000000000000000000000000001",
        "DemoRegistryProxy",
      ),
      demoSourcifyEntry(
        "Curated demo verifier",
        "0x1000000000000000000000000000000000000002",
        "DemoVerifier",
      ),
    ],
    github: {
      kind: "ok",
      value: {
        owner: "vbuterin",
        user: {
          login: "vbuterin",
          createdAt: "2011-07-18T00:00:00Z",
          publicRepos: 146,
          followers: 34_200,
        },
        repos,
      },
    },
    onchain: [
      demoOnchainEntry(1, 1_240, 950, 18_430),
      demoOnchainEntry(11155111, 86, 0, 420),
    ],
    ensInternal: {
      kind: "ok",
      value: {
        name: "vitalik.eth",
        registrationDate: 1_507_852_800,
        subnameCount: 12,
        textRecordCount: 7,
        lastRecordUpdateBlock: MAINNET_LATEST_BLOCK,
      },
    },
    crossChain: null,
    failures: [],
  };
}

const MAINNET_PUBLIC: MockSubjectInput = {
  name: "vitalik.eth",
  chainId: 1,
  mode: "public-read",
  kind: null,
  // `scoreFromEvidence` below makes the real score engine authoritative.
  // These component rows mirror the same target band for legacy readers:
  // seniority ≈ 0.67, relevance ≈ 0.85, final ≈ 76.
  seniorityComponents: [
    comp("compileSuccess", 0.25, 1.0, "verified", "computed"),
    comp("ciPassRate", 0.2, 0.95, "unverified", "computed"),
    comp("testPresence", 0.15, 1.0, "unverified", "computed"),
    comp("bugHygiene", 0.1, 0.92, "unverified", "computed"),
    comp("repoHygiene", 0.15, 1.0, "unverified", "computed"),
    comp("releaseCadence", 0.15, 0.85, "unverified", "computed"),
  ],
  // Relevance Σ ≈ 0.85 (full sources at high recency).
  relevanceComponents: [
    comp("sourcifyRecency", 0.3, 1.0, "verified", "computed"),
    comp("githubRecency", 0.3, 0.92, "unverified", "computed"),
    comp("onchainRecency", 0.25, 0.95, "verified", "computed"),
    comp("ensRecency", 0.15, 1.0, "verified", "computed"),
  ],
  githubVerified: false,
  nonZeroSourceCount: 4,
  evidenceOverride: buildVitalikTierADemoEvidence(),
  scoreFromEvidence: true,
};

function buildResult(input: MockSubjectInput): LoadBenchLoaded {
  const evidence = buildEvidence(input);
  return {
    kind: "loaded",
    evidence,
    score: input.scoreFromEvidence
      ? computeScore(evidence, { nowSeconds: DEMO_NOW_SECONDS })
      : buildScore(input),
    engines: [],
  };
}

/**
 * Map ENS name → frozen demo result. `loadBench` checks this map
 * before hitting the orchestrator. Names are matched case-insensitively
 * to mirror ENS resolver behaviour.
 */
const DEMO_MOCK_BY_NAME = new Map<string, LoadBenchLoaded>([
  [AGENT_CURATED.name.toLowerCase(), buildResult(AGENT_CURATED)],
  [HUMAN_PUBLIC.name.toLowerCase(), buildResult(HUMAN_PUBLIC)],
  [RICH_RECORDS.name.toLowerCase(), buildResult(RICH_RECORDS)],
  [MAINNET_PUBLIC.name.toLowerCase(), buildResult(MAINNET_PUBLIC)],
]);

export function getDemoMock(name: string): LoadBenchLoaded | undefined {
  const trimmed = name.trim().toLowerCase();
  return DEMO_MOCK_BY_NAME.get(trimmed);
}

export function isDemoMockSubject(name: string): boolean {
  return DEMO_MOCK_BY_NAME.has(name.trim().toLowerCase());
}

export const DEMO_MOCK_NAMES = Array.from(DEMO_MOCK_BY_NAME.keys());
