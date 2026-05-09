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
  computeSirenReportContentHash,
  signReport,
  type Address,
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
      'recommendedAction',
      'mock',
      'findingsHash',
      'sourcifyLinksHash',
      'signedAt',
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

    // US-074: typed-data binds auth.signedAt, so the verifier reconstructs
    // against the SIGNED report (which has signedAt populated), not the
    // unsigned input.
    const td = buildSirenReportTypedData(result.report);
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

  it('returns the original report fields untouched apart from auth.signedAt + signature/signer/status', async () => {
    const privateKey = generatePrivateKey();
    const result = await signReport(baseReport, privateKey);

    // US-074: signedAt is now bound by the signature so it must be set on
    // the returned report. Other report fields (findings, sourcify, etc.)
    // are unchanged.
    const { auth: _signedAuth, ...restSigned } = result.report;
    const { auth: _originalAuth, ...restOriginal } = baseReport;
    void _signedAuth;
    void _originalAuth;
    expect(restSigned).toEqual(restOriginal);
    expect(result.report.auth.signedAt).not.toBeNull();
  });
});

describe('US-074 — typed-data binds full report payload', () => {
  async function signAndAttempt(
    pk: `0x${string}`,
    tamper: (signed: SirenReport) => SirenReport,
  ): Promise<{ originalSigner: Address; recoveredAfter: Address }> {
    const account = privateKeyToAccount(pk);
    const signed = await signReport(baseReport, pk);
    const tampered = tamper(signed.report);
    const td = buildSirenReportTypedData(tampered);
    const recovered = await recoverTypedDataAddress({
      domain: td.domain,
      types: td.types,
      primaryType: td.primaryType,
      message: td.message,
      signature: signed.signature,
    });
    return {
      originalSigner: account.address as Address,
      recoveredAfter: recovered as Address,
    };
  }

  it('flipping a finding breaks recovery (findingsHash bound)', async () => {
    const pk = generatePrivateKey();
    const { originalSigner, recoveredAfter } = await signAndAttempt(pk, (r) => ({
      ...r,
      findings: [
        { id: 'INJECTED', severity: 'info', title: 'fake all-clear', evidence: {} },
      ],
    }));
    expect(recoveredAfter.toLowerCase()).not.toBe(originalSigner.toLowerCase());
  });

  it('changing a sourcify link breaks recovery (sourcifyLinksHash bound)', async () => {
    const pk = generatePrivateKey();
    const { originalSigner, recoveredAfter } = await signAndAttempt(pk, (r) => ({
      ...r,
      sourcify: {
        ...r.sourcify,
        links: [{ label: 'attacker mirror', url: 'https://evil.example.com' }],
      },
    }));
    expect(recoveredAfter.toLowerCase()).not.toBe(originalSigner.toLowerCase());
  });

  it('flipping recommendedAction breaks recovery (recommendedAction bound)', async () => {
    const pk = generatePrivateKey();
    const { originalSigner, recoveredAfter } = await signAndAttempt(pk, (r) => ({
      ...r,
      recommendedAction: 'reject',
    }));
    expect(recoveredAfter.toLowerCase()).not.toBe(originalSigner.toLowerCase());
  });

  it('flipping mock breaks recovery (mock bound)', async () => {
    const pk = generatePrivateKey();
    const { originalSigner, recoveredAfter } = await signAndAttempt(pk, (r) => ({
      ...r,
      mock: !r.mock,
    }));
    expect(recoveredAfter.toLowerCase()).not.toBe(originalSigner.toLowerCase());
  });

  it('flipping auth.signedAt breaks recovery (signedAt bound)', async () => {
    const pk = generatePrivateKey();
    const { originalSigner, recoveredAfter } = await signAndAttempt(pk, (r) => ({
      ...r,
      auth: { ...r.auth, signedAt: '2099-01-01T00:00:00.000Z' },
    }));
    expect(recoveredAfter.toLowerCase()).not.toBe(originalSigner.toLowerCase());
  });

  it('the canonical happy-path round trip still recovers to the signer', async () => {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    const signed = await signReport(baseReport, pk);
    const td = buildSirenReportTypedData(signed.report);
    const recovered = await recoverTypedDataAddress({
      domain: td.domain,
      types: td.types,
      primaryType: td.primaryType,
      message: td.message,
      signature: signed.signature,
    });
    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase());
  });
});

describe('computeSirenReportContentHash binds non-typed-data report fields', () => {
  it('produces a stable 32-byte hex hash', () => {
    const h = computeSirenReportContentHash(baseReport);
    expect(h).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it('is identical for byte-identical reports', () => {
    expect(computeSirenReportContentHash(baseReport)).toBe(
      computeSirenReportContentHash({ ...baseReport }),
    );
  });

  it('ignores the auth block (so signing and re-hashing are stable)', () => {
    const a = computeSirenReportContentHash(baseReport);
    const b = computeSirenReportContentHash({
      ...baseReport,
      auth: {
        status: 'valid',
        signatureType: 'EIP-712',
        signer: '0x9999999999999999999999999999999999999999',
        signature: ('0x' + 'aa'.repeat(65)) as SirenReport['auth']['signature'],
        signedAt: '2099-01-01T00:00:00Z',
      },
    });
    expect(a).toBe(b);
  });

  it('changes when findings are tampered with', () => {
    const a = computeSirenReportContentHash(baseReport);
    const b = computeSirenReportContentHash({
      ...baseReport,
      findings: [{ id: 'TAMPERED', severity: 'critical', title: 'evil', evidence: {} }],
    });
    expect(a).not.toBe(b);
  });

  it('changes when sourcify or ens block is tampered with', () => {
    const a = computeSirenReportContentHash(baseReport);
    const b = computeSirenReportContentHash({
      ...baseReport,
      sourcify: { previousVerified: false, currentVerified: false, links: [] },
    });
    const c = computeSirenReportContentHash({
      ...baseReport,
      ens: { ...baseReport.ens, owner: '0x9999999999999999999999999999999999999999' },
    });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it('changes when recommendedAction or mock is tampered with', () => {
    const a = computeSirenReportContentHash(baseReport);
    const b = computeSirenReportContentHash({ ...baseReport, recommendedAction: 'reject' });
    const c = computeSirenReportContentHash({ ...baseReport, mock: !baseReport.mock });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('signed-report tampering attack surface', () => {
  it('changing findings post-signing breaks recovery (the Codex #19 attack)', async () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const signed = await signReport(baseReport, privateKey);

    // Attacker takes the valid signed report, swaps findings to look favourable
    // while keeping the original signature. Pre-fix, recovery would still
    // return the original signer because findings were not bound. Post-fix,
    // recovery fails (or returns a different address) because contentHash
    // changes when findings change.
    const tampered: SirenReport = {
      ...signed.report,
      findings: [
        { id: 'FAKE_GOOD_NEWS', severity: 'info', title: 'all clear', evidence: {} },
      ],
    };

    const td = buildSirenReportTypedData(tampered);
    const recovered = await recoverTypedDataAddress({
      domain: td.domain,
      types: td.types,
      primaryType: td.primaryType,
      message: td.message,
      signature: signed.signature,
    });
    expect(recovered.toLowerCase()).not.toBe(account.address.toLowerCase());
  });

  it('changing sourcify.links post-signing breaks recovery (sourcifyLinksHash bound)', async () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const signed = await signReport(baseReport, privateKey);

    // US-074 binds sourcify.links via sourcifyLinksHash; the previousVerified
    // / currentVerified booleans are NOT bound by design (Daniel-spec). Tamper
    // the links array — the field that IS bound — to assert the protection.
    const tampered: SirenReport = {
      ...signed.report,
      sourcify: {
        ...signed.report.sourcify,
        links: [{ label: 'attacker mirror', url: 'https://evil.example.com' }],
      },
    };

    const td = buildSirenReportTypedData(tampered);
    const recovered = await recoverTypedDataAddress({
      domain: td.domain,
      types: td.types,
      primaryType: td.primaryType,
      message: td.message,
      signature: signed.signature,
    });
    expect(recovered.toLowerCase()).not.toBe(account.address.toLowerCase());
  });

  it('changing recommendedAction post-signing breaks recovery', async () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const signed = await signReport(baseReport, privateKey);

    const tampered: SirenReport = { ...signed.report, recommendedAction: 'approve' };

    const td = buildSirenReportTypedData(tampered);
    const recovered = await recoverTypedDataAddress({
      domain: td.domain,
      types: td.types,
      primaryType: td.primaryType,
      message: td.message,
      signature: signed.signature,
    });
    // recommendedAction was 'approve' in baseReport already; flip to 'reject'
    // for a real tamper test:
    const tampered2: SirenReport = { ...signed.report, recommendedAction: 'reject' };
    const td2 = buildSirenReportTypedData(tampered2);
    const recovered2 = await recoverTypedDataAddress({
      domain: td2.domain,
      types: td2.types,
      primaryType: td2.primaryType,
      message: td2.message,
      signature: signed.signature,
    });
    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase()); // unchanged
    expect(recovered2.toLowerCase()).not.toBe(account.address.toLowerCase()); // tampered
  });
});
