CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER','ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX ux_users_email ON users (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('GOOGLE','GITHUB')),
  provider_user_id VARCHAR(255) NOT NULL,
  provider_username VARCHAR(255),
  provider_email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  UNIQUE (provider, provider_user_id),
  UNIQUE (user_id, provider)
);
CREATE INDEX ix_identities_user ON user_identities (user_id);

CREATE TABLE research_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(250) NOT NULL,
  prompt TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PLANNING','READY','RUNNING','COMPLETED','FAILED','CANCELLED')),
  execution_mode VARCHAR(20) NOT NULL DEFAULT 'STANDARD'
    CHECK (execution_mode IN ('STANDARD','DEEP_RESEARCH')),
  plan JSONB,
  failure_reason TEXT,
  token_budget INTEGER CHECK (token_budget > 0),
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost_budget_usd NUMERIC(10,4),
  cost_used_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  version BIGINT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_tasks_user ON research_tasks (user_id, created_at DESC);
CREATE INDEX ix_tasks_status ON research_tasks (status, created_at);
