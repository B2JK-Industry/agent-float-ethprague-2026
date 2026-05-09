// US-123 source-pattern detection from Sourcify `sources` map. EPIC
// Section 8.1: detect Pausable, Ownable, UUPS, AccessControl and surface
// them as drawer badges. Detection is conservative — we look for two
// signals per pattern (typically an OpenZeppelin import path AND a
// related identifier) so a false positive needs to fake both.
//
// This is a pure function over the `sources` map fetchSourcifyMetadata
// already returns (record of file path → { content: string }).

export type SourcePatternId =
  | 'pausable'
  | 'ownable'
  | 'uups'
  | 'access_control'
  | 'reentrancy_guard'
  | 'initializable';

export interface SourcePatternMatch {
  readonly pattern: SourcePatternId;
  // Human-readable label for the drawer chip.
  readonly label: string;
  // File paths that triggered the detection. Order is insertion order from
  // the sources map.
  readonly evidence: ReadonlyArray<string>;
  // True when at least one of the matches is an OpenZeppelin import path —
  // signals a high-confidence detection vs a hand-rolled implementation.
  readonly openzeppelin: boolean;
}

interface PatternRule {
  readonly id: SourcePatternId;
  readonly label: string;
  // OZ import-path signature (case-sensitive, matched as substring of the
  // file path or its `import` statements).
  readonly importSignatures: ReadonlyArray<string>;
  // Identifier signatures (modifier names, function names) that confirm a
  // hand-rolled implementation when the OZ import is absent.
  readonly identifierSignatures: ReadonlyArray<RegExp>;
}

const RULES: ReadonlyArray<PatternRule> = [
  {
    id: 'pausable',
    label: 'Pausable',
    importSignatures: ['security/Pausable.sol', 'utils/Pausable.sol'],
    identifierSignatures: [
      /\bwhenNotPaused\b/,
      /\bwhenPaused\b/,
      /\b_pause\s*\(/,
      /\b_unpause\s*\(/,
    ],
  },
  {
    id: 'ownable',
    label: 'Ownable',
    importSignatures: ['access/Ownable.sol'],
    identifierSignatures: [
      /\bonlyOwner\b/,
      /\btransferOwnership\s*\(/,
      /\brenounceOwnership\s*\(/,
    ],
  },
  {
    id: 'uups',
    label: 'UUPS',
    importSignatures: ['proxy/utils/UUPSUpgradeable.sol'],
    identifierSignatures: [
      /\b_authorizeUpgrade\s*\(/,
      /\bupgradeToAndCall\s*\(/,
      /\bUUPSUpgradeable\b/,
    ],
  },
  {
    id: 'access_control',
    label: 'AccessControl',
    importSignatures: ['access/AccessControl.sol', 'access/AccessControlUpgradeable.sol'],
    identifierSignatures: [
      /\bhasRole\s*\(/,
      /\bgrantRole\s*\(/,
      /\brevokeRole\s*\(/,
      /\bDEFAULT_ADMIN_ROLE\b/,
    ],
  },
  {
    id: 'reentrancy_guard',
    label: 'ReentrancyGuard',
    importSignatures: ['security/ReentrancyGuard.sol', 'utils/ReentrancyGuard.sol'],
    identifierSignatures: [/\bnonReentrant\b/],
  },
  {
    id: 'initializable',
    label: 'Initializable',
    importSignatures: ['proxy/utils/Initializable.sol', 'utils/Initializable.sol'],
    identifierSignatures: [/\binitializer\b/, /\bonlyInitializing\b/],
  },
];

function matchesAny(content: string, regexes: ReadonlyArray<RegExp>): boolean {
  for (const r of regexes) {
    if (r.test(content)) return true;
  }
  return false;
}

function pathMentionsImport(path: string, signatures: ReadonlyArray<string>): boolean {
  for (const s of signatures) {
    if (path.includes(s)) return true;
  }
  return false;
}

function contentMentionsImport(content: string, signatures: ReadonlyArray<string>): boolean {
  for (const s of signatures) {
    if (content.includes(s)) return true;
  }
  return false;
}

export interface SourcifySourceFileLike {
  readonly content: string;
}

// Detects which patterns appear in the source map. Iterates each file once
// per rule; runs in O(files × rules). For typical contracts (≤ 30 files,
// 6 rules) this is ~180 string scans per call.
export function detectSourcePatterns(
  sources: Readonly<Record<string, SourcifySourceFileLike>> | null | undefined,
): ReadonlyArray<SourcePatternMatch> {
  if (!sources) return [];
  const filePaths = Object.keys(sources);
  if (filePaths.length === 0) return [];

  const matches: SourcePatternMatch[] = [];
  for (const rule of RULES) {
    const evidence: string[] = [];
    let openzeppelin = false;
    for (const path of filePaths) {
      const file = sources[path];
      if (!file) continue;
      const content = file.content;
      // Two signals: the file path itself imports the OZ contract, OR the
      // file's content mentions the OZ import path (transitive imports
      // sometimes hide on the path), OR an identifier match.
      const importHitOnPath = pathMentionsImport(path, rule.importSignatures);
      const importHitInContent = contentMentionsImport(content, rule.importSignatures);
      const identifierHit = matchesAny(content, rule.identifierSignatures);
      if (importHitOnPath || importHitInContent) {
        evidence.push(path);
        openzeppelin = true;
        continue;
      }
      if (identifierHit) {
        evidence.push(path);
      }
    }
    if (evidence.length > 0) {
      matches.push({
        pattern: rule.id,
        label: rule.label,
        evidence,
        openzeppelin,
      });
    }
  }
  return matches;
}
