import { describe, expect, it } from 'vitest';

import { detectSourcePatterns } from '../../src/sourcify/patterns.js';

function sources(map: Record<string, string>): Record<string, { content: string }> {
  const out: Record<string, { content: string }> = {};
  for (const [k, v] of Object.entries(map)) out[k] = { content: v };
  return out;
}

describe('detectSourcePatterns', () => {
  it('returns empty for null / undefined / empty source maps', () => {
    expect(detectSourcePatterns(null)).toEqual([]);
    expect(detectSourcePatterns(undefined)).toEqual([]);
    expect(detectSourcePatterns({})).toEqual([]);
  });

  describe('Ownable', () => {
    it('detects via OZ import path', () => {
      const matches = detectSourcePatterns(
        sources({
          'src/Vault.sol': 'contract V is Ownable {}',
          'lib/openzeppelin-contracts/contracts/access/Ownable.sol': '// OZ Ownable',
        }),
      );
      const ownable = matches.find((m) => m.pattern === 'ownable');
      expect(ownable).toBeDefined();
      expect(ownable?.openzeppelin).toBe(true);
    });

    it('detects via OZ import inside file content', () => {
      const matches = detectSourcePatterns(
        sources({
          'src/Vault.sol': `import "@openzeppelin/contracts/access/Ownable.sol";\ncontract V is Ownable {}`,
        }),
      );
      const ownable = matches.find((m) => m.pattern === 'ownable');
      expect(ownable).toBeDefined();
      expect(ownable?.openzeppelin).toBe(true);
      expect(ownable?.evidence).toContain('src/Vault.sol');
    });

    it('detects hand-rolled via onlyOwner modifier (no OZ import)', () => {
      const matches = detectSourcePatterns(
        sources({
          'src/Vault.sol': 'modifier onlyOwner() { _; }\nfunction transferOwnership(address) external onlyOwner {}',
        }),
      );
      const ownable = matches.find((m) => m.pattern === 'ownable');
      expect(ownable).toBeDefined();
      expect(ownable?.openzeppelin).toBe(false);
    });

    it('does NOT detect when only the word "owner" appears in unrelated context', () => {
      const matches = detectSourcePatterns(
        sources({ 'src/Vault.sol': 'function setOwner(address newOwner) external {}' }),
      );
      expect(matches.find((m) => m.pattern === 'ownable')).toBeUndefined();
    });

    // audit-round-7 P1 #10 regression: previously path matching used
    // `path.includes(s)`, so a path like `…/access/Ownable.solidity_old/foo.sol`
    // would falsely match `access/Ownable.sol` as a substring and set
    // `openzeppelin: true`. The fix tightens path matching to suffix-only,
    // so only paths actually ending in the canonical OZ filename count.
    it('does NOT match a path that merely contains the OZ filename as a substring (audit-round-7 P1 #10)', () => {
      const matches = detectSourcePatterns(
        sources({
          // Path includes "access/Ownable.sol" as a substring but does not end
          // with it. Must NOT be flagged as an OZ Ownable import; in particular,
          // openzeppelin must remain false (no OZ-style file present in this map).
          'src/access/Ownable.solidity_archive/legacy/Foo.sol': 'contract Foo {}',
        }),
      );
      const ownable = matches.find((m) => m.pattern === 'ownable');
      // No OZ-style import means no openzeppelin-flagged Ownable match. The
      // path-substring match would have produced one before the fix.
      expect(ownable).toBeUndefined();
    });
  });

  describe('Pausable', () => {
    it('detects via OZ import', () => {
      const matches = detectSourcePatterns(
        sources({
          'src/Vault.sol': `import "@openzeppelin/contracts/security/Pausable.sol";\ncontract V is Pausable {}`,
        }),
      );
      const pausable = matches.find((m) => m.pattern === 'pausable');
      expect(pausable).toBeDefined();
      expect(pausable?.openzeppelin).toBe(true);
    });

    it('detects via whenNotPaused modifier alone (hand-rolled)', () => {
      const matches = detectSourcePatterns(
        sources({ 'src/V.sol': 'function pause() external whenNotPaused {}' }),
      );
      expect(matches.find((m) => m.pattern === 'pausable')).toBeDefined();
    });
  });

  describe('UUPS', () => {
    it('detects via UUPSUpgradeable import', () => {
      const matches = detectSourcePatterns(
        sources({
          'src/Proxy.sol': `import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";`,
        }),
      );
      expect(matches.find((m) => m.pattern === 'uups')?.openzeppelin).toBe(true);
    });

    it('detects via _authorizeUpgrade hand-roll', () => {
      const matches = detectSourcePatterns(
        sources({ 'src/P.sol': 'function _authorizeUpgrade(address) internal override {}' }),
      );
      const uups = matches.find((m) => m.pattern === 'uups');
      expect(uups).toBeDefined();
      expect(uups?.openzeppelin).toBe(false);
    });
  });

  describe('AccessControl', () => {
    it('detects via OZ import', () => {
      const matches = detectSourcePatterns(
        sources({
          'src/V.sol': `import "@openzeppelin/contracts/access/AccessControl.sol";`,
        }),
      );
      expect(matches.find((m) => m.pattern === 'access_control')?.openzeppelin).toBe(true);
    });

    it('detects via grantRole + DEFAULT_ADMIN_ROLE in hand-roll', () => {
      const matches = detectSourcePatterns(
        sources({
          'src/V.sol': 'bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00; function grantRole(bytes32,address) external {}',
        }),
      );
      expect(matches.find((m) => m.pattern === 'access_control')).toBeDefined();
    });
  });

  describe('ReentrancyGuard', () => {
    it('detects via OZ import', () => {
      const matches = detectSourcePatterns(
        sources({
          'src/V.sol': `import "@openzeppelin/contracts/security/ReentrancyGuard.sol";`,
        }),
      );
      expect(matches.find((m) => m.pattern === 'reentrancy_guard')?.openzeppelin).toBe(true);
    });

    it('detects via nonReentrant modifier', () => {
      const matches = detectSourcePatterns(
        sources({ 'src/V.sol': 'function withdraw() external nonReentrant {}' }),
      );
      expect(matches.find((m) => m.pattern === 'reentrancy_guard')).toBeDefined();
    });
  });

  describe('Initializable', () => {
    it('detects via OZ import path', () => {
      const matches = detectSourcePatterns(
        sources({
          'src/V.sol': `import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";`,
        }),
      );
      expect(matches.find((m) => m.pattern === 'initializable')?.openzeppelin).toBe(true);
    });

    it('detects via initializer modifier', () => {
      const matches = detectSourcePatterns(
        sources({ 'src/V.sol': 'function initialize() external initializer {}' }),
      );
      expect(matches.find((m) => m.pattern === 'initializable')).toBeDefined();
    });
  });

  describe('multiple patterns and aggregation', () => {
    it('detects multiple patterns in the same file', () => {
      const matches = detectSourcePatterns(
        sources({
          'src/V.sol': `
            import "@openzeppelin/contracts/access/Ownable.sol";
            import "@openzeppelin/contracts/security/Pausable.sol";
            import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
            contract V is Ownable, Pausable, ReentrancyGuard {}
          `,
        }),
      );
      const ids = matches.map((m) => m.pattern);
      expect(ids).toContain('ownable');
      expect(ids).toContain('pausable');
      expect(ids).toContain('reentrancy_guard');
    });

    it('aggregates evidence across multiple files for one pattern', () => {
      const matches = detectSourcePatterns(
        sources({
          'src/A.sol': 'modifier onlyOwner() { _; }',
          'src/B.sol': 'function f() onlyOwner external {}',
        }),
      );
      const ownable = matches.find((m) => m.pattern === 'ownable');
      expect(ownable?.evidence).toContain('src/A.sol');
      expect(ownable?.evidence).toContain('src/B.sol');
    });

    it('returns an empty array when no rules match', () => {
      const matches = detectSourcePatterns(
        sources({ 'src/Plain.sol': 'contract Plain { uint256 public x; }' }),
      );
      expect(matches).toEqual([]);
    });
  });
});
