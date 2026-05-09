import { describe, expect, it } from 'vitest';

import type { SourcifyDeep } from '../../src/sourcify/deep.js';
import { summarizeLicenseAndCompiler } from '../../src/sourcify/licenseCompiler.js';

const ADDR = '0x1111111111111111111111111111111111111111' as const;

function deep(overrides: Partial<SourcifyDeep>): SourcifyDeep {
  return {
    chainId: 1,
    address: ADDR,
    match: 'exact_match',
    creationMatch: null,
    runtimeMatch: null,
    compilation: null,
    functionSignatures: null,
    eventSignatures: null,
    licenses: null,
    userdoc: null,
    devdoc: null,
    proxyResolution: null,
    ...overrides,
  };
}

describe('summarizeLicenseAndCompiler — licenses', () => {
  it('returns empty / null when SourcifyDeep has no licenses', () => {
    const summary = summarizeLicenseAndCompiler(deep({}));
    expect(summary.licenses).toEqual([]);
    expect(summary.dominantLicense).toBeNull();
  });

  it('counts and sorts by descending frequency', () => {
    const summary = summarizeLicenseAndCompiler(
      deep({
        licenses: [
          { path: 'a.sol', license: 'MIT' },
          { path: 'b.sol', license: 'MIT' },
          { path: 'c.sol', license: 'GPL-3.0' },
        ],
      }),
    );
    expect(summary.licenses).toEqual([
      { spdx: 'MIT', count: 2 },
      { spdx: 'GPL-3.0', count: 1 },
    ]);
    expect(summary.dominantLicense).toBe('MIT');
  });

  it('breaks ties alphabetically', () => {
    const summary = summarizeLicenseAndCompiler(
      deep({
        licenses: [
          { path: 'a.sol', license: 'Apache-2.0' },
          { path: 'b.sol', license: 'MIT' },
        ],
      }),
    );
    expect(summary.licenses[0]?.spdx).toBe('Apache-2.0');
    expect(summary.dominantLicense).toBe('Apache-2.0');
  });

  it('handles single-license input', () => {
    const summary = summarizeLicenseAndCompiler(
      deep({ licenses: [{ path: 'only.sol', license: 'MIT' }] }),
    );
    expect(summary.licenses).toEqual([{ spdx: 'MIT', count: 1 }]);
    expect(summary.dominantLicense).toBe('MIT');
  });
});

describe('summarizeLicenseAndCompiler — compiler', () => {
  function withCompiler(version: string | null): SourcifyDeep {
    return deep({
      compilation: version === null
        ? null
        : {
            compiler: 'solc',
            compilerVersion: version,
            language: 'Solidity',
            evmVersion: 'paris',
            optimizerEnabled: true,
            optimizerRuns: 200,
            contractName: 'V',
            fullyQualifiedName: null,
          },
    });
  }

  it('returns null when compilation block is null', () => {
    const summary = summarizeLicenseAndCompiler(withCompiler(null));
    expect(summary.compiler).toBeNull();
  });

  it('parses standard solc commit-tagged version (recent)', () => {
    const summary = summarizeLicenseAndCompiler(withCompiler('0.8.24+commit.abcdef0a'));
    expect(summary.compiler).toEqual({
      raw: '0.8.24+commit.abcdef0a',
      major: 0,
      minor: 8,
      patch: 24,
      commit: 'abcdef0a',
      recent: true,
    });
  });

  it('flags 0.8.20 as recent (default threshold boundary inclusive)', () => {
    const summary = summarizeLicenseAndCompiler(withCompiler('0.8.20+commit.abcdef0a'));
    expect(summary.compiler?.recent).toBe(true);
  });

  it('flags 0.8.19 as not recent (default threshold)', () => {
    const summary = summarizeLicenseAndCompiler(withCompiler('0.8.19+commit.deadbeef'));
    expect(summary.compiler?.recent).toBe(false);
  });

  it('flags 0.7.6 as not recent', () => {
    const summary = summarizeLicenseAndCompiler(withCompiler('0.7.6'));
    expect(summary.compiler?.recent).toBe(false);
  });

  it('parses bare semver without commit tag', () => {
    const summary = summarizeLicenseAndCompiler(withCompiler('0.8.30'));
    expect(summary.compiler).toEqual({
      raw: '0.8.30',
      major: 0,
      minor: 8,
      patch: 30,
      commit: null,
      recent: true,
    });
  });

  it('tolerates a leading "v" prefix', () => {
    const summary = summarizeLicenseAndCompiler(withCompiler('v0.8.25'));
    expect(summary.compiler?.major).toBe(0);
    expect(summary.compiler?.minor).toBe(8);
    expect(summary.compiler?.patch).toBe(25);
  });

  it('returns null for unparseable version strings', () => {
    const summary = summarizeLicenseAndCompiler(withCompiler('mystery-version'));
    expect(summary.compiler).toBeNull();
  });

  it('honours custom recency threshold', () => {
    const stricterThreshold = { major: 0, minor: 8, patch: 25 };
    const summary = summarizeLicenseAndCompiler(withCompiler('0.8.20'), stricterThreshold);
    expect(summary.compiler?.recent).toBe(false);
  });

  it('handles future major (1.0.0) as recent under default threshold', () => {
    const summary = summarizeLicenseAndCompiler(withCompiler('1.0.0+commit.abcdef0a'));
    expect(summary.compiler?.recent).toBe(true);
    expect(summary.compiler?.major).toBe(1);
  });
});
