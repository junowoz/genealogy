-- Memories AI Ingestor: baseline SQL schema (PostgreSQL dialect)

-- Uploads table: tracks raw files received (images/PDFs)
CREATE TABLE IF NOT EXISTS memories_uploads (
  id UUID PRIMARY KEY,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  sha256 TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- e.g., s3://bucket/key or local path
  uploader_id TEXT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_memories_uploads_sha256 ON memories_uploads(sha256);

-- Jobs table: ingestion tasks for OCR/NER and suggestions
CREATE TABLE IF NOT EXISTS memories_jobs (
  id UUID PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES memories_uploads(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued','processing','completed','failed')),
  error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_memories_jobs_upload ON memories_jobs(upload_id);
CREATE INDEX IF NOT EXISTS idx_memories_jobs_status ON memories_jobs(status);

-- Entities table: flattened NER entities with optional normalization
CREATE TABLE IF NOT EXISTS memories_entities (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES memories_jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('PERSON_NAME','DATE','PLACE','OTHER')),
  text TEXT NOT NULL,
  confidence REAL NOT NULL,
  page INTEGER NOT NULL,
  span_start INTEGER NULL,
  span_end INTEGER NULL,
  bbox_x REAL NULL,
  bbox_y REAL NULL,
  bbox_w REAL NULL,
  bbox_h REAL NULL,
  normalized_name TEXT NULL,
  date_from TEXT NULL,
  date_to TEXT NULL,
  place_id TEXT NULL,
  place_text TEXT NULL
);
CREATE INDEX IF NOT EXISTS idx_memories_entities_job ON memories_entities(job_id);
CREATE INDEX IF NOT EXISTS idx_memories_entities_type ON memories_entities(type);

-- Suggestions: candidate tree people derived from entities
CREATE TABLE IF NOT EXISTS memories_suggestions (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES memories_jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score REAL NOT NULL,
  explanations JSONB NOT NULL,
  fs_person_id TEXT NULL,
  fs_url TEXT NULL
);
CREATE INDEX IF NOT EXISTS idx_memories_suggestions_job ON memories_suggestions(job_id);
CREATE INDEX IF NOT EXISTS idx_memories_suggestions_score ON memories_suggestions(job_id, score DESC);

-- Citation drafts: suggested source citation to be attached at FS (via redirect)
CREATE TABLE IF NOT EXISTS memories_citations (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES memories_jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  note TEXT NULL,
  url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_memories_citations_job ON memories_citations(job_id);

