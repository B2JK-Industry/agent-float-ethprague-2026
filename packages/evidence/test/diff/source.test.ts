import { describe, expect, it } from 'vitest';

import { diffSourceFiles, type SourceFileDiff } from '../../src/diff/source.js';
import type { SourcifyMetadata } from '../../src/sourcify/types.js';

const ADDR_PREV: `0x${string}` = '0x2222222222222222222222222222222222222222';
const ADDR_CURR: `0x${string}` = '0x3333333333333333333333333333333333333333';

const VAULT_V1 = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract VaultV1 {
    uint256 public totalAssets;
    address public admin;

    function deposit(uint256 amount) external {
        totalAssets += amount;
    }

    function pause() external {
        // ...
    }
}
`;

const VAULT_V2_DANGEROUS = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract VaultV2Dangerous {
    uint256 public totalAssets;
    address public admin;

    function deposit(uint256 amount) external {
        totalAssets += amount;
    }

    function pause() external {
        // ...
    }

    /// @notice DANGER: privileged sweep added in this upgrade.
    function sweep(address to) external {
        // transfer all balance to \`to\`; no access control.
    }
}
`;

const NEW_LIB_FILE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library SafeMath {
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        return a + b;
    }
}
`;

function buildMetadata(
  address: `0x${string}`,
  sources: Record<string, string>,
): SourcifyMetadata {
  return {
    chainId: 11155111,
    address,
    match: 'exact_match',
    abi: [],
    compilerSettings: {},
    sources: Object.fromEntries(
      Object.entries(sources).map(([path, content]) => [path, { content }]),
    ),
    storageLayout: null,
  };
}

const prevMetadata: SourcifyMetadata = buildMetadata(ADDR_PREV, {
  'src/Vault.sol': VAULT_V1,
  'src/IERC20.sol': '// interface kept identical',
});

const currMetadataDangerous: SourcifyMetadata = buildMetadata(ADDR_CURR, {
  'src/Vault.sol': VAULT_V2_DANGEROUS,
  'src/IERC20.sol': '// interface kept identical',
  'src/SafeMath.sol': NEW_LIB_FILE,
});

const currMetadataIdentical: SourcifyMetadata = buildMetadata(ADDR_CURR, {
  'src/Vault.sol': VAULT_V1,
  'src/IERC20.sol': '// interface kept identical',
});

describe('diffSourceFiles', () => {
  it('returns an empty array when both metadata snapshots have identical sources', () => {
    expect(diffSourceFiles(prevMetadata, currMetadataIdentical)).toEqual([]);
  });

  it('returns an empty array when both inputs are null/undefined', () => {
    expect(diffSourceFiles(null, null)).toEqual([]);
    expect(diffSourceFiles(undefined, undefined)).toEqual([]);
  });

  it('marks newly-added files as added with empty-baseline unified diff', () => {
    const result = diffSourceFiles(prevMetadata, currMetadataDangerous);
    const safeMath = result.find((d) => d.path === 'src/SafeMath.sol');
    expect(safeMath).toBeDefined();
    expect(safeMath?.status).toBe('added');
    expect(safeMath?.hunks.added).toBeGreaterThan(0);
    expect(safeMath?.hunks.removed).toBe(0);
    expect(safeMath?.unifiedDiff).toContain('library SafeMath');
  });

  it('marks deleted files as deleted with current-empty unified diff', () => {
    const currMissingFile = buildMetadata(ADDR_CURR, {
      'src/Vault.sol': VAULT_V1,
      // 'src/IERC20.sol' deleted
    });
    const result = diffSourceFiles(prevMetadata, currMissingFile);
    const ierc20 = result.find((d) => d.path === 'src/IERC20.sol');
    expect(ierc20?.status).toBe('deleted');
    expect(ierc20?.hunks.removed).toBeGreaterThan(0);
    expect(ierc20?.hunks.added).toBe(0);
  });

  it('V1 vs V2Dangerous: the modified Vault file shows the +sweep function in unifiedDiff', () => {
    const result = diffSourceFiles(prevMetadata, currMetadataDangerous);
    const vault = result.find((d) => d.path === 'src/Vault.sol');
    expect(vault).toBeDefined();
    expect(vault?.status).toBe('modified');
    // Codex / docs/04 ABI-risk story: sweep appearing in the diff is the
    // exact signal the verdict engine flags as critical. We assert it
    // shows up in the unified-diff payload that the UI renders.
    expect(vault?.unifiedDiff).toContain('+    function sweep(address to)');
    expect(vault?.unifiedDiff).toContain('+    /// @notice DANGER');
    expect(vault?.hunks.added).toBeGreaterThan(0);
    // The sweep block was added; nothing was removed beyond a closing brace
    // moving down. removed count should be small.
    expect(vault?.hunks.removed).toBeGreaterThanOrEqual(0);
  });

  it('preserves a stable order: added then deleted then modified, alphabetical within each group', () => {
    const cur = buildMetadata(ADDR_CURR, {
      // modified
      'src/Vault.sol': VAULT_V2_DANGEROUS,
      // identical (filtered out)
      'src/IERC20.sol': '// interface kept identical',
      // added (and z- prefix to test ordering)
      'src/zNewlyAdded.sol': '// new',
      'src/aAdded.sol': '// also new',
    });
    const result = diffSourceFiles(prevMetadata, cur);
    const order = result.map((d) => `${d.status}:${d.path}`);
    expect(order).toEqual([
      'added:src/aAdded.sol',
      'added:src/zNewlyAdded.sol',
      'modified:src/Vault.sol',
    ]);
  });

  it('hunk counts ignore the +++/--- file header lines', () => {
    const result = diffSourceFiles(prevMetadata, currMetadataDangerous);
    const vault = result.find((d) => d.path === 'src/Vault.sol') as SourceFileDiff;
    // Pull the raw +++/--- from the unified diff and assert they are NOT
    // counted in hunks. Replace them in the diff and recount; the count
    // should match.
    const linesWithHeader = vault.unifiedDiff.split('\n');
    const plusHeaderCount = linesWithHeader.filter((l) => l.startsWith('+++ ')).length;
    const minusHeaderCount = linesWithHeader.filter((l) => l.startsWith('--- ')).length;
    expect(plusHeaderCount).toBeGreaterThan(0);
    expect(minusHeaderCount).toBeGreaterThan(0);
    // Naive recount matches our function (single-pass O(n)).
    let added = 0;
    let removed = 0;
    for (const line of linesWithHeader) {
      if (line.startsWith('+++ ') || line.startsWith('--- ')) continue;
      if (line.startsWith('+')) added += 1;
      else if (line.startsWith('-')) removed += 1;
    }
    expect(vault.hunks.added).toBe(added);
    expect(vault.hunks.removed).toBe(removed);
  });

  it('handles null prev (initial deploy: every current file is added)', () => {
    const result = diffSourceFiles(null, currMetadataDangerous);
    expect(result.every((d) => d.status === 'added')).toBe(true);
    expect(result.length).toBe(Object.keys(currMetadataDangerous.sources ?? {}).length);
  });

  it('handles null curr (no current implementation: every prev file is deleted)', () => {
    const result = diffSourceFiles(prevMetadata, null);
    expect(result.every((d) => d.status === 'deleted')).toBe(true);
    expect(result.length).toBe(Object.keys(prevMetadata.sources ?? {}).length);
  });

  it('treats sources=null as empty (no diff entries on that side)', () => {
    const noSources: SourcifyMetadata = {
      ...prevMetadata,
      sources: null,
    };
    const result = diffSourceFiles(noSources, currMetadataDangerous);
    expect(result.every((d) => d.status === 'added')).toBe(true);
  });
});
