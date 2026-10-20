import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Worker } from "bullmq";
import { PDFDocument } from "pdf-lib";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";

const databaseUrl = process.env.DATABASE_URL;
const queueUrl = process.env.QUEUE_URL;
const bucket = process.env.STORAGE_BUCKET;
const endpoint = process.env.STORAGE_ENDPOINT;
const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
if (!databaseUrl || !queueUrl || !bucket || !endpoint || !accessKeyId || !secretAccessKey) throw new Error("Worker requires DATABASE_URL, QUEUE_URL, private storage settings, and credentials.");

const pool = new Pool({ connectionString: databaseUrl, max: Number(process.env.WORKER_DB_POOL_SIZE ?? 4) });
const storage = new S3Client({ endpoint, region: process.env.STORAGE_REGION ?? "auto", forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true", credentials: { accessKeyId, secretAccessKey } });

async function readObject(key: string) {
  const response = await storage.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error("input_object_empty");
  return Buffer.from(await response.Body.transformToByteArray());
}

async function mergePdf(inputKeys: string[]) {
  const output = await PDFDocument.create();
  for (const key of inputKeys) {
    const source = await PDFDocument.load(await readObject(key), { ignoreEncryption: false });
    const pages = await output.copyPages(source, source.getPageIndices());
    pages.forEach((page) => output.addPage(page));
  }
  return Buffer.from(await output.save());
}

async function processJob(jobId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("SELECT * FROM processing_jobs WHERE id = $1 FOR UPDATE", [jobId]);
    const job = result.rows[0];
    if (!job || job.status === "canceled" || job.status === "expired" || job.status === "completed") { await client.query("COMMIT"); return; }
    await client.query("UPDATE processing_jobs SET status = 'processing', started_at = now(), attempts = attempts + 1 WHERE id = $1", [jobId]);
    await client.query("COMMIT");

    if (job.operation !== "pdf-merge") throw new Error("unsupported_worker_operation");
    const output = await mergePdf(job.input_object_keys as string[]);
    const outputKey = `outputs/${jobId}/${randomUUID()}.pdf`;
    await storage.send(new PutObjectCommand({ Bucket: bucket, Key: outputKey, Body: output, ContentType: "application/pdf" }));
    await client.query("UPDATE processing_jobs SET status = 'completed', progress = 100, output_object_key = $2, completed_at = now() WHERE id = $1", [jobId, outputKey]);
  } catch (error) {
    await client.query("UPDATE processing_jobs SET status = 'failed', error_code = $2 WHERE id = $1", [jobId, error instanceof Error ? error.message.slice(0, 120) : "worker_failed"]);
    throw error;
  } finally { client.release(); }
}

const worker = new Worker("fileforge-processing", async (job) => processJob(String(job.data.jobId)), { connection: { url: queueUrl }, concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2), maxStalledCount: 1, stalledInterval: 30_000 });
worker.on("failed", (job, error) => console.error("FileForge worker job failed", { jobId: job?.id, message: error.message }));
worker.on("error", (error) => console.error("FileForge worker error", { message: error.message }));

const shutdown = async () => { await worker.close(); await pool.end(); process.exit(0); };
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
console.log("FileForge processing worker started");
