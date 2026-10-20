export type JobStatus = "queued" | "processing" | "completed" | "failed" | "canceled" | "expired";

export type RemoteJob = {
  id: string;
  ownerId: string | null;
  operation: string;
  status: JobStatus;
  progress: number | null;
  inputObjectKeys: string[];
  outputObjectKey: string | null;
  attempts: number;
  createdAt: string;
  expiresAt: string;
  errorCode?: string;
};

export type CreateJobRequest = {
  operation: string;
  inputObjectKeys: string[];
  idempotencyKey: string;
};

export interface JobRepository {
  create(request: CreateJobRequest, ownerId: string | null): Promise<RemoteJob>;
  getById(id: string, ownerId: string | null): Promise<RemoteJob | null>;
  cancel(id: string, ownerId: string | null): Promise<boolean>;
}

export interface PrivateObjectStorage {
  createUploadUrl(input: { objectKey: string; contentType: string; maxBytes: number }): Promise<string>;
  createDownloadUrl(input: { objectKey: string; filename: string; expiresInSeconds: number }): Promise<string>;
  deleteObject(objectKey: string): Promise<void>;
}

export interface ProcessingQueue {
  enqueue(jobId: string): Promise<void>;
}
