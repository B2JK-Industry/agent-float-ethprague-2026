#!/usr/bin/env node
// Regenerates packages/evidence/test/fixtures/vault-deployed-bytecode.json
// from the Foundry-compiled artifacts at contracts/out/. Run from the repo
// root after `forge build`:
//
//   forge build
//   node packages/evidence/test/fixtures/extract-bytecode.mjs
//
// The output is committed and consumed by bytecodeMatch.test.ts so the
// US-078 V1-anchored hypothesis test runs against the same compiled
// bytecode operators see in `eth_getCode` against the on-chain Sepolia
// VaultV1Derivative deployment (when US-080 ships its deploy).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');
const artifactsDir = resolve(repoRoot, 'contracts/out');

const CONTRACTS = ['VaultV1', 'VaultV1Derivative', 'VaultV2Safe', 'VaultV2Dangerous'];

function loadArtifact(name) {
  const path = resolve(artifactsDir, `${name}.sol`, `${name}.json`);
  const json = JSON.parse(readFileSync(path, 'utf8'));
  if (typeof json.deployedBytecode?.object !== 'string') {
    throw new Error(`${name}: missing deployedBytecode.object`);
  }
  return json.deployedBytecode.object;
}

const fixtures = {
  source:
    'Foundry compiled deployedBytecode (solc 0.8.24, optimizer_runs=200, foundry.toml at repo root). ' +
    'Regenerate with: forge build && node packages/evidence/test/fixtures/extract-bytecode.mjs',
  contracts: Object.fromEntries(CONTRACTS.map((name) => [name, loadArtifact(name)])),
};

const outPath = resolve(here, 'vault-deployed-bytecode.json');
writeFileSync(outPath, JSON.stringify(fixtures, null, 2) + '\n', 'utf8');
console.log(`wrote ${CONTRACTS.length} fixtures to ${outPath}`);
