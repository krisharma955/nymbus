CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_task_id UUID NOT NULL REFERENCES research_tasks(id),
  url TEXT,
  canonical_url_hash VARCHAR(64),
  title TEXT,
  domain VARCHAR(255),
  source_type VARCHAR(30) NOT NULL DEFAULT 'OTHER' CHECK (source_type IN
    ('GOVERNMENT','RESEARCH_PAPER','NEWS','WEBSITE','INDUSTRY_REPORT','USER_DOCUMENT','DATASET','OTHER')),
  publisher VARCHAR(255),
  published_at DATE,
  cleaned_text TEXT,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_metadata JSONB
);
CREATE UNIQUE INDEX ux_sources_url ON sources (research_task_id, canonical_url_hash)
  WHERE canonical_url_hash IS NOT NULL;
CREATE INDEX ix_sources_task ON sources (research_task_id);

CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_task_id UUID NOT NULL REFERENCES research_tasks(id),
  created_by_execution_id UUID NOT NULL REFERENCES agent_executions(id),
  claim TEXT NOT NULL,
  supporting_passage TEXT,
  claim_type VARCHAR(60),
  verification_status VARCHAR(20) NOT NULL DEFAULT 'NOT_VERIFIED'
    CHECK (verification_status IN ('NOT_VERIFIED','VERIFIED','REJECTED','INCONCLUSIVE')),
  confidence_score NUMERIC(4,3) CHECK (confidence_score BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_evidence_task ON evidence (research_task_id, verification_status);
CREATE INDEX ix_evidence_exec ON evidence (created_by_execution_id);

CREATE TABLE evidence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES evidence(id),
  source_id UUID NOT NULL REFERENCES sources(id),
  source_locator TEXT,
  support_type VARCHAR(20) NOT NULL CHECK (support_type IN ('SUPPORTS','CONTRADICTS','CONTEXTUALIZES')),
  relevant_passage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evidence_id, source_id, support_type)
);
CREATE INDEX ix_es_source ON evidence_sources (source_id);

CREATE TABLE verification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES evidence(id),
  agent_execution_id UUID NOT NULL REFERENCES agent_executions(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('VERIFIED','REJECTED','INCONCLUSIVE')),
  explanation TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);
CREATE INDEX ix_vr_evidence ON verification_results (evidence_id, checked_at DESC);

CREATE TABLE workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_task_id UUID NOT NULL REFERENCES research_tasks(id),
  sub_task_id UUID REFERENCES sub_tasks(id),
  agent_execution_id UUID REFERENCES agent_executions(id),
  event_type VARCHAR(40) NOT NULL,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_events_task ON workflow_events (research_task_id, created_at);
CREATE INDEX ix_events_exec ON workflow_events (agent_execution_id, created_at);

CREATE TABLE agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_task_id UUID NOT NULL REFERENCES research_tasks(id),
  sender_execution_id UUID NOT NULL REFERENCES agent_executions(id),
  receiver_execution_id UUID REFERENCES agent_executions(id),
  message_type VARCHAR(30) NOT NULL CHECK (message_type IN
    ('TASK_ASSIGNMENT','FINDING','VERIFICATION_REQUEST','VERIFICATION_RESULT','FEEDBACK','HANDOFF')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_msg_task ON agent_messages (research_task_id, created_at);

CREATE TABLE tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_execution_id UUID NOT NULL REFERENCES agent_executions(id),
  tool_name VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('STARTED','SUCCEEDED','FAILED')),
  input_summary JSONB,
  output_summary JSONB,
  error_message TEXT,
  duration_ms BIGINT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX ix_tools_exec ON tool_executions (agent_execution_id, started_at);
