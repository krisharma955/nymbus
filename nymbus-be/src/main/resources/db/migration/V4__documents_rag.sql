CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  research_task_id UUID NOT NULL REFERENCES research_tasks(id),
  file_name VARCHAR(255) NOT NULL,
  object_key TEXT NOT NULL,
  content_type VARCHAR(150) NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes >= 0),
  checksum_sha256 VARCHAR(64),
  processing_status VARCHAR(20) NOT NULL DEFAULT 'UPLOADED'
    CHECK (processing_status IN ('UPLOADED','PROCESSING','READY','FAILED')),
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX ix_docs ON documents (user_id, research_task_id, processing_status);

CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  page_number INTEGER,
  token_count INTEGER,
  embedding VECTOR(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);
CREATE INDEX ix_doc_chunks_doc ON document_chunks (document_id);

-- Let sources and citations point at uploaded documents
ALTER TABLE sources ADD COLUMN document_id UUID REFERENCES documents(id);
ALTER TABLE evidence_sources ADD COLUMN document_chunk_id UUID REFERENCES document_chunks(id);
