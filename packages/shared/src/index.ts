export type {
  Address,
  AuthStatus,
  FindingSeverity,
  Hex32,
  HexBytes,
  IsoDateTime,
  RecommendedAction,
  ReportConfidence,
  ReportMode,
  SignatureType,
  SirenReport,
  SirenReportAuth,
  SirenReportEns,
  SirenReportFinding,
  SirenReportSourcify,
  SirenReportSourcifyLink,
  Verdict,
} from './sirenReport.js';

export {
  AUTH_STATUSES,
  FINDING_SEVERITIES,
  RECOMMENDED_ACTIONS,
  REPORT_CONFIDENCES,
  REPORT_MODES,
  SIGNATURE_TYPES,
  SIREN_REPORT_SCHEMA_ID,
  VERDICTS,
} from './sirenReport.js';

export type {
  SirenReportTypedData,
  SirenReportTypedDataMessage,
  SirenReportTypedDataTypes,
} from './eip712/sirenReportTypedData.js';

export {
  SIREN_REPORT_DOMAIN_NAME,
  SIREN_REPORT_DOMAIN_VERSION,
  SIREN_REPORT_TYPED_DATA_TYPES,
  ZERO_ADDRESS,
  buildSirenReportDomain,
  buildSirenReportTypedData,
} from './eip712/sirenReportTypedData.js';

export type { SignReportResult } from './eip712/signReport.js';
export { signReport } from './eip712/signReport.js';
