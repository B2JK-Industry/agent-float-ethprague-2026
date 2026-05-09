import { describe, expect, it } from 'vitest';

import type { MultiSourceEvidence, SubjectIdentity } from '../../src/index.js';
import { onchainRecency } from '../../src/score/components.js';

const PRIMARY = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;

const subject: SubjectIdentity = {
  name: 'x.eth',
  chainId: 1,
  mode: 'manifest',
  primaryAddress: PRIMARY,
  kind: 'ai-agent',
  manifest: null,
};

function evidenceWith(onchain: MultiSourceEvidence['onchain']): MultiSourceEvidence {
  return {
    subject,
    sourcify: [],
    github: { kind: 'absent' },
    onchain,
    ensInternal: { kind: 'absent' },
    crossChain: null,
    failures: [],
  };
}

describe('onchainRecency (US-115b indexer flip)', () => {
  it('falls back to nonce/cap-1000 when no entry has transferCountRecent90d', () => {
    const r = onchainRecency(evidenceWith([
      { kind: 'ok', chainId: 1, value: { chainId: 1, address: PRIMARY, nonce: 800, firstTxBlock: 1n, firstTxTimestamp: 1, latestBlock: 100n } },
    ]));
    expect(r.value).toBe(0.8);
    expect(r.note).toContain('fallback');
    expect(r.note).toContain('nonce');
  });

  it('flips to indexer-backed signal when transferCountRecent90d is present on at least one chain', () => {
    const r = onchainRecency(evidenceWith([
      { kind: 'ok', chainId: 1, value: { chainId: 1, address: PRIMARY, nonce: 800, firstTxBlock: 1n, firstTxTimestamp: 1, latestBlock: 100n, transferCountRecent90d: 350, transferCountProvider: 'alchemy' } },
      { kind: 'ok', chainId: 11155111, value: { chainId: 11155111, address: PRIMARY, nonce: 50, firstTxBlock: 1n, firstTxTimestamp: 1, latestBlock: 100n, transferCountRecent90d: 100, transferCountProvider: 'alchemy' } },
    ]));
    expect(r.value).toBe(0.45); // (350 + 100) / 1000
    expect(r.note).toContain('transferCountRecent90d');
    expect(r.note).toContain('alchemy');
  });

  it('uses indexer-backed even when only one chain has the field set', () => {
    const r = onchainRecency(evidenceWith([
      { kind: 'ok', chainId: 1, value: { chainId: 1, address: PRIMARY, nonce: 5000, firstTxBlock: 1n, firstTxTimestamp: 1, latestBlock: 100n } }, // would clamp 1.0 on fallback
      { kind: 'ok', chainId: 11155111, value: { chainId: 11155111, address: PRIMARY, nonce: 0, firstTxBlock: null, firstTxTimestamp: null, latestBlock: 100n, transferCountRecent90d: 200, transferCountProvider: 'etherscan' } },
    ]));
    // Indexer signal preferred → 200 / 1000 = 0.2 (NOT 1.0 nonce-based)
    expect(r.value).toBe(0.2);
    expect(r.note).toContain('etherscan');
  });

  it('clamps indexer-backed value to 1.0 when total ≥ 1000', () => {
    const r = onchainRecency(evidenceWith([
      { kind: 'ok', chainId: 1, value: { chainId: 1, address: PRIMARY, nonce: 0, firstTxBlock: null, firstTxTimestamp: null, latestBlock: 100n, transferCountRecent90d: 5000, transferCountProvider: 'alchemy' } },
    ]));
    expect(r.value).toBe(1.0);
  });

  it('treats transferCountRecent90d=0 as a real indexer-backed signal (not fallback)', () => {
    const r = onchainRecency(evidenceWith([
      { kind: 'ok', chainId: 1, value: { chainId: 1, address: PRIMARY, nonce: 999, firstTxBlock: 1n, firstTxTimestamp: 1, latestBlock: 100n, transferCountRecent90d: 0, transferCountProvider: 'alchemy' } },
    ]));
    expect(r.value).toBe(0);
    expect(r.note).toContain('transferCountRecent90d');
  });

  it('returns null_no_data when no on-chain entries exist at all', () => {
    const r = onchainRecency(evidenceWith([]));
    expect(r.status).toBe('null_no_data');
  });
});
