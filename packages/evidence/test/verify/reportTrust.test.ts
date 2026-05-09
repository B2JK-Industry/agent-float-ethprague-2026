import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { describe, expect, it } from 'vitest';

import {
  signReport,
  type Address,
  type SirenReport,
} from '@upgrade-siren/shared';

import {
  computeReportBytesHash,
  verifyReportFromManifest,
} from '../../src/verify/reportTrust.js';
import { MANIFEST_SCHEMA_V1, type UpgradeManifest } from '../../src/manifest/types.js';

const PROXY: Address = '0x1111111111111111111111111111111111111111';
const IMPL_PREV: Address = '0x2222222222222222222222222222222222222222';
const IMPL_CURR: Address = '0x3333333333333333333333333333333333333333';

const baseReport: SirenReport = {
  schema: 'siren-report@1',
  name: 'vault.demo.upgradesiren.eth',
  chainId: 11155111,
  proxy: PROXY,
  previousImplementation: IMPL_PREV,
  currentImplementation: IMPL_CURR,
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

function buildManifest(reportHash: `0x${string}`): UpgradeManifest {
  return {
    schema: MANIFEST_SCHEMA_V1,
    chainId: 11155111,
    proxy: PROXY,
    previousImpl: IMPL_PREV,
    currentImpl: IMPL_CURR,
    reportUri: 'https://example.com/r/vault',
    reportHash,
    version: 2,
    effectiveFrom: '2026-05-09T00:00:00Z',
    previousManifestHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  };
}

async function signedReportAndBytes(privateKey: `0x${string}`): Promise<{
  account: Address;
  bytes: string;
  reportHash: `0x${string}`;
}> {
  const result = await signReport(baseReport, privateKey);
  const bytes = JSON.stringify(result.report);
  const reportHash = computeReportBytesHash(bytes);
  return {
    account: privateKeyToAccount(privateKey).address as Address,
    bytes,
    reportHash,
  };
}

describe('computeReportBytesHash', () => {
  it('returns a stable 32-byte hex hash', () => {
    const h = computeReportBytesHash('hello');
    expect(h).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(h).toBe(computeReportBytesHash('hello'));
  });

  it('different bytes produce different hashes', () => {
    expect(computeReportBytesHash('a')).not.toBe(computeReportBytesHash('b'));
  });

  it('accepts both string and Uint8Array', () => {
    const s = computeReportBytesHash('demo');
    const b = computeReportBytesHash(new TextEncoder().encode('demo'));
    expect(s).toBe(b);
  });
});

describe('verifyReportFromManifest — happy path', () => {
  it('returns ok with the signed report and signer when hash + signature match', async () => {
    const pk = generatePrivateKey();
    const { account, bytes, reportHash } = await signedReportAndBytes(pk);
    const manifest = buildManifest(reportHash);

    const r = await verifyReportFromManifest(manifest, bytes, account);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.signer.toLowerCase()).toBe(account.toLowerCase());
      expect(r.reportHash).toBe(reportHash);
      expect(r.report.verdict).toBe('SAFE');
    }
  });

  it('accepts Uint8Array fetchedBytes (server-side fetch returning a Buffer)', async () => {
    const pk = generatePrivateKey();
    const { account, bytes, reportHash } = await signedReportAndBytes(pk);
    const manifest = buildManifest(reportHash);

    const r = await verifyReportFromManifest(
      manifest,
      new TextEncoder().encode(bytes),
      account,
    );
    expect(r.kind).toBe('ok');
  });
});

describe('verifyReportFromManifest — integrity failures', () => {
  it('hash_mismatch: bytes do not match manifest.reportHash', async () => {
    const pk = generatePrivateKey();
    const { account, bytes } = await signedReportAndBytes(pk);
    const manifest = buildManifest('0x' + 'aa'.repeat(32) as `0x${string}`);

    const r = await verifyReportFromManifest(manifest, bytes, account);
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.reason).toBe('hash_mismatch');
      expect(r.expectedReportHash).toBe(manifest.reportHash);
      expect(r.computedReportHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(r.computedReportHash).not.toBe(manifest.reportHash);
    }
  });

  it('hash_mismatch is detected before parsing (defense in depth)', async () => {
    const manifest = buildManifest('0x' + 'aa'.repeat(32) as `0x${string}`);
    // Garbage bytes that wouldn't even parse — but hash_mismatch fires first.
    const r = await verifyReportFromManifest(
      manifest,
      'not-json-at-all',
      '0x1111111111111111111111111111111111111111' as Address,
    );
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.reason).toBe('hash_mismatch');
  });
});

describe('verifyReportFromManifest — shape failures', () => {
  it('malformed_json: bytes match the hash but are not JSON', async () => {
    const bytes = 'not json at all';
    const manifest = buildManifest(computeReportBytesHash(bytes));
    const r = await verifyReportFromManifest(
      manifest,
      bytes,
      '0x1111111111111111111111111111111111111111' as Address,
    );
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.reason).toBe('malformed_json');
  });

  it('malformed_report_shape: top-level array', async () => {
    const bytes = '[]';
    const manifest = buildManifest(computeReportBytesHash(bytes));
    const r = await verifyReportFromManifest(
      manifest,
      bytes,
      '0x1111111111111111111111111111111111111111' as Address,
    );
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.reason).toBe('malformed_report_shape');
  });

  it('malformed_report_shape: missing auth', async () => {
    const bytes = JSON.stringify({ verdict: 'SAFE' });
    const manifest = buildManifest(computeReportBytesHash(bytes));
    const r = await verifyReportFromManifest(
      manifest,
      bytes,
      '0x1111111111111111111111111111111111111111' as Address,
    );
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.reason).toBe('malformed_report_shape');
  });

  it('malformed_report_shape: passes auth-presence check but throws inside buildSirenReportTypedData', async () => {
    // Auth is shape-OK (object, non-null), so step 2 accepts the report.
    // But chainId is a string instead of a number, so
    // buildSirenReportTypedData throws when constructing the EIP-712 domain.
    // The fix wraps verifyReportSignature in try/catch and surfaces this as
    // malformed_report_shape rather than letting it propagate to a 500.
    const bytes = JSON.stringify({
      verdict: 'SAFE',
      chainId: 'not-a-number',
      proxy: '0x' + '11'.repeat(20),
      auth: {
        status: 'valid',
        signatureType: 'EIP-712',
        signer: '0x' + '22'.repeat(20),
        signature: '0x' + 'aa'.repeat(65),
        signedAt: '2026-05-09T00:00:00Z',
      },
    });
    const manifest = buildManifest(computeReportBytesHash(bytes));
    const r = await verifyReportFromManifest(
      manifest,
      bytes,
      '0x1111111111111111111111111111111111111111' as Address,
    );
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.reason).toBe('malformed_report_shape');
      expect(r.message).toContain('typed data');
    }
  });
});

describe('verifyReportFromManifest — authority failures', () => {
  it('signature_missing: report has unsigned auth block', async () => {
    const bytes = JSON.stringify(baseReport);
    const manifest = buildManifest(computeReportBytesHash(bytes));
    const r = await verifyReportFromManifest(
      manifest,
      bytes,
      '0x1111111111111111111111111111111111111111' as Address,
    );
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.reason).toBe('signature_missing');
  });

  it('owner_mismatch: signature recovers to a different address', async () => {
    const pk = generatePrivateKey();
    const { bytes, reportHash } = await signedReportAndBytes(pk);
    const manifest = buildManifest(reportHash);

    const wrongOwner: Address = '0x9999999999999999999999999999999999999999';
    const r = await verifyReportFromManifest(manifest, bytes, wrongOwner);
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.reason).toBe('owner_mismatch');
      expect(r.recovered?.toLowerCase()).toBe(
        privateKeyToAccount(pk).address.toLowerCase(),
      );
    }
  });

  it('signature_invalid: tampered signature length', async () => {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk).address as Address;
    const tampered: SirenReport = {
      ...baseReport,
      auth: {
        status: 'valid',
        signatureType: 'EIP-712',
        signer: account,
        signature: '0xdead' as SirenReport['auth']['signature'],
        signedAt: '2026-05-09T00:00:00Z',
      },
    };
    const bytes = JSON.stringify(tampered);
    const manifest = buildManifest(computeReportBytesHash(bytes));
    const r = await verifyReportFromManifest(manifest, bytes, account);
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.reason).toBe('signature_invalid');
  });
});

describe('verifyReportFromManifest — full pipeline tampering attack', () => {
  it('flipping verdict in the bytes also breaks reportHash, surfaces hash_mismatch first', async () => {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk).address as Address;
    const signed = await signReport(baseReport, pk);

    const honestBytes = JSON.stringify(signed.report);
    const manifest = buildManifest(computeReportBytesHash(honestBytes));

    // Attacker rewrites bytes to flip verdict to SAFE (was already SAFE here,
    // illustrate by swapping summary). Bytes mutated -> hash mismatch wins
    // before we even parse, regardless of signature status.
    const tamperedBytes = JSON.stringify({
      ...signed.report,
      summary: 'falsely positive',
    });
    const r = await verifyReportFromManifest(manifest, tamperedBytes, account);
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.reason).toBe('hash_mismatch');
  });
});
