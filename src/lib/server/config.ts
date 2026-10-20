export type ServerConfig = {
  appUrl: string;
  remoteProcessing: boolean;
  databaseUrl?: string;
  storage: { endpoint?: string; bucket?: string; accessKeyId?: string; secretAccessKey?: string };
  queueUrl?: string;
  workerUrl?: string;
  maxUploadBytes: number;
  jobRetentionHours: number;
};

function optional(name: string) {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
}

export function getServerConfig(): ServerConfig {
  const databaseUrl = optional("DATABASE_URL");
  const endpoint = optional("STORAGE_ENDPOINT");
  const bucket = optional("STORAGE_BUCKET");
  const accessKeyId = optional("STORAGE_ACCESS_KEY_ID");
  const secretAccessKey = optional("STORAGE_SECRET_ACCESS_KEY");
  const queueUrl = optional("QUEUE_URL");
  const workerUrl = optional("WORKER_URL");
  const storageReady = Boolean(endpoint && bucket && accessKeyId && secretAccessKey);
  const remoteProcessing = process.env.REMOTE_PROCESSING_ENABLED === "true" && Boolean(databaseUrl && queueUrl && workerUrl && storageReady);

  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    remoteProcessing,
    databaseUrl,
    storage: { endpoint, bucket, accessKeyId, secretAccessKey },
    queueUrl,
    workerUrl,
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 50 * 1024 * 1024),
    jobRetentionHours: Number(process.env.JOB_RETENTION_HOURS ?? 24),
  };
}
