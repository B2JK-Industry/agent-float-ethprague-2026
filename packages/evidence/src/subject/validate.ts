import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AGENT_BENCH_MANIFEST_SCHEMA_V1,
  type SubjectManifest,
} from '@upgrade-siren/shared';

import type { SubjectSchemaError } from './types.js';

// ajv 8 ships as CJS; under NodeNext + verbatimModuleSyntax the constructable
// default export must be loaded via createRequire to keep TypeScript happy
// (mirrors the pattern in packages/shared/test/sirenReport.test.ts).
interface AjvErrorObject {
  readonly instancePath?: string;
  readonly schemaPath?: string;
  readonly keyword?: string;
  readonly message?: string;
}

interface ValidateFn {
  (data: unknown): boolean;
  errors: ReadonlyArray<AjvErrorObject> | null | undefined;
}

interface AjvInstance {
  compile: (schema: unknown) => ValidateFn;
}

type AjvOptions = { allErrors?: boolean; strict?: boolean | 'log' };
type AjvCtor = new (opts?: AjvOptions) => AjvInstance;
type AddFormats = (ajv: AjvInstance) => AjvInstance;

const cjsRequire = createRequire(import.meta.url);
const Ajv2020 = cjsRequire('ajv/dist/2020.js') as unknown as AjvCtor;
const addFormats = cjsRequire('ajv-formats') as unknown as AddFormats;

const here = dirname(fileURLToPath(import.meta.url));
// packages/evidence/src/subject/validate.ts -> packages/shared/schemas/...
const schemaPath = resolve(
  here,
  '..',
  '..',
  '..',
  'shared',
  'schemas',
  'agent-bench-manifest-v1.json',
);

let cachedValidator: ValidateFn | null = null;

function loadValidator(): ValidateFn {
  if (cachedValidator !== null) return cachedValidator;
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8')) as Record<string, unknown>;
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  cachedValidator = ajv.compile(schema);
  return cachedValidator;
}

export type ValidateSubjectManifestResult =
  | { readonly kind: 'ok'; readonly manifest: SubjectManifest }
  | { readonly kind: 'error'; readonly errors: ReadonlyArray<SubjectSchemaError> };

export function validateSubjectManifest(value: unknown): ValidateSubjectManifestResult {
  const validate = loadValidator();
  const ok = validate(value);
  if (!ok) {
    const errs: ReadonlyArray<SubjectSchemaError> = (validate.errors ?? []).map((e) => ({
      instancePath: e.instancePath ?? '',
      message: e.message ?? 'invalid',
      ...(e.keyword !== undefined ? { keyword: e.keyword } : {}),
    }));
    return { kind: 'error', errors: errs };
  }
  // Schema enforces `schema === AGENT_BENCH_MANIFEST_SCHEMA_V1` so the cast
  // is sound. Re-narrowing here keeps a TS-only invariant guard in place if
  // the schema ever drifts.
  const m = value as SubjectManifest;
  if (m.schema !== AGENT_BENCH_MANIFEST_SCHEMA_V1) {
    return {
      kind: 'error',
      errors: [
        {
          instancePath: '/schema',
          message: `expected schema ${AGENT_BENCH_MANIFEST_SCHEMA_V1}, got ${String(m.schema)}`,
          keyword: 'const',
        },
      ],
    };
  }
  return { kind: 'ok', manifest: m };
}
