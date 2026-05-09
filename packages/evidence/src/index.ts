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
