// US-075: source-file diff primitive. Given two SourcifyMetadata snapshots
// (prev = previous implementation, curr = current implementation), produce
// a per-file unified-diff bundle the UI can render in the evidence drawer.
//
// Identical files are filtered out — the output is the changed surface
// (added / deleted / modified). Sourcify mounts contracts under their
// import paths (e.g. "src/Vault.sol", "@openzeppelin/contracts/...").

import { createTwoFilesPatch } from 'diff';

import type { SourcifyMetadata, SourcifySourceFile } from '../sourcify/types.js';

export type SourceFileStatus = 'added' | 'deleted' | 'modified' | 'identical';

export interface SourceFileHunkCounts {
  readonly added: number;
  readonly removed: number;
}

export interface SourceFileDiff {
  readonly path: string;
  readonly status: SourceFileStatus;
  readonly unifiedDiff: string;
  readonly hunks: SourceFileHunkCounts;
}

function getSources(
  metadata: SourcifyMetadata | null | undefined,
): Readonly<Record<string, SourcifySourceFile>> {
  return metadata?.sources ?? {};
}

// Counts added / removed lines in a unified-diff payload, excluding the
// file-header lines that start with `+++ ` / `--- `. Hunk-marker lines
// (`@@ ... @@`) are not counted either. The result feeds the badge that
// the UI renders next to the file path ("+12 -4").
function countHunkLines(unifiedDiff: string): SourceFileHunkCounts {
  let added = 0;
  let removed = 0;
  for (const line of unifiedDiff.split('\n')) {
    if (line.startsWith('+++ ') || line.startsWith('--- ')) continue;
    if (line.startsWith('+')) added += 1;
    else if (line.startsWith('-')) removed += 1;
  }
  return { added, removed };
}

function buildPatch(path: string, prevContent: string, currContent: string): string {
  return createTwoFilesPatch(path, path, prevContent, currContent, undefined, undefined, {
    context: 3,
  });
}

export function diffSourceFiles(
  prev: SourcifyMetadata | null | undefined,
  curr: SourcifyMetadata | null | undefined,
): SourceFileDiff[] {
  const prevSources = getSources(prev);
  const currSources = getSources(curr);
  const allPaths = new Set<string>([...Object.keys(prevSources), ...Object.keys(currSources)]);

  const out: SourceFileDiff[] = [];
  for (const path of allPaths) {
    const prevEntry = prevSources[path];
    const currEntry = currSources[path];

    if (prevEntry && currEntry) {
      if (prevEntry.content === currEntry.content) {
        // Filter identical files out of the result. The UI doesn't need
        // a row for "this file is the same in both implementations".
        continue;
      }
      const unifiedDiff = buildPatch(path, prevEntry.content, currEntry.content);
      out.push({
        path,
        status: 'modified',
        unifiedDiff,
        hunks: countHunkLines(unifiedDiff),
      });
      continue;
    }

    if (currEntry && !prevEntry) {
      const unifiedDiff = buildPatch(path, '', currEntry.content);
      out.push({
        path,
        status: 'added',
        unifiedDiff,
        hunks: countHunkLines(unifiedDiff),
      });
      continue;
    }

    if (prevEntry && !currEntry) {
      const unifiedDiff = buildPatch(path, prevEntry.content, '');
      out.push({
        path,
        status: 'deleted',
        unifiedDiff,
        hunks: countHunkLines(unifiedDiff),
      });
    }
  }

  // Stable order: by status (added < deleted < modified), then path. The UI
  // can rely on this ordering to render groups consistently.
  const statusOrder: Record<SourceFileStatus, number> = {
    added: 0,
    deleted: 1,
    modified: 2,
    identical: 3,
  };
  out.sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s !== 0) return s;
    return a.path.localeCompare(b.path);
  });
  return out;
}
