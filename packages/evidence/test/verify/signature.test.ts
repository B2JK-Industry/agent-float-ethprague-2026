import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { describe, expect, it } from 'vitest';

import {
  signReport,
  type Address,
  type SirenReport,
} from '@upgrade-siren/shared';

import { verifyReportSignature } from '../../src/verify/signature.js';

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

describe('verifyReportSignature', () => {
  it('round-trips: sign with US-015 helper then verify here returns valid: true', async () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const signed = await signReport(baseReport, privateKey);

    const result = await verifyReportSignature(signed.report, account.address as Address);

    expect(result.valid).toBe(true);
    if (result.valid) expect(result.recovered.toLowerCase()).toBe(account.address.toLowerCase());
  });

  it('returns missing_signature when auth.signature is null and status is unsigned', async () => {
    const owner: Address = '0x5555555555555555555555555555555555555555';
    const result = await verifyReportSignature(baseReport, owner);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('missing_signature');
  });

  it('returns owner_mismatch with the recovered address when signer != owner', async () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const signed = await signReport(baseReport, privateKey);

    const wrongOwner: Address = '0x9999999999999999999999999999999999999999';
    const result = await verifyReportSignature(signed.report, wrongOwner);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('owner_mismatch');
      expect(result.recovered?.toLowerCase()).toBe(account.address.toLowerCase());
    }
  });

  it('returns malformed_signature for a syntactically invalid signature length', async () => {
    const owner: Address = '0x5555555555555555555555555555555555555555';
    const tampered: SirenReport = {
      ...baseReport,
      auth: {
        status: 'valid',
        signatureType: 'EIP-712',
        signer: owner,
        signature: '0xdead' as SirenReport['auth']['signature'],
        signedAt: '2026-05-09T00:00:00Z',
      },
    };
    const result = await verifyReportSignature(tampered, owner);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('malformed_signature');
  });

  it('returns malformed_signature when recovery fails (random hex of correct length)', async () => {
    const owner: Address = '0x5555555555555555555555555555555555555555';
    const garbageSig =
      '0x' + 'f'.repeat(130);
    const tampered: SirenReport = {
      ...baseReport,
      auth: {
        status: 'valid',
        signatureType: 'EIP-712',
        signer: owner,
        signature: garbageSig as SirenReport['auth']['signature'],
        signedAt: '2026-05-09T00:00:00Z',
      },
    };
    const result = await verifyReportSignature(tampered, owner);
    expect(result.valid).toBe(false);
    // viem may treat all-f as a valid recovery to a derived address (which won't match owner)
    // OR it may reject as malformed. Either way, not valid for our owner.
    if (!result.valid) {
      expect(['malformed_signature', 'owner_mismatch']).toContain(result.reason);
    }
  });

  it('detects tampering: changing the report after signing invalidates the signature', async () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const signed = await signReport(baseReport, privateKey);

    const tamperedReport: SirenReport = {
      ...signed.report,
      verdict: 'SIREN', // attacker flipped the verdict but kept the original signature
      summary: 'Now claiming SIREN!',
    };

    const result = await verifyReportSignature(tamperedReport, account.address as Address);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('owner_mismatch');
  });

  it('returns unsupported_signature_type when auth.signatureType is not EIP-712', async () => {
    const owner: Address = '0x5555555555555555555555555555555555555555';
    const odd: SirenReport = {
      ...baseReport,
      auth: {
        status: 'valid',
        signatureType: 'EIP-712', // schema enum only allows EIP-712 / null currently
        signer: owner,
        signature:
          ('0x' + '1'.repeat(130)) as SirenReport['auth']['signature'],
        signedAt: '2026-05-09T00:00:00Z',
      },
    };
    // Bypass the schema-narrowed type for the negative test with a runtime override:
    const subverted = {
      ...odd,
      auth: { ...odd.auth, signatureType: 'EIP-191' as unknown as 'EIP-712' },
    };
    const result = await verifyReportSignature(subverted as SirenReport, owner);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('unsupported_signature_type');
  });
});
