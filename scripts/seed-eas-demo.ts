/**
 * Seed Turso with an operator-signed off-chain EAS attestation for the
 * booth-demo subject (`siren-agent-demo.upgrade-siren-demo.eth`).
 *
 * Usage:
 *   pnpm tsx scripts/seed-eas-demo.ts
 *
 * Env required:
 *   TURSO_DATABASE_URL
 *   TURSO_AUTH_TOKEN
 *   OPERATOR_PRIVATE_KEY  — same operator key that owns the ENS records
 *
 * What it does:
 *   1. Computes the canonical Bench attestation payload for the demo
 *      subject (matches the demoMocks.ts fixture: tier B, score ~70).
 *   2. Signs the EAS off-chain envelope with the operator wallet on
 *      Sepolia (schema #4219).
 *   3. Inserts/updates the Turso row so /b/siren-agent-demo.upgrade-...
 *      renders the publish widget with a real off-chain bundle ready
 *      for on-chain publication.
 *
 * Re-run anytime — upserts on offchain_uid (deterministic per
 * payload + signer + time, so re-running with the same payload is a
 * no-op except for updated_at).
 */

import { createClient } from '@libsql/client';
import { ethers } from 'ethers';
import { keccak256, namehash, toBytes } from 'viem';

import {
  BENCH_ATTESTATION_SCHEMA,
  BENCH_SCHEMA_UIDS,
  EAS_CONTRACTS,
  NETWORK_CHAIN_IDS,
  buildOffchainAttestation,
  reportHash,
  serializeOffchainAttestation,
  type BenchAttestationPayload,
  type SupportedNetwork,
} from '../packages/evidence/src/eas/index.js';

const SUBJECT_NAME = 'siren-agent-demo.upgrade-siren-demo.eth';
const NETWORK: SupportedNetwork = 'sepolia';

// Demo data — must match demoMocks.ts AGENT_CURATED.
const DEMO_SCORE = 70;
const DEMO_TIER = 'B';
const DEMO_PRIMARY = '0x747E453F13B5B14313E25393Eb443fbAaA250cfC';
const REPORT_URI = `https://upgrade-siren.vercel.app/api/bench/${encodeURIComponent(SUBJECT_NAME)}/report`;

async function main(): Promise<void> {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  const privateKey = process.env.OPERATOR_PRIVATE_KEY;
  if (!tursoUrl) throw new Error('TURSO_DATABASE_URL not set');
  if (!tursoToken) throw new Error('TURSO_AUTH_TOKEN not set');
  if (!privateKey) throw new Error('OPERATOR_PRIVATE_KEY not set');

  // ethers signer for eas-sdk (signOffchainAttestation expects an
  // ethers Signer).
  const provider = new ethers.JsonRpcProvider(
    process.env.ALCHEMY_RPC_SEPOLIA ?? 'https://ethereum-sepolia-rpc.publicnode.com',
  );
  const wallet = new ethers.Wallet(
    privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`,
    provider,
  );

  // Canonical report bytes — keep simple JSON shape; verifiers
  // reproduce the same hash from this string.
  const computedAt = Math.floor(Date.now() / 1000);
  const canonicalReportJson = JSON.stringify({
    schema: 'siren-bench-report@1',
    name: SUBJECT_NAME,
    score_100: DEMO_SCORE,
    tier: DEMO_TIER,
    primaryAddress: DEMO_PRIMARY,
    computedAt,
  });
  const reportHashHex = reportHash(canonicalReportJson);

  const payload: BenchAttestationPayload = {
    subject: DEMO_PRIMARY,
    ensNamehash: namehash(SUBJECT_NAME) as `0x${string}`,
    score: DEMO_SCORE,
    tier: DEMO_TIER,
    computedAt,
    reportHash: reportHashHex,
    reportUri: REPORT_URI,
  };

  console.log('Subject:    ', SUBJECT_NAME);
  console.log('Schema UID: ', BENCH_SCHEMA_UIDS[NETWORK]);
  console.log('Operator:   ', wallet.address);
  console.log('Score/tier: ', DEMO_SCORE, DEMO_TIER);
  console.log('reportHash: ', reportHashHex);
  console.log();
  console.log('Building off-chain attestation…');

  const { envelope, serialized } = await buildOffchainAttestation(payload, {
    signer: wallet,
    network: NETWORK,
    recipient: DEMO_PRIMARY,
  });

  console.log('Off-chain UID:', envelope.uid);
  console.log();

  const turso = createClient({ url: tursoUrl, authToken: tursoToken });
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS eas_attestations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_name TEXT NOT NULL,
      offchain_uid TEXT NOT NULL UNIQUE,
      offchain_network TEXT NOT NULL,
      offchain_serialized TEXT NOT NULL,
      score INTEGER NOT NULL,
      tier TEXT NOT NULL,
      computed_at INTEGER NOT NULL,
      report_hash TEXT NOT NULL,
      report_uri TEXT NOT NULL,
      onchain_status TEXT NOT NULL DEFAULT 'not-published',
      onchain_uid TEXT,
      onchain_network TEXT,
      onchain_tx_hash TEXT,
      onchain_published_at TEXT,
      onchain_published_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  const now = Math.floor(Date.now() / 1000);
  await turso.execute({
    sql: `
      INSERT INTO eas_attestations (
        subject_name, offchain_uid, offchain_network, offchain_serialized,
        score, tier, computed_at, report_hash, report_uri,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(offchain_uid) DO UPDATE SET
        subject_name = excluded.subject_name,
        offchain_network = excluded.offchain_network,
        offchain_serialized = excluded.offchain_serialized,
        score = excluded.score,
        tier = excluded.tier,
        computed_at = excluded.computed_at,
        report_hash = excluded.report_hash,
        report_uri = excluded.report_uri,
        updated_at = excluded.updated_at
    `,
    args: [
      SUBJECT_NAME,
      envelope.uid,
      NETWORK,
      serializeOffchainAttestation(envelope),
      DEMO_SCORE,
      DEMO_TIER,
      computedAt,
      reportHashHex,
      REPORT_URI,
      now,
      now,
    ],
  });

  console.log('✓ Turso row written.');
  console.log();
  console.log('Demo flow ready:');
  console.log(`  1. Open https://upgrade-siren.vercel.app/b/${encodeURIComponent(SUBJECT_NAME)}`);
  console.log('  2. Connect wallet (import OPERATOR_PRIVATE_KEY into MetaMask, switch to Sepolia)');
  console.log('  3. Click "Publish to EAS (sepolia)"');
  console.log('  4. Confirm tx → wait ~15s → "View on EAS Explorer ↗"');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});