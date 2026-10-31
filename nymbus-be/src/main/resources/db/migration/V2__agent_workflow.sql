CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(60) NOT NULL UNIQUE
    CHECK (code IN ('ORCHESTRATOR','RESEARCH','VERIFICATION','ANALYSIS','REPORT')),
  display_name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  system_prompt TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  configuration JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sub_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_task_id UUID NOT NULL REFERENCES research_tasks(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  title VARCHAR(250) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','BLOCKED','READY','ASSIGNED','IN_PROGRESS','COMPLETED','FAILED','CANCELLED')),
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  input_payload JSONB,
  result_summary TEXT,
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_subtasks_task_status ON sub_tasks (research_task_id, status);
CREATE INDEX ix_subtasks_agent ON sub_tasks (agent_id);

CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_task_id UUID NOT NULL REFERENCES sub_tasks(id),
  depends_on_sub_task_id UUID NOT NULL REFERENCES sub_tasks(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sub_task_id, depends_on_sub_task_id),
  CHECK (sub_task_id <> depends_on_sub_task_id)
);

CREATE TABLE agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_task_id UUID NOT NULL REFERENCES research_tasks(id),
  sub_task_id UUID REFERENCES sub_tasks(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number >= 1),
  status VARCHAR(20) NOT NULL DEFAULT 'RUNNING'
    CHECK (status IN ('RUNNING','SUCCEEDED','FAILED','TIMED_OUT','CANCELLED')),
  input_payload JSONB,
  output_payload JSONB,
  error_code VARCHAR(80),
  error_message TEXT,
  model_name VARCHAR(120),
  prompt_version VARCHAR(80),
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(10,6),
  execution_time_ms BIGINT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX ux_exec_attempt ON agent_executions (sub_task_id, attempt_number)
  WHERE sub_task_id IS NOT NULL;
CREATE INDEX ix_exec_task ON agent_executions (research_task_id, started_at);
CREATE INDEX ix_exec_status ON agent_executions (status, started_at);

CREATE TABLE research_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_task_id UUID NOT NULL REFERENCES research_tasks(id),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  title VARCHAR(250) NOT NULL,
  executive_summary TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'GENERATING'
    CHECK (status IN ('GENERATING','COMPLETED','FAILED')),
  content_markdown TEXT,
  generated_by_execution_id UUID REFERENCES agent_executions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (research_task_id, version)
);

-- Seed the five agent definitions
INSERT INTO agents (code, display_name, description, configuration) VALUES
 ('ORCHESTRATOR','Orchestrator','Plans work, creates subtasks, controls retries', '{"model": "openai/gpt-4o-mini", "temperature": 0.2}'::jsonb),
 ('RESEARCH','Researcher','Searches sources and extracts atomic claims', '{"model": "openai/gpt-4o-mini", "temperature": 0.3}'::jsonb),
 ('VERIFICATION','Verifier','Checks claims against source passages', '{"model": "openai/gpt-4o-mini", "temperature": 0.1}'::jsonb),
 ('ANALYSIS','Analyst','Synthesizes verified findings and calculations', '{"model": "openai/gpt-4o-mini", "temperature": 0.3}'::jsonb),
 ('REPORT','Reporter','Builds the cited report', '{"model": "openai/gpt-4o-mini", "temperature": 0.4}'::jsonb);
