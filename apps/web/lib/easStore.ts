// Turso-backed persistence for EAS attestations.
//
// One row per (subject_name, generated_at) — when a fresh report is
// produced, we write the off-chain envelope; when the subject publishes
// on-chain via the wallet flow + record-publish endpoint, the matching
// row is updated with the on-chain UID + tx hash.
//
// Schema is created on first connection via `IF NOT EXISTS`, no
// dedicated migration step. Adapt to a separate migration runner if
// the schema gains complexity.

import { createClient, type Client } from "@libsql/client";

import type {
  BenchAttestationBundle,
  OnchainAttestationRecord,
  SupportedNetwork,
} from "@upgrade-siren/evidence";

let cachedClient: Client | null = null;
let schemaReady = false;

function getClient(): Client {
  if (cachedClient) return cachedClient;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL not set");
  if (!authToken) throw new Error("TURSO_AUTH_TOKEN not set");
  cachedClient = createClient({ url, authToken });
  return cachedClient;
}

async function ensureSchema(client: Client): Promise<void> {
  if (schemaReady) return;
  await client.execute(`
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
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_eas_subject ON eas_attestations(subject_name);
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_eas_onchain_uid ON eas_attestations(onchain_uid);
  `);
  schemaReady = true;
}

export interface SaveOffchainParams {
  readonly subjectName: string;
  readonly offchainUid: `0x${string}`;
  readonly offchainNetwork: SupportedNetwork;
  readonly offchainSerialized: string;
  readonly score: number;
  readonly tier: string;
  readonly computedAt: number;
  readonly reportHash: `0x${string}`;
  readonly reportUri: string;
}

export async function saveOffchainAttestation(
  params: SaveOffchainParams,
): Promise<void> {
  const client = getClient();
  await ensureSchema(client);
  const now = Math.floor(Date.now() / 1000);
  await client.execute({
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
      params.subjectName,
      params.offchainUid,
      params.offchainNetwork,
      params.offchainSerialized,
      params.score,
      params.tier,
      params.computedAt,
      params.reportHash,
      params.reportUri,
      now,
      now,
    ],
  });
}

export interface RecordOnchainParams {
  readonly offchainUid: `0x${string}`;
  readonly onchainUid: `0x${string}`;
  readonly onchainNetwork: SupportedNetwork;
  readonly onchainTxHash: `0x${string}`;
  readonly onchainPublishedBy: `0x${string}`;
}

export async function recordOnchainPublication(
  params: RecordOnchainParams,
): Promise<{ updated: boolean }> {
  const client = getClient();
  await ensureSchema(client);
  const publishedAt = new Date().toISOString();
  const now = Math.floor(Date.now() / 1000);
  const result = await client.execute({
    sql: `
      UPDATE eas_attestations SET
        onchain_status = 'published',
        onchain_uid = ?,
        onchain_network = ?,
        onchain_tx_hash = ?,
        onchain_published_at = ?,
        onchain_published_by = ?,
        updated_at = ?
      WHERE offchain_uid = ?
    `,
    args: [
      params.onchainUid,
      params.onchainNetwork,
      params.onchainTxHash,
      publishedAt,
      params.onchainPublishedBy,
      now,
      params.offchainUid,
    ],
  });
  return { updated: (result.rowsAffected ?? 0) > 0 };
}

export async function loadLatestAttestationForSubject(
  subjectName: string,
): Promise<BenchAttestationBundle | null> {
  const client = getClient();
  await ensureSchema(client);
  const result = await client.execute({
    sql: `
      SELECT offchain_uid, offchain_network, offchain_serialized,
             score, tier, computed_at, report_hash, report_uri,
             onchain_status, onchain_uid, onchain_network,
             onchain_tx_hash, onchain_published_at, onchain_published_by
      FROM eas_attestations
      WHERE subject_name = ?
      ORDER BY computed_at DESC
      LIMIT 1
    `,
    args: [subjectName],
  });
  const row = result.rows[0];
  if (!row) return null;

  const score = Number(row.score);
  const tier = String(row.tier);
  const computedAt = Number(row.computed_at);
  const reportHash = String(row.report_hash) as `0x${string}`;
  const reportUri = String(row.report_uri);

  const bundle: BenchAttestationBundle = {
    offchain: {
      uid: String(row.offchain_uid) as `0x${string}`,
      serialized: String(row.offchain_serialized),
      network: String(row.offchain_network) as SupportedNetwork,
      payload: {
        // subject + ensNamehash are encoded inside the EAS data field;
        // the API client decodes when needed. Surfaced fields below
        // mirror the on-chain row.
        subject: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        ensNamehash:
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        score,
        tier,
        computedAt,
        reportHash,
        reportUri,
      },
    },
    onchain:
      row.onchain_status === "published"
        ? ({
            status: "published",
            uid: String(row.onchain_uid) as `0x${string}`,
            network: String(row.onchain_network) as SupportedNetwork,
            txHash: String(row.onchain_tx_hash) as `0x${string}`,
            publishedAt: String(row.onchain_published_at),
            publishedBy: String(row.onchain_published_by) as `0x${string}`,
            payload: {
              subject:
                "0x0000000000000000000000000000000000000000" as `0x${string}`,
              ensNamehash:
                "0x0000000000000000000000000000000000000000000000000000000000000000",
              score,
              tier,
              computedAt,
              reportHash,
              reportUri,
            },
          } as OnchainAttestationRecord & { status: "published" })
        : { status: "not-published" },
  };
  return bundle;
}