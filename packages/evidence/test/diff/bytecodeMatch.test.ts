import { describe, expect, it } from 'vitest';

import {
  bytecodeNgramConfidence,
  detectStorageLayoutMarkers,
  matchAgainstV1,
  qualifiesForV1DerivedReview,
  stripMetadataFooter,
} from '../../src/diff/bytecodeMatch.js';

// Synthetic bytecode samples. Using long hex strings simulates what we'd
// get from `eth_getCode` on Sepolia. Real bytecode is 5-50 KB; these are
// shorter but exercise the same algorithm.

// VaultV1 reference body (synthetic, fixed-length pattern + the EIP-1967
// implementation slot constant + the OZ Initializable namespace).
const V1_BODY =
  '6080604052348015' + // function dispatcher prelude
  '60003560e01c80' + // PUSH4 selector compare
  // Five fake function bodies separated by JUMPDEST sentinels (0x5b).
  '5bc4d66de8' + 'ab'.repeat(40) + // initialize(address)
  '5bd0e30db0' + 'cd'.repeat(40) + // deposit()
  '5b2e1a7d4d' + 'ef'.repeat(40) + // withdraw(uint256)
  '5b70a08231' + '12'.repeat(40) + // balanceOf(address)
  '5b8da5cb5b' + '34'.repeat(40) + // owner()
  // OZ Initializable ERC-7201 namespace (used as PUSH32 immutable):
  '7f' + 'f0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a00' +
  // EIP-1967 implementation slot:
  '7f' + '360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc' +
  // CBOR metadata footer (51 bytes = 0x33). The trailing 0x0033 encodes the length.
  'a2646970667358221220' + '11'.repeat(34) + '64736f6c63430008180033';

const V1_FOOTER_LEN_HEX = '0033'; // matches the trailer above

// VaultV1Derivative simulates a contract whose runtime bytecode is
// byte-identical to V1 except for the trailing metadata blob (the cbor
// section encodes a different ipfs hash).
const V1_DERIVATIVE_BODY =
  V1_BODY.slice(0, V1_BODY.length - 70) + // strip the cbor section
  'a2646970667358221220' + 'aa'.repeat(34) + '64736f6c63430008180033';

// VaultV2Dangerous adds a sweep() selector and a privileged path. The first
// half of the body matches V1 (so confidence is moderate) but the new
// privileged selector is also baked in.
const V2_DANGEROUS_BODY =
  V1_BODY.slice(0, Math.floor(V1_BODY.length * 0.4)) + // 40% from V1
  '5b01681a62' + 'ff'.repeat(40) + // sweep(address) selector 0x01681a62
  // The rest is randomish bytecode that won't substring-match V1
  Array.from({ length: 200 }, (_, i) => i.toString(16).padStart(2, '0')).join('') +
  'a2646970667358221220' + 'bb'.repeat(34) + '64736f6c63430008180033';

const UNRELATED_BODY =
  // A plausibly-shaped but completely different ERC20 dispatcher bytecode
  '6080604052348015' +
  Array.from({ length: 800 }, (_, i) => ((i * 7) % 256).toString(16).padStart(2, '0')).join('') +
  'a2646970667358221220' + 'cc'.repeat(34) + '64736f6c63430008180033';

describe('stripMetadataFooter', () => {
  it('removes the cbor footer when the trailing length looks plausible', () => {
    const stripped = stripMetadataFooter(V1_BODY);
    expect(stripped.length).toBeLessThan(V1_BODY.length);
    expect(stripped.endsWith(V1_FOOTER_LEN_HEX)).toBe(false);
  });

  it('returns the input unchanged when the trailing length is implausible', () => {
    expect(stripMetadataFooter('0xdeadbeef')).toBe('deadbeef');
    expect(stripMetadataFooter('1234')).toBe('1234');
  });

  it('handles 0x prefix and uppercase', () => {
    const upper = '0x' + V1_BODY.toUpperCase();
    const stripped = stripMetadataFooter(upper);
    expect(stripped).toBe(V1_BODY.slice(0, V1_BODY.length - (0x33 + 2) * 2));
  });
});

describe('detectStorageLayoutMarkers', () => {
  it('detects EIP-1967 implementation slot constant in V1 bytecode', () => {
    const markers = detectStorageLayoutMarkers(V1_BODY);
    expect(markers.eip1967ImplementationSlot).toBe(true);
  });

  it('detects OZ Initializable namespace in V1 bytecode', () => {
    const markers = detectStorageLayoutMarkers(V1_BODY);
    expect(markers.initializableNamespace).toBe(true);
  });

  it('returns all-false for bytecode without recognised constants', () => {
    const markers = detectStorageLayoutMarkers(UNRELATED_BODY);
    expect(markers.eip1967ImplementationSlot).toBe(false);
    expect(markers.initializableNamespace).toBe(false);
    expect(markers.ozOwnableMarker).toBe(false);
  });
});

describe('bytecodeNgramConfidence', () => {
  it('returns 1.0 for identical bytecode', () => {
    expect(bytecodeNgramConfidence(V1_BODY, V1_BODY)).toBe(1);
  });

  it('returns 0 for completely disjoint bytecode', () => {
    const c = bytecodeNgramConfidence(V1_BODY, UNRELATED_BODY);
    expect(c).toBeLessThan(0.1);
  });

  it('returns close to 1.0 when V1 is fully contained in current', () => {
    const wrapper = '00'.repeat(100) + V1_BODY + '00'.repeat(100);
    const c = bytecodeNgramConfidence(V1_BODY, wrapper);
    expect(c).toBe(1);
  });
});

describe('matchAgainstV1 — VaultV1Derivative scenario (US-080)', () => {
  it('returns confidence >= 0.9 with hypothesis "v1_derived" when bytecode is V1-equivalent', () => {
    const result = matchAgainstV1(V1_BODY, V1_DERIVATIVE_BODY);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result.hypothesis).toBe('v1_derived');
  });

  it('detects EIP-1967 + Initializable namespace markers in the derivative', () => {
    const result = matchAgainstV1(V1_BODY, V1_DERIVATIVE_BODY);
    expect(result.storageLayoutMarkers.eip1967ImplementationSlot).toBe(true);
    expect(result.storageLayoutMarkers.initializableNamespace).toBe(true);
  });

  it('with no ABI selectors supplied, matched/unmatched lists are empty', () => {
    const result = matchAgainstV1(V1_BODY, V1_DERIVATIVE_BODY);
    expect(result.matchedSelectors).toEqual([]);
    expect(result.unmatchedSelectors).toEqual([]);
    expect(result.riskySelectorsInUnmatched).toEqual([]);
  });

  it('rationale string contains the confidence percentage and storage markers', () => {
    const result = matchAgainstV1(V1_BODY, V1_DERIVATIVE_BODY);
    expect(result.rationale).toContain('%');
    expect(result.rationale).toContain('EIP-1967-impl');
    expect(result.rationale).toContain('OZ-Initializable');
  });
});

describe('matchAgainstV1 — VaultV2Dangerous scenario', () => {
  it('returns moderate confidence (partial match) for V2Dangerous', () => {
    const result = matchAgainstV1(V1_BODY, V2_DANGEROUS_BODY);
    expect(result.confidence).toBeLessThan(0.9);
    expect(result.hypothesis).not.toBe('v1_derived');
  });

  it('flags sweep() in unmatched risky selectors when ABI is supplied', () => {
    const result = matchAgainstV1(V1_BODY, V2_DANGEROUS_BODY, {
      v1AbiSelectors: [
        { selector: '0xc4d66de8', name: 'initialize' },
        { selector: '0xd0e30db0', name: 'deposit' },
        { selector: '0x2e1a7d4d', name: 'withdraw' },
      ],
      currentAbiSelectors: [
        { selector: '0xc4d66de8', name: 'initialize' },
        { selector: '0x01681a62', name: 'sweep' },
      ],
    });
    expect(result.matchedSelectors).toContain('0xc4d66de8');
    expect(result.unmatchedSelectors).toContain('0x01681a62');
    expect(result.riskySelectorsInUnmatched).toContain('sweep');
  });
});

describe('matchAgainstV1 — unrelated bytecode', () => {
  it('returns low confidence and hypothesis "unrelated"', () => {
    const result = matchAgainstV1(V1_BODY, UNRELATED_BODY);
    expect(result.confidence).toBeLessThan(0.4);
    expect(result.hypothesis).toBe('unrelated');
  });
});

describe('qualifiesForV1DerivedReview', () => {
  it('returns true when confidence >= 0.9 and no risky selectors', () => {
    const result = matchAgainstV1(V1_BODY, V1_DERIVATIVE_BODY);
    expect(qualifiesForV1DerivedReview(result, false)).toBe(true);
  });

  it('returns false when abiDiff.addedAny=true (caller-supplied risky signal)', () => {
    const result = matchAgainstV1(V1_BODY, V1_DERIVATIVE_BODY);
    expect(qualifiesForV1DerivedReview(result, true)).toBe(false);
  });

  it('returns false when match\'s own riskySelectorsInUnmatched is non-empty', () => {
    const result = matchAgainstV1(V1_BODY, V1_DERIVATIVE_BODY, {
      v1AbiSelectors: [{ selector: '0xc4d66de8', name: 'initialize' }],
      currentAbiSelectors: [{ selector: '0x01681a62', name: 'sweep' }],
    });
    expect(qualifiesForV1DerivedReview(result, false)).toBe(false);
  });

  it('returns false when confidence < 0.9', () => {
    const result = matchAgainstV1(V1_BODY, V2_DANGEROUS_BODY);
    expect(qualifiesForV1DerivedReview(result, false)).toBe(false);
  });
});
