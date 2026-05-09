import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  AGENT_BENCH_MANIFEST_SCHEMA_V1,
  AGENT_BENCH_RECORD_KEYS,
  SUBJECT_KINDS,
  type SubjectManifest,
} from '../src/index.js';

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

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, '../schemas/agent-bench-manifest-v1.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8')) as Record<string, unknown>;

function buildValidator(): ValidateFn {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

const validManifest: SubjectManifest = {
  schema: AGENT_BENCH_MANIFEST_SCHEMA_V1,
  kind: 'ai-agent',
  sources: {
    sourcify: [
      { chainId: 1, address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Treasury Multisig' },
    ],
    github: { owner: 'vbuterin', verified: false, verificationGist: null },
    onchain: { primaryAddress: '0xcccccccccccccccccccccccccccccccccccccccc', claimedFirstTxHash: null },
    ensInternal: { rootName: 'someagent.eth' },
  },
  version: 1,
  previousManifestHash: null,
};

describe('agent-bench-manifest-v1.json schema', () => {
  it('exposes the canonical schema id constant', () => {
    expect(AGENT_BENCH_MANIFEST_SCHEMA_V1).toBe('agent-bench-manifest@1');
  });

  it('exposes the canonical record key namespace', () => {
    expect(AGENT_BENCH_RECORD_KEYS.benchManifest).toBe('agent-bench:bench_manifest');
    expect(AGENT_BENCH_RECORD_KEYS.owner).toBe('agent-bench:owner');
    expect(AGENT_BENCH_RECORD_KEYS.schema).toBe('agent-bench:schema');
  });

  it('lists the v1 subject kinds (ai-agent / human-team / project)', () => {
    expect([...SUBJECT_KINDS]).toEqual(['ai-agent', 'human-team', 'project']);
  });

  describe('happy path', () => {
    it('accepts a fully populated v1 manifest', () => {
      const validate = buildValidator();
      expect(validate(validManifest)).toBe(true);
      expect(validate.errors).toBeFalsy();
    });

    it('accepts a manifest with empty sources object', () => {
      const validate = buildValidator();
      const minimal: SubjectManifest = {
        schema: AGENT_BENCH_MANIFEST_SCHEMA_V1,
        kind: 'project',
        sources: {},
        version: 1,
        previousManifestHash: null,
      };
      expect(validate(minimal)).toBe(true);
    });

    it('accepts each subject kind enum value', () => {
      const validate = buildValidator();
      for (const kind of SUBJECT_KINDS) {
        expect(validate({ ...validManifest, kind })).toBe(true);
      }
    });

    it('accepts previousManifestHash as a 32-byte hex', () => {
      const validate = buildValidator();
      const linked: SubjectManifest = {
        ...validManifest,
        version: 2,
        previousManifestHash: `0x${'a'.repeat(64)}`,
      };
      expect(validate(linked)).toBe(true);
    });

    it('accepts a github source with verified=true when verificationGist is a URL', () => {
      const validate = buildValidator();
      const cross = {
        ...validManifest,
        sources: {
          ...validManifest.sources,
          github: { owner: 'vbuterin', verified: true, verificationGist: 'https://gist.github.com/vbuterin/abc' },
        },
      };
      expect(validate(cross)).toBe(true);
    });
  });

  describe('rejects invalid manifests', () => {
    it('rejects wrong schema constant', () => {
      const validate = buildValidator();
      expect(validate({ ...validManifest, schema: 'agent-bench-manifest@2' })).toBe(false);
    });

    it('rejects unknown kind', () => {
      const validate = buildValidator();
      expect(validate({ ...validManifest, kind: 'spaceship' })).toBe(false);
    });

    it('rejects version zero', () => {
      const validate = buildValidator();
      expect(validate({ ...validManifest, version: 0 })).toBe(false);
    });

    it('rejects non-integer version', () => {
      const validate = buildValidator();
      expect(validate({ ...validManifest, version: 1.5 })).toBe(false);
    });

    it('rejects missing previousManifestHash field', () => {
      const validate = buildValidator();
      const { previousManifestHash: _drop, ...withoutHash } = validManifest;
      void _drop;
      expect(validate(withoutHash)).toBe(false);
    });

    it('rejects malformed previousManifestHash hex length', () => {
      const validate = buildValidator();
      expect(validate({ ...validManifest, previousManifestHash: '0xabc' })).toBe(false);
    });

    it('rejects malformed sourcify address', () => {
      const validate = buildValidator();
      const m = {
        ...validManifest,
        sources: {
          ...validManifest.sources,
          sourcify: [{ chainId: 1, address: '0xnothex', label: 'Bad' }],
        },
      };
      expect(validate(m)).toBe(false);
    });

    it('rejects sourcify entry with chainId zero', () => {
      const validate = buildValidator();
      const m = {
        ...validManifest,
        sources: {
          ...validManifest.sources,
          sourcify: [{ chainId: 0, address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'L' }],
        },
      };
      expect(validate(m)).toBe(false);
    });

    it('rejects extra top-level property (additionalProperties: false)', () => {
      const validate = buildValidator();
      expect(validate({ ...validManifest, extraneous: true })).toBe(false);
    });

    it('rejects extra property in github source', () => {
      const validate = buildValidator();
      const m = {
        ...validManifest,
        sources: {
          ...validManifest.sources,
          github: { owner: 'vbuterin', verified: false, verificationGist: null, mystery: 1 },
        },
      };
      expect(validate(m)).toBe(false);
    });

    it('rejects github source missing required field', () => {
      const validate = buildValidator();
      const m = {
        ...validManifest,
        sources: { ...validManifest.sources, github: { owner: 'vbuterin', verified: false } },
      };
      expect(validate(m)).toBe(false);
    });

    it('rejects github source with verified=true but verificationGist=null', () => {
      const validate = buildValidator();
      const m = {
        ...validManifest,
        sources: {
          ...validManifest.sources,
          github: { owner: 'vbuterin', verified: true, verificationGist: null },
        },
      };
      expect(validate(m)).toBe(false);
    });

    it('rejects empty github owner', () => {
      const validate = buildValidator();
      const m = {
        ...validManifest,
        sources: {
          ...validManifest.sources,
          github: { owner: '', verified: false, verificationGist: null },
        },
      };
      expect(validate(m)).toBe(false);
    });

    it('rejects malformed onchain primaryAddress', () => {
      const validate = buildValidator();
      const m = {
        ...validManifest,
        sources: {
          ...validManifest.sources,
          onchain: { primaryAddress: '0xshort', claimedFirstTxHash: null },
        },
      };
      expect(validate(m)).toBe(false);
    });

    it('rejects malformed ensInternal rootName (not a TLD)', () => {
      const validate = buildValidator();
      const m = {
        ...validManifest,
        sources: {
          ...validManifest.sources,
          ensInternal: { rootName: 'noTld' },
        },
      };
      expect(validate(m)).toBe(false);
    });

    it('rejects null payload', () => {
      const validate = buildValidator();
      expect(validate(null)).toBe(false);
    });

    it('rejects empty object', () => {
      const validate = buildValidator();
      expect(validate({})).toBe(false);
    });
  });
});
