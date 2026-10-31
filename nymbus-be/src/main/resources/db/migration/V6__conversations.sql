-- V6: Conversational Research Platform Schema Extensions

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(250) NOT NULL,
  summary TEXT,
  summary_updated_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_conversations_user_last_msg ON conversations (user_id, last_message_at DESC);

-- Extend research_tasks with conversation tracking
ALTER TABLE research_tasks ADD COLUMN conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;
ALTER TABLE research_tasks ADD COLUMN parent_task_id UUID REFERENCES research_tasks(id) ON DELETE SET NULL;
ALTER TABLE research_tasks ADD COLUMN turn_index INTEGER NOT NULL DEFAULT 0;
CREATE INDEX ix_tasks_conversation_active ON research_tasks (conversation_id, status) WHERE conversation_id IS NOT NULL;

-- Messages within conversations
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('USER', 'ASSISTANT', 'SYSTEM')),
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'PENDING', 'RESEARCHING', 'FAILED')),
  research_task_id UUID REFERENCES research_tasks(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_conversation_messages_conv_created ON conversation_messages (conversation_id, created_at ASC);

-- Extend documents for conversation-level attachment and library uploads
ALTER TABLE documents ALTER COLUMN research_task_id DROP NOT NULL;
ALTER TABLE documents ADD COLUMN conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN message_id UUID REFERENCES conversation_messages(id) ON DELETE SET NULL;

CREATE INDEX ix_docs_conversation_status ON documents (conversation_id, processing_status) WHERE conversation_id IS NOT NULL;
CREATE UNIQUE INDEX ux_docs_conversation_checksum ON documents (conversation_id, checksum_sha256)
  WHERE conversation_id IS NOT NULL AND checksum_sha256 IS NOT NULL;

-- Exact document associations for research tasks
CREATE TABLE research_task_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_task_id UUID NOT NULL REFERENCES research_tasks(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (research_task_id, document_id)
);
CREATE INDEX ix_task_docs_doc ON research_task_documents (document_id);
