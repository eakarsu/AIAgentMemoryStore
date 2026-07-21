ALTER TABLE users ALTER COLUMN password TYPE VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_memory_users_tenant ON users (tenant_id, email);

CREATE TABLE IF NOT EXISTS tenant_memories (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  namespace VARCHAR(120) NOT NULL DEFAULT 'default',
  subject VARCHAR(255) NOT NULL,
  source VARCHAR(120) NOT NULL,
  source_event_id VARCHAR(160) NOT NULL,
  encrypted_payload JSONB,
  content_hash CHAR(64) NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  state VARCHAR(24) NOT NULL DEFAULT 'active' CHECK (state IN ('active','quarantined','tombstoned','superseded')),
  injection_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (tenant_id, source, source_event_id)
);
CREATE INDEX IF NOT EXISTS idx_tenant_memories_scope ON tenant_memories (tenant_id, namespace, subject, state, created_at DESC);

CREATE TABLE IF NOT EXISTS memory_lifecycle_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  memory_id BIGINT NOT NULL REFERENCES tenant_memories(id),
  actor_id INTEGER,
  action VARCHAR(80) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_memory_events_tenant ON memory_lifecycle_events (tenant_id, memory_id, created_at DESC);
CREATE OR REPLACE FUNCTION prevent_memory_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'memory lifecycle events are immutable'; END $$;
DROP TRIGGER IF EXISTS memory_events_immutable ON memory_lifecycle_events;
CREATE TRIGGER memory_events_immutable BEFORE UPDATE OR DELETE ON memory_lifecycle_events FOR EACH ROW EXECUTE FUNCTION prevent_memory_event_mutation();

CREATE TABLE IF NOT EXISTS memory_eval_runs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  label VARCHAR(160) NOT NULL,
  query_count INTEGER NOT NULL,
  hit_count INTEGER NOT NULL,
  contamination_count INTEGER NOT NULL,
  latency_ms NUMERIC(12,3),
  metrics JSONB NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
