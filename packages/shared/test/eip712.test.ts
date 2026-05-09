import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { recoverTypedDataAddress } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SIREN_REPORT_DOMAIN_NAME,
  SIREN_REPORT_DOMAIN_VERSION,
  SIREN_REPORT_TYPED_DATA_TYPES,
  ZERO_ADDRESS,
  buildSirenReportDomain,
  buildSirenReportTypedData,
  signReport,
  type SirenReport,
} from '../src/index.js';

const baseReport: SirenReport = {
  schema: 'siren-report@1',
  name: 'vault.demo.upgradesiren.eth',
  chainId: 11155111,
  proxy: '0x1111111111111111111111111111111111111111',
  previousImplementation: '0x2222222222222222222222222222222222222222',
  currentImplementation: '0x3333333333333333333333333333333333333333',
  verdict: 'SAFE',
  summary: 'Verified upgrade with compatible storage layout.',
  findings: [],
  sourcify: { previousVerified: true, currentVerified: true, links: [] },
  mode: 'signed-manifest',
  confidence: 'operator-signed',
  ens: {
    recordsResolvedLive: true,
    manifestHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
    owner: '0x5555555555555555555555555555555555555555',
  },
  auth: {
    status: 'unsigned',
    signatureType: null,
    signer: null,
    signature: null,
    signedAt: null,
  },
  recommendedAction: 'approve',
  mock: false,
  generatedAt: '2026-05-09T00:00:00Z',
};

describe('buildSirenReportDomain', () => {
  it('produces the canonical domain fields', () => {
    const domain = buildSirenReportDomain(11155111);
    expect(domain).toEqual({
      name: SIREN_REPORT_DOMAIN_NAME,
      version: SIREN_REPORT_DOMAIN_VERSION,
      chainId: 11155111,
      verifyingContract: ZERO_ADDRESS,
    });
  });
});

describe('buildSirenReportTypedData', () => {
  it('lifts SirenReport into the EIP-712 message structure', () => {
    const td = buildSirenReportTypedData(baseReport);
    expect(td.primaryType).toBe('SirenReport');
    expect(td.types).toBe(SIREN_REPORT_TYPED_DATA_TYPES);
    expect(td.domain.chainId).toBe(11155111);
    expect(td.domain.verifyingContract).toBe(ZERO_ADDRESS);
    expect(td.message.name).toBe('vault.demo.upgradesiren.eth');
    expect(td.message.chainId).toBe(11155111n);
    expect(td.message.proxy).toBe('0x1111111111111111111111111111111111111111');
    expect(td.message.previousImplementation).toBe('0x2222222222222222222222222222222222222222');
    expect(td.message.currentImplementation).toBe('0x3333333333333333333333333333333333333333');
    expect(td.message.verdict).toBe('SAFE');
    expect(td.message.mode).toBe('signed-manifest');
    expect(td.message.confidence).toBe('operator-signed');
    expect(td.message.summary).toBe('Verified upgrade with compatible storage layout.');
    expect(td.message.generatedAt).toBe('2026-05-09T00:00:00Z');
  });

  it('substitutes ZERO_ADDRESS when previousImplementation is null', () => {
    const initialReport: SirenReport = { ...baseReport, previousImplementation: null };
    const td = buildSirenReportTypedData(initialReport);
    expect(td.message.previousImplementation).toBe(ZERO_ADDRESS);
  });

  it('enumerates exactly the expected typed-data fields in order', () => {
    expect(SIREN_REPORT_TYPED_DATA_TYPES.SirenReport.map((field) => field.name)).toEqual([
      'name',
      'chainId',
      'proxy',
      'previousImplementation',
      'currentImplementation',
      'verdict',
      'mode',
      'confidence',
      'generatedAt',
      'summary',
    ]);
  });
});

describe('signReport', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('signs the report and populates the auth field for a valid round-trip', async () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const fixedNow = new Date('2026-05-09T00:00:01.000Z');

    const result = await signReport(baseReport, privateKey, { now: () => fixedNow });

    expect(result.signer).toBe(account.address);
    expect(result.report.auth.status).toBe('valid');
    expect(result.report.auth.signatureType).toBe('EIP-712');
    expect(result.report.auth.signer).toBe(account.address);
    expect(result.report.auth.signedAt).toBe('2026-05-09T00:00:01.000Z');
    expect(result.report.auth.signature).toBe(result.signature);
    expect(result.signature).toMatch(/^0x[a-fA-F0-9]{130}$/);

    const td = buildSirenReportTypedData(baseReport);
    const recovered = await recoverTypedDataAddress({
      domain: td.domain,
      types: td.types,
      primaryType: td.primaryType,
      message: td.message,
      signature: result.signature,
    });

    expect(recovered).toBe(account.address);
  });

  it('does not log the private key or signature to any console method', async () => {
    const privateKey = generatePrivateKey();
    await signReport(baseReport, privateKey);

    const allCalls = [
      ...logSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
      ...infoSpy.mock.calls,
      ...debugSpy.mock.calls,
    ];

    for (const call of allCalls) {
      const serialized = call.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
      expect(serialized).not.toContain(privateKey);
    }
  });

  it('returns the original report fields untouched apart from auth', async () => {
    const privateKey = generatePrivateKey();
    const result = await signReport(baseReport, privateKey);

    const { auth: _ignoredA, ...restSigned } = result.report;
    const { auth: _ignoredB, ...restOriginal } = baseReport;
    void _ignoredA;
    void _ignoredB;

    expect(restSigned).toEqual(restOriginal);
  });
});
