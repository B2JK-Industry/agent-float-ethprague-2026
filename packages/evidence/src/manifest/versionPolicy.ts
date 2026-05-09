// Schema version policy for upgrade-siren manifest documents.
// US-018 imports KNOWN_MANIFEST_VERSIONS to validate the schema field; any
// future v2 manifest must be added here intentionally so the parser does not
// silently accept unknown shapes. The verdict engine (US-029) treats unknown
// versions as REVIEW unless another SIREN rule fires.

import { MANIFEST_SCHEMA_V1 } from './types.js';

export const KNOWN_MANIFEST_VERSIONS = [MANIFEST_SCHEMA_V1] as const;

export type KnownManifestVersion = (typeof KNOWN_MANIFEST_VERSIONS)[number];

const KNOWN_VERSION_SET: ReadonlySet<string> = new Set<string>(KNOWN_MANIFEST_VERSIONS);

export function isKnownManifestVersion(value: unknown): value is KnownManifestVersion {
  return typeof value === 'string' && KNOWN_VERSION_SET.has(value);
}
