// Canonical Siren Report type. Mirrors schemas/siren-report-v1.json.
// See docs/04-technical-design.md "Report Format" and SCOPE.md section 7 "Siren Report".

export type Address = `0x${string}`;
export type Hex32 = `0x${string}`;
export type HexBytes = `0x${string}`;
export type IsoDateTime = string;

export const VERDICTS = ['SAFE', 'REVIEW', 'SIREN'] as const;
export type Verdict = (typeof VERDICTS)[number];

export const REPORT_MODES = ['signed-manifest', 'public-read', 'mock'] as const;
export type ReportMode = (typeof REPORT_MODES)[number];

export const REPORT_CONFIDENCES = ['operator-signed', 'public-read', 'mock'] as const;
export type ReportConfidence = (typeof REPORT_CONFIDENCES)[number];

export const RECOMMENDED_ACTIONS = ['approve', 'review', 'reject', 'wait'] as const;
export type RecommendedAction = (typeof RECOMMENDED_ACTIONS)[number];

export const FINDING_SEVERITIES = ['info', 'warning', 'critical'] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export const AUTH_STATUSES = ['valid', 'unsigned', 'invalid'] as const;
export type AuthStatus = (typeof AUTH_STATUSES)[number];

export const SIGNATURE_TYPES = ['EIP-712'] as const;
export type SignatureType = (typeof SIGNATURE_TYPES)[number];

export interface SirenReportFinding {
  readonly id: string;
  readonly severity: FindingSeverity;
  readonly title: string;
  readonly evidence: Readonly<Record<string, unknown>>;
}

export interface SirenReportSourcifyLink {
  readonly label: string;
  readonly url: string;
}

export interface SirenReportSourcify {
  readonly previousVerified: boolean | null;
  readonly currentVerified: boolean;
  readonly links: ReadonlyArray<SirenReportSourcifyLink>;
}

export interface SirenReportEns {
  readonly recordsResolvedLive: boolean;
  readonly manifestHash: Hex32 | null;
  readonly owner: Address | null;
}

export interface SirenReportAuth {
  readonly status: AuthStatus;
  readonly signatureType: SignatureType | null;
  readonly signer: Address | null;
  readonly signature: HexBytes | null;
  readonly signedAt: IsoDateTime | null;
}

export interface SirenReport {
  readonly schema: 'siren-report@1';
  readonly name: string;
  readonly chainId: number;
  readonly proxy: Address;
  readonly previousImplementation: Address | null;
  readonly currentImplementation: Address;
  readonly verdict: Verdict;
  readonly summary: string;
  readonly findings: ReadonlyArray<SirenReportFinding>;
  readonly sourcify: SirenReportSourcify;
  readonly mode: ReportMode;
  readonly confidence: ReportConfidence;
  readonly ens: SirenReportEns;
  readonly auth: SirenReportAuth;
  readonly recommendedAction: RecommendedAction;
  readonly mock: boolean;
  readonly generatedAt: IsoDateTime;
}

export const SIREN_REPORT_SCHEMA_ID = 'siren-report@1' as const;
