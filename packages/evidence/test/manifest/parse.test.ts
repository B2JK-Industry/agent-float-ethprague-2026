import { describe, expect, it } from 'vitest';

import { parseUpgradeManifest } from '../../src/manifest/parse.js';
import { MANIFEST_SCHEMA_V1 } from '../../src/manifest/types.js';

const validRaw = JSON.stringify({
  schema: MANIFEST_SCHEMA_V1,
  chainId: 11155111,
  proxy: '0x1111111111111111111111111111111111111111',
  previousImpl: '0x2222222222222222222222222222222222222222',
  currentImpl: '0x3333333333333333333333333333333333333333',
  reportUri: 'https://upgradesiren.app/r/vault.demo.upgradesiren.eth',
  reportHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
  version: 3,
  effectiveFrom: '2026-05-09T12:00:00Z',
  previousManifestHash: '0x5555555555555555555555555555555555555555555555555555555555555555',
});

describe('parseUpgradeManifest', () => {
  it('parses a fully-populated v1 manifest', () => {
    const result = parseUpgradeManifest(validRaw);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value.schema).toBe(MANIFEST_SCHEMA_V1);
      expect(result.value.chainId).toBe(11155111);
      expect(result.value.version).toBe(3);
      expect(result.value.proxy).toBe('0x1111111111111111111111111111111111111111');
      expect(result.value.reportUri).toContain('https://');
    }
  });

  it('returns malformed_json for non-JSON input', () => {
    const result = parseUpgradeManifest('not json');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') expect(result.error.reason).toBe('malformed_json');
  });

  it('returns not_an_object for JSON arrays/primitives at the top level', () => {
    expect(parseUpgradeManifest('[]').kind).toBe('error');
    expect(parseUpgradeManifest('123').kind).toBe('error');
    expect(parseUpgradeManifest('"hi"').kind).toBe('error');

    const r = parseUpgradeManifest('[]');
    if (r.kind === 'error') expect(r.error.reason).toBe('not_an_object');
  });

  it('returns missing_required_field with the offending field name', () => {
    const obj = JSON.parse(validRaw);
    delete obj.proxy;
    const result = parseUpgradeManifest(JSON.stringify(obj));
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.reason).toBe('missing_required_field');
      expect(result.error.field).toBe('proxy');
    }
  });

  it('returns unknown_schema_version for any schema other than v1', () => {
    const obj = JSON.parse(validRaw);
    obj.schema = 'siren-upgrade-manifest@2';
    const result = parseUpgradeManifest(JSON.stringify(obj));
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.reason).toBe('unknown_schema_version');
      expect(result.error.got).toBe('siren-upgrade-manifest@2');
    }
  });

  it('returns invalid_address for a non-hex proxy', () => {
    const obj = JSON.parse(validRaw);
    obj.proxy = 'not-an-address';
    const result = parseUpgradeManifest(JSON.stringify(obj));
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.reason).toBe('invalid_address');
      expect(result.error.field).toBe('proxy');
    }
  });

  it('returns invalid_address for a too-short address', () => {
    const obj = JSON.parse(validRaw);
    obj.previousImpl = '0xdead';
    const result = parseUpgradeManifest(JSON.stringify(obj));
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.reason).toBe('invalid_address');
      expect(result.error.field).toBe('previousImpl');
    }
  });

  it('returns invalid_hash for a non-32-byte reportHash', () => {
    const obj = JSON.parse(validRaw);
    obj.reportHash = '0xdead';
    const result = parseUpgradeManifest(JSON.stringify(obj));
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.reason).toBe('invalid_hash');
      expect(result.error.field).toBe('reportHash');
    }
  });

  it('returns invalid_hash for a non-32-byte previousManifestHash', () => {
    const obj = JSON.parse(validRaw);
    obj.previousManifestHash = '0xfeed';
    const result = parseUpgradeManifest(JSON.stringify(obj));
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.reason).toBe('invalid_hash');
      expect(result.error.field).toBe('previousManifestHash');
    }
  });

  it('returns invalid_chain_id for a string or non-positive value', () => {
    const obj = JSON.parse(validRaw);
    obj.chainId = '11155111';
    expect(parseUpgradeManifest(JSON.stringify(obj)).kind).toBe('error');
    obj.chainId = 0;
    expect(parseUpgradeManifest(JSON.stringify(obj)).kind).toBe('error');
    const r = parseUpgradeManifest(JSON.stringify({ ...obj, chainId: -1 }));
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.error.reason).toBe('invalid_chain_id');
  });

  it('returns invalid_version for a string or fractional version', () => {
    const obj = JSON.parse(validRaw);
    obj.version = '3';
    const r1 = parseUpgradeManifest(JSON.stringify(obj));
    expect(r1.kind).toBe('error');
    obj.version = 3.5;
    const r2 = parseUpgradeManifest(JSON.stringify(obj));
    expect(r2.kind).toBe('error');
    if (r2.kind === 'error') expect(r2.error.reason).toBe('invalid_version');
  });

  it('returns invalid_iso_timestamp for date-only or junk values', () => {
    const obj = JSON.parse(validRaw);
    obj.effectiveFrom = '2026-05-09'; // missing time
    expect(parseUpgradeManifest(JSON.stringify(obj)).kind).toBe('error');
    obj.effectiveFrom = 'not a date';
    const r = parseUpgradeManifest(JSON.stringify(obj));
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.error.reason).toBe('invalid_iso_timestamp');
  });

  it('returns invalid_report_uri for an empty string', () => {
    const obj = JSON.parse(validRaw);
    obj.reportUri = '';
    const r = parseUpgradeManifest(JSON.stringify(obj));
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.error.reason).toBe('invalid_report_uri');
  });

  it('accepts ipfs:// and ar:// report URIs', () => {
    for (const uri of [
      'ipfs://QmExampleManifestReport',
      'ar://abc123',
      'https://example.com/r/x',
    ]) {
      const r = parseUpgradeManifest(JSON.stringify({ ...JSON.parse(validRaw), reportUri: uri }));
      expect(r.kind).toBe('ok');
    }
  });
});
