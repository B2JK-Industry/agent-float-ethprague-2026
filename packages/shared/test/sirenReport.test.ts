import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  AUTH_STATUSES,
  FINDING_SEVERITIES,
  RECOMMENDED_ACTIONS,
  REPORT_CONFIDENCES,
  REPORT_MODES,
  SIREN_REPORT_SCHEMA_ID,
  VERDICTS,
  type SirenReport,
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
const schemaPath = resolve(__dirname, '../schemas/siren-report-v1.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8')) as Record<string, unknown>;

function buildValidator(): ValidateFn {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

const validReport: SirenReport = {
  schema: 'siren-report@1',
  name: 'vault.demo.upgradesiren.eth',
  chainId: 11155111,
  proxy: '0x1111111111111111111111111111111111111111',
  previousImplementation: '0x2222222222222222222222222222222222222222',
  currentImplementation: '0x3333333333333333333333333333333333333333',
  verdict: 'SAFE',
  summary: 'Verified upgrade with compatible storage layout.',
  findings: [
    {
      id: 'VERIFICATION_CURRENT',
      severity: 'info',
      title: 'Current implementation verified',
      evidence: { matchType: 'exact_match' },
    },
  ],
  sourcify: {
    previousVerified: true,
    currentVerified: true,
    links: [
      {
        label: 'current implementation source',
        url: 'https://sourcify.dev/server/v2/contract/11155111/0x3333333333333333333333333333333333333333',
      },
    ],
  },
  mode: 'signed-manifest',
  confidence: 'operator-signed',
  ens: {
    recordsResolvedLive: true,
    manifestHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
    owner: '0x5555555555555555555555555555555555555555',
  },
  auth: {
    status: 'valid',
    signatureType: 'EIP-712',
    signer: '0x5555555555555555555555555555555555555555',
    signature:
      '0x6666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666',
    signedAt: '2026-05-09T00:00:00Z',
  },
  recommendedAction: 'approve',
  mock: false,
  generatedAt: '2026-05-09T00:00:01Z',
};

const publicReadReport: SirenReport = {
  ...validReport,
  mode: 'public-read',
  confidence: 'public-read',
  verdict: 'REVIEW',
  ens: {
    recordsResolvedLive: true,
    manifestHash: null,
    owner: null,
  },
  auth: {
    status: 'unsigned',
    signatureType: null,
    signer: null,
    signature: null,
    signedAt: null,
  },
  recommendedAction: 'review',
};

describe('SirenReport schema id', () => {
  it('exports the canonical schema id constant', () => {
    expect(SIREN_REPORT_SCHEMA_ID).toBe('siren-report@1');
  });
});

describe('SirenReport JSON schema', () => {
  const validate = buildValidator();

  it('accepts a fully-populated signed-manifest report', () => {
    const ok = validate(validReport);
    expect(validate.errors ?? null).toBeNull();
    expect(ok).toBe(true);
  });

  it('accepts a public-read report with null ens.manifestHash and null auth fields', () => {
    const ok = validate(publicReadReport);
    expect(validate.errors ?? null).toBeNull();
    expect(ok).toBe(true);
  });

  it('rejects a report with an invalid proxy address', () => {
    const bad = { ...validReport, proxy: '0xnothex' };
    expect(validate(bad)).toBe(false);
  });

  it('rejects a report missing a required top-level field', () => {
    const bad: Record<string, unknown> = { ...validReport };
    delete bad['summary'];
    expect(validate(bad)).toBe(false);
  });

  it('rejects unknown top-level properties', () => {
    const bad = { ...validReport, surpriseField: 'nope' };
    expect(validate(bad)).toBe(false);
  });

  it('rejects auth.status=valid when signature fields are null', () => {
    const bad: SirenReport = {
      ...validReport,
      auth: {
        status: 'valid',
        signatureType: null,
        signer: null,
        signature: null,
        signedAt: null,
      },
    };
    expect(validate(bad)).toBe(false);
  });

  it('rejects auth.status=unsigned when signature fields are populated', () => {
    const bad: SirenReport = {
      ...validReport,
      auth: {
        status: 'unsigned',
        signatureType: 'EIP-712',
        signer: '0x5555555555555555555555555555555555555555',
        signature:
          '0x6666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666',
        signedAt: '2026-05-09T00:00:00Z',
      },
    };
    expect(validate(bad)).toBe(false);
  });

  it('rejects an invalid verdict value', () => {
    const bad = { ...validReport, verdict: 'MAYBE' };
    expect(validate(bad)).toBe(false);
  });

  it('rejects a malformed EIP-712 signature length', () => {
    const bad: SirenReport = {
      ...validReport,
      auth: {
        ...validReport.auth,
        signature: '0xdead' as SirenReport['auth']['signature'],
      },
    };
    expect(validate(bad)).toBe(false);
  });

  it('rejects an invalid generatedAt timestamp', () => {
    const bad = { ...validReport, generatedAt: 'not-a-date' };
    expect(validate(bad)).toBe(false);
  });
});

describe('SirenReport TS-to-schema enum parity', () => {
  function enumOfRef(ref: string): ReadonlyArray<string> {
    const props = schema['properties'] as Record<string, { enum?: string[] }>;
    const value = props[ref];
    if (!value || !value.enum) {
      throw new Error(`schema property ${ref} missing enum`);
    }
    return value.enum;
  }

  function defEnumOf(defName: string, propName: string): ReadonlyArray<string> {
    const defs = schema['$defs'] as Record<string, { properties: Record<string, { enum?: string[] }> }>;
    const def = defs[defName];
    const prop = def?.properties[propName];
    if (!prop || !prop.enum) {
      throw new Error(`$defs.${defName}.${propName} missing enum`);
    }
    return prop.enum;
  }

  it('verdict enum matches', () => {
    expect([...enumOfRef('verdict')].sort()).toEqual([...VERDICTS].sort());
  });

  it('mode enum matches', () => {
    expect([...enumOfRef('mode')].sort()).toEqual([...REPORT_MODES].sort());
  });

  it('confidence enum matches', () => {
    expect([...enumOfRef('confidence')].sort()).toEqual([...REPORT_CONFIDENCES].sort());
  });

  it('recommendedAction enum matches', () => {
    expect([...enumOfRef('recommendedAction')].sort()).toEqual([...RECOMMENDED_ACTIONS].sort());
  });

  it('auth.status enum matches', () => {
    expect([...defEnumOf('Auth', 'status')].sort()).toEqual([...AUTH_STATUSES].sort());
  });

  it('finding severity enum matches', () => {
    expect([...defEnumOf('Finding', 'severity')].sort()).toEqual([...FINDING_SEVERITIES].sort());
  });
});
