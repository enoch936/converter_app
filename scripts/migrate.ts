import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required. Set it in the environment before running npm run db:migrate.");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5_000 });
const client = await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock(481324)");
  const migration = await readFile(new URL("../db/migrations/0001_remote_jobs.sql", import.meta.url), "utf8");
  await client.query("BEGIN");
  await client.query(migration);
  await client.query("COMMIT");
  console.log("Applied 0001_remote_jobs.sql");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error("Migration failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.query("SELECT pg_advisory_unlock(481324)").catch(() => undefined);
  client.release();
  await pool.end();
}
