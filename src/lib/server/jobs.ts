import { Queue } from "bullmq";
import { Pool } from "pg";
import { getServerConfig } from "./config";
import type { JobRepository, ProcessingQueue, RemoteJob } from "./contracts";

let pool: Pool | undefined;
let queue: Queue | undefined;

function database() {
  const config = getServerConfig();
  if (!config.databaseUrl) throw new Error("database_not_configured");
  pool ??= new Pool({ connectionString: config.databaseUrl, max: 5, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 3_000 });
  return pool;
}

function processingQueue() {
  const config = getServerConfig();
  if (!config.queueUrl) throw new Error("queue_not_configured");
  queue ??= new Queue("fileforge-processing", { connection: { url: config.queueUrl } });
  return queue;
}

function mapJob(row: Record<string, unknown>): RemoteJob {
  return { id: String(row.id), ownerId: row.owner_id ? String(row.owner_id) : null, operation: String(row.operation), status: row.status as RemoteJob["status"], progress: row.progress == null ? null : Number(row.progress), inputObjectKeys: row.input_object_keys as string[], outputObjectKey: row.output_object_key ? String(row.output_object_key) : null, attempts: Number(row.attempts), createdAt: new Date(String(row.created_at)).toISOString(), expiresAt: new Date(String(row.expires_at)).toISOString(), errorCode: row.error_code ? String(row.error_code) : undefined };
}

export function createJobRepository(): JobRepository {
  return {
    async create(request, ownerId) {
      const config = getServerConfig();
      const expiresAt = new Date(Date.now() + config.jobRetentionHours * 60 * 60 * 1000);
      const result = await database().query("INSERT INTO processing_jobs (id, owner_id, operation, status, idempotency_key, input_object_keys, expires_at) VALUES (gen_random_uuid(), $1, $2, 'queued', $3, $4::jsonb, $5) ON CONFLICT (owner_id, idempotency_key) DO UPDATE SET id = processing_jobs.id RETURNING *", [ownerId, request.operation, request.idempotencyKey, JSON.stringify(request.inputObjectKeys), expiresAt]);
      return mapJob(result.rows[0]);
    },
    async getById(id, ownerId) {
      const result = await database().query("SELECT * FROM processing_jobs WHERE id = $1 AND owner_id = $2", [id, ownerId]);
      return result.rows[0] ? mapJob(result.rows[0]) : null;
    },
    async cancel(id, ownerId) {
      const result = await database().query("UPDATE processing_jobs SET status = 'canceled' WHERE id = $1 AND owner_id = $2 AND status IN ('queued', 'processing')", [id, ownerId]);
      return result.rowCount === 1;
    },
  };
}

export function createProcessingQueue(): ProcessingQueue {
  return { async enqueue(jobId) { await processingQueue().add("process-file", { jobId }, { jobId, attempts: 3, backoff: { type: "exponential", delay: 2_000 }, removeOnComplete: { age: 86_400 }, removeOnFail: { age: 604_800 } }); } };
}
