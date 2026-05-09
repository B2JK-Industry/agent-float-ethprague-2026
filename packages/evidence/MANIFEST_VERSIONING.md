# upgrade-siren manifest versioning

The manifest schema string is the canonical version handle. Today the only
known version is `siren-upgrade-manifest@1`. Unknown values are surfaced by
the parser as the `unknown_schema_version` error, and the verdict engine
(US-029) maps that error to a `REVIEW` verdict unless another `SIREN` rule
fires.

## How to add a new version

1. Define the new schema literal as a constant in
   `packages/evidence/src/manifest/types.ts`, e.g. `MANIFEST_SCHEMA_V2`.
2. Define the new TypeScript shape `UpgradeManifestV2` next to it.
3. Append the new literal to `KNOWN_MANIFEST_VERSIONS` in
   `packages/evidence/src/manifest/versionPolicy.ts`.
4. Add a new parser variant. Recommended pattern: keep `parseUpgradeManifest`
   as the public entry point, dispatch on `schema` to per-version parsers,
   and return a discriminated `UpgradeManifest` union.
5. Update consumer code (verdict engine US-029, hash-chain validator US-030,
   ENS provisioning scripts in Stream A) to handle the union.
6. Add a complete test suite for the new version covering the same
   error-branch coverage as `parse.test.ts`.

## Dual-read window

When `siren-upgrade-manifest@2` ships, the parser must accept both v1 and v2
for at least one full release cycle. This window gives every protocol
publishing v1 manifests time to migrate without their consumers tripping
into `unknown_schema_version` mid-deploy.

Practical signal: both literals appear in `KNOWN_MANIFEST_VERSIONS`. The
verdict engine treats a successfully-parsed v1 or v2 manifest the same way
during the dual-read window.

## Sunset criteria

A version `@N` is eligible for sunset only after **all** of:

1. A higher version `@N+1` has been live in `KNOWN_MANIFEST_VERSIONS` for at
   least one release cycle.
2. Every protocol that uses Upgrade Siren signed manifests has migrated
   (visible by all `upgrade-siren:upgrade_manifest` ENS records resolving to
   `@N+1` or later in production).
3. The release notes for the sunset commit explicitly call out the breaking
   change and the date `@N` ceased to be accepted.

When `@N` is sunset, remove its literal from `KNOWN_MANIFEST_VERSIONS`. The
parser will then return `unknown_schema_version` for any `@N` manifest, and
the verdict engine will downgrade the report to `REVIEW`. Do not delete the
historical TypeScript shape `UpgradeManifestVN` from the codebase for at
least one further release; it serves as a reference for archive analysis
of historical reports.

## Why a list, not a single string

Hard-coding a single literal everywhere couples version handling to a
single schema. The list lets a future v2 ship without churning every
consumer; consumers query `isKnownManifestVersion(value)` and the policy
file is the single place to add or remove entries.
