CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Apply only when a managed PostgreSQL provider is configured.
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY,
  owner_id TEXT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'canceled', 'expired')),
  progress SMALLINT NULL CHECK (progress IS NULL OR (progress >= 0 AND progress <= 100)),
  idempotency_key TEXT NOT NULL,
  input_object_keys JSONB NOT NULL,
  output_object_key TEXT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0,
  error_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (owner_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS processing_jobs_owner_status_idx ON processing_jobs (owner_id, status);
CREATE INDEX IF NOT EXISTS processing_jobs_expiry_idx ON processing_jobs (expires_at);
