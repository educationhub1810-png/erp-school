import { Pool } from "pg";

// A tiny store for in-app test-run history, kept in the *test* database
// (neontestdb via TEST_DATABASE_URL) so nothing test-related touches prod.
//
// Deliberately standalone (raw SQL, own pg pool) rather than part of the app's
// Prisma schema/migrations — the prod database never learns about this table.

const HISTORY_LIMIT = 5;

export interface TestRunFile {
  name: string;
  passed: number;
  failed: number;
}

export interface TestRunRecord {
  id: string;
  createdAt: string;
  total: number;
  passed: number;
  failed: number;
  pending: number;
  durationMs: number;
  triggeredBy: string | null;
  files: TestRunFile[];
}

const globalForTestDb = globalThis as unknown as { testDbPool?: Pool };

function getPool(): Pool | null {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return null;
  globalForTestDb.testDbPool ??= new Pool({ connectionString: url, max: 2 });
  return globalForTestDb.testDbPool;
}

async function ensureTable(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS test_runs (
      id           TEXT PRIMARY KEY,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      total        INTEGER NOT NULL,
      passed       INTEGER NOT NULL,
      failed       INTEGER NOT NULL,
      pending      INTEGER NOT NULL DEFAULT 0,
      duration_ms  INTEGER NOT NULL DEFAULT 0,
      triggered_by TEXT,
      files        JSONB
    )
  `);
}

export interface SaveTestRunInput {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  durationMs: number;
  triggeredBy?: string | null;
  files: TestRunFile[];
}

/** Persist a run and prune history to the most recent {@link HISTORY_LIMIT}. */
export async function saveTestRun(input: SaveTestRunInput): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;
  await ensureTable(pool);
  const id = `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await pool.query(
    `INSERT INTO test_runs (id, total, passed, failed, pending, duration_ms, triggered_by, files)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, input.total, input.passed, input.failed, input.pending, input.durationMs, input.triggeredBy ?? null, JSON.stringify(input.files)],
  );
  // Keep only the newest HISTORY_LIMIT rows.
  await pool.query(
    `DELETE FROM test_runs WHERE id NOT IN (
       SELECT id FROM test_runs ORDER BY created_at DESC LIMIT $1
     )`,
    [HISTORY_LIMIT],
  );
  return true;
}

/** Most recent runs, newest first. Returns [] if no test DB is configured. */
export async function getRecentTestRuns(limit = HISTORY_LIMIT): Promise<TestRunRecord[]> {
  const pool = getPool();
  if (!pool) return [];
  await ensureTable(pool);
  const { rows } = await pool.query(
    `SELECT id, created_at, total, passed, failed, pending, duration_ms, triggered_by, files
     FROM test_runs ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({
    id: r.id,
    createdAt: new Date(r.created_at).toISOString(),
    total: r.total,
    passed: r.passed,
    failed: r.failed,
    pending: r.pending,
    durationMs: r.duration_ms,
    triggeredBy: r.triggered_by,
    files: Array.isArray(r.files) ? r.files : [],
  }));
}
