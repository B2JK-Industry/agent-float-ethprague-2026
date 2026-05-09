import { createPublicClient, custom, type EIP1193Parameters, type PublicRpcSchema } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { describe, expect, it } from 'vitest';

import {
  AGENT_BENCH_MANIFEST_SCHEMA_V1,
  AGENT_BENCH_RECORD_KEYS,
  type SubjectManifest,
} from '@upgrade-siren/shared';

import { resolveSubjectFromEns } from '../../src/subject/resolver.js';

type RpcRequest = EIP1193Parameters<PublicRpcSchema>;

function makeClient(getEnsTextHandler: (key: string) => Promise<string | null>) {
  const client = createPublicClient({
    chain: mainnet,
    transport: custom({
      async request(args) {
        const req = args as RpcRequest;
        throw new Error(`unmocked rpc method: ${req.method}`);
      },
    }),
  });
  type GetEnsText = (typeof client)['getEnsText'];
  const replacement = (async ({ key }: { key: string }) => getEnsTextHandler(key)) as unknown as GetEnsText;
  Object.defineProperty(client, 'getEnsText', { value: replacement, configurable: true });
  return client;
}

const validManifest: SubjectManifest = {
  schema: AGENT_BENCH_MANIFEST_SCHEMA_V1,
  kind: 'ai-agent',
  sources: {
    sourcify: [
      { chainId: 1, address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Treasury Multisig' },
      { chainId: 11155111, address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', label: 'Yield Vault' },
    ],
    github: { owner: 'vbuterin', verified: false, verificationGist: null },
    onchain: { primaryAddress: '0xcccccccccccccccccccccccccccccccccccccccc', claimedFirstTxHash: null },
    ensInternal: { rootName: 'someagent.eth' },
  },
  version: 1,
  previousManifestHash: null,
};

describe('resolveSubjectFromEns', () => {
  describe('input validation', () => {
    it('returns invalid_name for syntactically broken inputs', async () => {
      for (const bad of ['', '   ', 'no-tld', 'two..dots.eth', '.leading.eth', 'trailing.', 'notld.']) {
        const result = await resolveSubjectFromEns(bad);
        expect(result.kind).toBe('error');
        if (result.kind === 'error') expect(result.reason).toBe('invalid_name');
      }
    });

    it('returns unsupported_chain when chainId is unknown and no client is injected', async () => {
      const result = await resolveSubjectFromEns('subject.someagent.eth', { chainId: 999_999 });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('unsupported_chain');
    });
  });

  describe('happy path', () => {
    it('returns ok with parsed manifest when bench_manifest is present and schema-valid', async () => {
      const recordValues: Record<string, string | null> = {
        [AGENT_BENCH_RECORD_KEYS.benchManifest]: JSON.stringify(validManifest),
        [AGENT_BENCH_RECORD_KEYS.owner]: '0xdddddddddddddddddddddddddddddddddddddddd',
        [AGENT_BENCH_RECORD_KEYS.schema]: 'agent-bench-manifest@1',
      };
      const client = makeClient(async (key) => recordValues[key] ?? null);

      const result = await resolveSubjectFromEns('someagent.eth', {
        chainId: sepolia.id,
        client,
      });

      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.manifest.schema).toBe(AGENT_BENCH_MANIFEST_SCHEMA_V1);
        expect(result.manifest.kind).toBe('ai-agent');
        expect(result.manifest.sources.sourcify).toHaveLength(2);
        expect(result.manifest.sources.github?.owner).toBe('vbuterin');
        expect(result.manifest.sources.github?.verified).toBe(false);
        expect(result.manifest.version).toBe(1);
        expect(result.manifest.previousManifestHash).toBeNull();
        expect(result.records.owner).toBe('0xdddddddddddddddddddddddddddddddddddddddd');
        expect(result.flags).toEqual({
          benchManifestPresent: true,
          ownerPresent: true,
          schemaPresent: true,
        });
        expect(result.chainId).toBe(sepolia.id);
        expect(result.name).toBe('someagent.eth');
      }
    });

    it('accepts a manifest with previousManifestHash linking to a prior version', async () => {
      const linked: SubjectManifest = {
        ...validManifest,
        version: 2,
        previousManifestHash: `0x${'a'.repeat(64)}`,
      };
      const client = makeClient(async (key) =>
        key === AGENT_BENCH_RECORD_KEYS.benchManifest ? JSON.stringify(linked) : null,
      );
      const result = await resolveSubjectFromEns('someagent.eth', { client });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.manifest.version).toBe(2);
        expect(result.manifest.previousManifestHash).toBe(`0x${'a'.repeat(64)}`);
      }
    });

    it('accepts a manifest with empty sources object', async () => {
      const minimal: SubjectManifest = {
        schema: AGENT_BENCH_MANIFEST_SCHEMA_V1,
        kind: 'project',
        sources: {},
        version: 1,
        previousManifestHash: null,
      };
      const client = makeClient(async (key) =>
        key === AGENT_BENCH_RECORD_KEYS.benchManifest ? JSON.stringify(minimal) : null,
      );
      const result = await resolveSubjectFromEns('someagent.eth', { client });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.manifest.sources).toEqual({});
        expect(result.manifest.kind).toBe('project');
      }
    });
  });

  describe('no_manifest path', () => {
    it('returns no_manifest when bench_manifest record is absent', async () => {
      const client = makeClient(async () => null);
      const result = await resolveSubjectFromEns('someagent.eth', { client });
      expect(result.kind).toBe('no_manifest');
      if (result.kind === 'no_manifest') {
        expect(result.flags.benchManifestPresent).toBe(false);
        expect(result.flags.ownerPresent).toBe(false);
        expect(result.flags.schemaPresent).toBe(false);
        expect(result.records.benchManifestRaw).toBeNull();
        expect(result.name).toBe('someagent.eth');
      }
    });

    it('returns no_manifest even when owner/schema records are present (manifest is the gating record)', async () => {
      const client = makeClient(async (key) =>
        key === AGENT_BENCH_RECORD_KEYS.owner ? '0xdddddddddddddddddddddddddddddddddddddddd' : null,
      );
      const result = await resolveSubjectFromEns('someagent.eth', { client });
      expect(result.kind).toBe('no_manifest');
      if (result.kind === 'no_manifest') {
        expect(result.flags.ownerPresent).toBe(true);
        expect(result.flags.benchManifestPresent).toBe(false);
      }
    });
  });

  describe('error paths', () => {
    it('returns rpc_error when getEnsText throws', async () => {
      const client = makeClient(async () => {
        throw new Error('viem timeout');
      });
      const result = await resolveSubjectFromEns('someagent.eth', { client });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.reason).toBe('rpc_error');
        expect(result.message).toContain('viem timeout');
      }
    });

    it('returns parse_error when bench_manifest is not valid JSON', async () => {
      const client = makeClient(async (key) =>
        key === AGENT_BENCH_RECORD_KEYS.benchManifest ? '{not json' : null,
      );
      const result = await resolveSubjectFromEns('someagent.eth', { client });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.reason).toBe('parse_error');
      }
    });

    it('returns schema_error when schema field is wrong', async () => {
      const wrong = { ...validManifest, schema: 'wrong-schema@1' };
      const client = makeClient(async (key) =>
        key === AGENT_BENCH_RECORD_KEYS.benchManifest ? JSON.stringify(wrong) : null,
      );
      const result = await resolveSubjectFromEns('someagent.eth', { client });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.reason).toBe('schema_error');
        expect(result.schemaErrors).toBeDefined();
        expect(result.schemaErrors!.length).toBeGreaterThan(0);
      }
    });

    it('returns schema_error when kind is invalid', async () => {
      const wrong = { ...validManifest, kind: 'spaceship' };
      const client = makeClient(async (key) =>
        key === AGENT_BENCH_RECORD_KEYS.benchManifest ? JSON.stringify(wrong) : null,
      );
      const result = await resolveSubjectFromEns('someagent.eth', { client });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('schema_error');
    });

    it('returns schema_error when sourcify entry has malformed address', async () => {
      const wrong = {
        ...validManifest,
        sources: {
          ...validManifest.sources,
          sourcify: [{ chainId: 1, address: '0xnothex', label: 'Bad' }],
        },
      };
      const client = makeClient(async (key) =>
        key === AGENT_BENCH_RECORD_KEYS.benchManifest ? JSON.stringify(wrong) : null,
      );
      const result = await resolveSubjectFromEns('someagent.eth', { client });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('schema_error');
    });

    it('returns schema_error when version is zero', async () => {
      const wrong = { ...validManifest, version: 0 };
      const client = makeClient(async (key) =>
        key === AGENT_BENCH_RECORD_KEYS.benchManifest ? JSON.stringify(wrong) : null,
      );
      const result = await resolveSubjectFromEns('someagent.eth', { client });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('schema_error');
    });

    it('returns schema_error when extra unknown property is present (additionalProperties: false)', async () => {
      const wrong = { ...validManifest, extraneous: true };
      const client = makeClient(async (key) =>
        key === AGENT_BENCH_RECORD_KEYS.benchManifest ? JSON.stringify(wrong) : null,
      );
      const result = await resolveSubjectFromEns('someagent.eth', { client });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('schema_error');
    });

    it('returns schema_error when github.verified=true but verificationGist is null (v2 cross-sign requires URL)', async () => {
      const wrong: unknown = {
        ...validManifest,
        sources: {
          ...validManifest.sources,
          github: { owner: 'vbuterin', verified: true, verificationGist: null },
        },
      };
      const client = makeClient(async (key) =>
        key === AGENT_BENCH_RECORD_KEYS.benchManifest ? JSON.stringify(wrong) : null,
      );
      const result = await resolveSubjectFromEns('someagent.eth', { client });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('schema_error');
    });
  });

  describe('default chain', () => {
    it('defaults to mainnet when no chainId is provided', async () => {
      const client = makeClient(async () => null);
      const result = await resolveSubjectFromEns('someagent.eth', { client });
      expect(result.kind).toBe('no_manifest');
      if (result.kind === 'no_manifest') {
        expect(result.chainId).toBe(mainnet.id);
      }
    });
  });
});
