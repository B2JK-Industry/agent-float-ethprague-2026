export {
  EIP1967_IMPLEMENTATION_SLOT,
  extractImplementationFromSlot,
  readImplementationSlot,
} from './chain/eip1967.js';

export type {
  Eip1967ReadResult,
  Eip1967ReadOk,
  Eip1967ReadError,
} from './chain/eip1967.js';

export {
  UPGRADED_EVENT,
  readUpgradeEvents,
} from './chain/upgradeEvents.js';

export type {
  UpgradeEvent,
  UpgradeEventsReadResult,
  UpgradeEventsReadOk,
  UpgradeEventsReadError,
} from './chain/upgradeEvents.js';

export { verifyReportSignature } from './verify/signature.js';

export type {
  VerifySignatureResult,
  VerifySignatureValid,
  VerifySignatureInvalid,
  VerifySignatureFailureReason,
} from './verify/signature.js';

export {
  computeReportBytesHash,
  verifyReportFromManifest,
} from './verify/reportTrust.js';

export type {
  ReportTrustFailureReason,
  ReportTrustOk,
  ReportTrustError,
  ReportTrustResult,
} from './verify/reportTrust.js';

export { resolveEnsRecords } from './ens/resolve.js';

export type {
  EnsRecordSet,
  EnsResolutionError,
  EnsResolutionFlags,
  EnsResolutionOk,
  EnsResolutionResult,
  UpgradeSirenRecordKey,
} from './ens/types.js';

export { UPGRADE_SIREN_RECORD_KEYS } from './ens/types.js';

export {
  RISKY_SELECTOR_NAMES,
  diffAbiRiskySelectors,
  isRiskySelectorName,
} from './diff/abi.js';

export type {
  AbiRiskyDiff,
  RiskySelectorName,
  SelectorMatch,
} from './diff/abi.js';

export {
  DEFAULT_BACKOFF_MS,
  NetworkUnavailable,
  readRpcConfigForChain,
  retryableFetch,
  withPrimaryFallback,
  withRetry,
} from './network/retry.js';

export type {
  NetworkUnavailableError,
  PrimaryFallbackUrls,
  RetryOptions,
} from './network/retry.js';

export {
  FOURBYTE_BASE_URL,
  lookup4byteSelectors,
} from './sourcify/fourbyte.js';

export type {
  FourByteError,
  FourByteFailureReason,
  FourByteLookupResult,
  FourByteLookupOk,
  FourByteLookupError,
  SelectorCandidate,
  SelectorLookup,
} from './sourcify/fourbyte.js';

export { fetchSourcifyStatus } from './sourcify/status.js';
export { fetchSourcifyMetadata } from './sourcify/metadata.js';
export { SOURCIFY_DEEP_FIELDS, fetchSourcifyDeep } from './sourcify/deep.js';

export type {
  FetchSourcifyDeepOptions,
  SourcifyDeep,
  SourcifyDeepCompilation,
  SourcifyDeepEventSignature,
  SourcifyDeepField,
  SourcifyDeepFunctionSignature,
  SourcifyDeepLicense,
  SourcifyDeepProxyImplementation,
  SourcifyDeepProxyResolution,
} from './sourcify/deep.js';

export type {
  FetchLike,
  Result,
  SourcifyError,
  SourcifyErrorReason,
  SourcifyMatchLevel,
  SourcifyMetadata,
  SourcifySourceFile,
  SourcifyStatus,
  SourcifyStorageLayout,
  SourcifyStorageLayoutEntry,
} from './sourcify/types.js';

export { SOURCIFY_BASE_URL } from './sourcify/types.js';

export { runPublicReadFallback } from './fallback/publicRead.js';

export type {
  PublicReadResult,
  PublicReadOk,
  PublicReadError,
  PublicReadFailureReason,
  PublicReadInputKind,
  RunPublicReadFallbackOptions,
} from './fallback/publicRead.js';

export { diffStorageLayout, entriesEqual, typesDeepEqual } from './diff/storage.js';

export type {
  StorageDiffChange,
  StorageDiffKind,
  StorageDiffResult,
  StorageLayout,
  StorageLayoutEntry,
} from './diff/storage.js';

export {
  bytecodeNgramConfidence,
  detectStorageLayoutMarkers,
  matchAgainstV1,
  qualifiesForV1DerivedReview,
  stripMetadataFooter,
} from './diff/bytecodeMatch.js';

export type {
  BytecodeHypothesis,
  BytecodeMatchResult,
  MatchAgainstV1Options,
  SelectorWithName,
  StorageLayoutMarkers,
} from './diff/bytecodeMatch.js';

export { diffSourceFiles } from './diff/source.js';

export type {
  SourceFileDiff,
  SourceFileHunkCounts,
  SourceFileStatus,
} from './diff/source.js';

export { parseUpgradeManifest } from './manifest/parse.js';

export type {
  ManifestError,
  ManifestErrorReason,
  ParseManifestResult,
  UpgradeManifest,
} from './manifest/types.js';

export { MANIFEST_SCHEMA_V1 } from './manifest/types.js';

export { classifyAbsentRecord } from './verdict/absentRecords.js';

export type {
  AbsentRecordInput,
  AbsentRecordMode,
  AbsentRecordVerdict,
  AbsentRecordVerdictReason,
} from './verdict/absentRecords.js';

export { computeVerdict } from './verdict/engine.js';

export type {
  ComputeVerdictInput,
  ComputeVerdictOptions,
  ComputeVerdictResult,
  StorageDiffResultLike,
  Verdict,
  VerdictConfidence,
  VerdictMode,
} from './verdict/engine.js';

export { FINDING_IDS, makeFinding } from './verdict/findings.js';

export type { Finding, FindingId, FindingSeverity } from './verdict/findings.js';

export {
  DEFAULT_GRACE_SECONDS,
  applyManifestGracePolicy,
  readGraceSecondsFromEnv,
} from './verdict/gracePolicy.js';

export type {
  ManifestGraceDecision,
  ManifestGraceInput,
  ManifestGraceMode,
  ManifestGraceOptions,
} from './verdict/gracePolicy.js';

export {
  canonicalManifestJson,
  hashManifest,
  validateManifestChain,
} from './manifest/chain.js';

export type {
  ManifestChainFailureReason,
  ManifestChainInvalid,
  ManifestChainResult,
  ManifestChainValid,
} from './manifest/chain.js';

export {
  SourcifyCache,
  fetchSourcifyMetadataCached,
  fetchSourcifyStatusCached,
} from './sourcify/cache.js';

export type {
  CachedFetchOptions,
  SourcifyCacheOptions,
  SourcifyEndpoint,
} from './sourcify/cache.js';

export {
  BENCH_CACHE_KEYS,
  BENCH_CACHE_TTLS,
  BenchCache,
  sourcifyDeepTtlMs,
} from './cache/benchCache.js';

export type { BenchCacheOptions } from './cache/benchCache.js';

export { resolveSubjectFromEns } from './subject/resolver.js';
export { validateSubjectManifest } from './subject/validate.js';

export type {
  AgentBenchRecordSet,
  AgentBenchResolutionFlags,
  SubjectResolutionError,
  SubjectResolutionFailureReason,
  SubjectResolutionNoManifest,
  SubjectResolutionOk,
  SubjectResolutionResult,
  SubjectSchemaError,
} from './subject/types.js';

export type { ResolveSubjectOptions } from './subject/resolver.js';
export type { ValidateSubjectManifestResult } from './subject/validate.js';

export { fetchOnchainActivity } from './sources/onchain/activity.js';

export type {
  FetchOnchainActivityOptions,
} from './sources/onchain/activity.js';

export type {
  OnchainActivity,
  OnchainActivityError,
  OnchainActivityFailureReason,
  OnchainActivityOk,
  OnchainActivityResult,
} from './sources/onchain/types.js';

export {
  countContractsDeployedBy,
  crosswalkDeployers,
} from './sources/onchain/crosswalk.js';

export type {
  DeployerCrosswalkResult,
  DeployerLookup,
} from './sources/onchain/crosswalk.js';

export { fetchEnsInternalSignals } from './sources/ens-internal/fetch.js';

export type { FetchEnsInternalSignalsOptions } from './sources/ens-internal/fetch.js';

export {
  ENS_SUBGRAPH_ID,
} from './sources/ens-internal/types.js';

export type {
  EnsInternalError,
  EnsInternalFailureReason,
  EnsInternalOk,
  EnsInternalResult,
  EnsInternalSignals,
} from './sources/ens-internal/types.js';

export { fetchSourcifyAllChains } from './sourcify/allChains.js';

export type {
  FetchSourcifyAllChainsOptions,
  SourcifyAllChainsEntry,
} from './sourcify/allChains.js';

export { inferSubjectFromPublicRead } from './subject/publicRead.js';

export type {
  InferSubjectFromPublicReadOptions,
  SubjectPublicReadError,
  SubjectPublicReadFailureReason,
  SubjectPublicReadInference,
  SubjectPublicReadInferredSources,
  SubjectPublicReadOk,
  SubjectPublicReadResolutionResult,
} from './subject/publicRead.js';

export { discoverCrossChainPresence } from './sourcify/crossChainDiscovery.js';

export type {
  CrossChainDiscoveryEntry,
  CrossChainDiscoveryFailure,
  CrossChainDiscoveryFailureReason,
  CrossChainDiscoveryResult,
  DiscoverCrossChainOptions,
} from './sourcify/crossChainDiscovery.js';

export { summarizeLicenseAndCompiler } from './sourcify/licenseCompiler.js';

export type {
  CompilerRecencyThreshold,
  CompilerSummary,
  LicenseCompilerSummary,
  LicenseCount,
} from './sourcify/licenseCompiler.js';

export { fetchGithubP0Source } from './sources/github/fetch.js';

export type { FetchGithubP0SourceOptions } from './sources/github/fetch.js';

export type {
  GithubFailureReason,
  GithubP0Error,
  GithubP0Ok,
  GithubP0Result,
  GithubP0Signals,
  GithubRepoP0,
  GithubUser,
} from './sources/github/types.js';

export { submitSimilarityVerification } from './sourcify/similarity.js';

export type {
  SimilarityOutcome,
  SimilarityPendingStatus,
  SimilarityStatus,
  SimilaritySubmitInitial,
  SimilarityTerminalStatus,
  SubmitSimilarityVerificationOptions,
} from './sourcify/similarity.js';

export { orchestrateSubject } from './bench/orchestrator.js';

export type { OrchestrateSubjectOptions } from './bench/orchestrator.js';

export type {
  EnsInternalEvidence,
  GithubEvidence,
  MultiSourceEvidence,
  OnchainEntryError,
  OnchainEntryEvidence,
  OnchainEntryOk,
  SourceFailure,
  SourcifyEntryError,
  SourcifyEntryEvidence,
  SourcifyEntryOk,
  SubjectIdentity,
  SubjectMode,
} from './bench/types.js';

export {
  AXIS_WEIGHTS,
  PUBLIC_READ_TIER_CAP,
  RELEVANCE_WEIGHTS,
  SENIORITY_WEIGHTS,
  TIER_THRESHOLDS,
  TRUST_DISCOUNT_UNVERIFIED,
  TRUST_DISCOUNT_VERIFIED,
  U_TIER_MIN_NONZERO_SOURCES,
  trustFactor,
} from './score/weights.js';

export type {
  RelevanceComponentId,
  SeniorityComponentId,
  TrustLabel,
  WeightedComponent,
} from './score/weights.js';

export { computeScore } from './score/engine.js';

export type { ComputeScoreOptions } from './score/engine.js';

export type {
  CeilingApplied,
  ComponentStatus,
  ScoreAxisBreakdown,
  ScoreComponentBreakdown,
  ScoreResult,
  Tier,
} from './score/types.js';

export {
  bugHygiene,
  ciPassRate,
  compileSuccess,
  ensRecency,
  githubRecency,
  nonZeroSourceCount,
  onchainRecency,
  releaseCadence,
  repoHygiene,
  sourcifyRecency,
  testPresence,
} from './score/components.js';

export type { ComponentValue } from './score/components.js';

export {
  classifyImplementationPair,
  classifySlot,
  computeProxyHygiene,
  computeSubjectHygiene,
} from './diff/storageHygiene.js';

export type {
  ImplementationLayoutInput,
  ProxyHygiene,
  ProxyHygienePair,
  ProxyHygienePairKind,
  SlotHygieneClass,
  SlotHygieneEntry,
  SubjectHygiene,
} from './diff/storageHygiene.js';

export { detectSourcePatterns } from './sourcify/patterns.js';

export type {
  SourcePatternId,
  SourcePatternMatch,
  SourcifySourceFileLike,
} from './sourcify/patterns.js';
