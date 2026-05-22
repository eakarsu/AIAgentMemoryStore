-- Pass 7: full-backlog schema additions for AIAgentMemoryStore
-- All statements are idempotent: tables use CREATE TABLE IF NOT EXISTS,
-- column adds use ADD COLUMN IF NOT EXISTS so the migration can be re-run.

-- ─── memory provenance + multi-tenancy + decay/pin metadata ────────────────
ALTER TABLE memories ADD COLUMN IF NOT EXISTS namespace VARCHAR(120) DEFAULT 'default';
ALTER TABLE memories ADD COLUMN IF NOT EXISTS agent_id VARCHAR(120);
ALTER TABLE memories ADD COLUMN IF NOT EXISTS importance NUMERIC(4,3) DEFAULT 0.500;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS superseded_by INTEGER;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS source_memory_id INTEGER;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS source_agent VARCHAR(120);
ALTER TABLE memories ADD COLUMN IF NOT EXISTS source_conversation VARCHAR(120);
ALTER TABLE memories ADD COLUMN IF NOT EXISTS decay_at TIMESTAMPTZ;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS tombstoned_at TIMESTAMPTZ;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS tombstoned_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_memories_namespace ON memories (namespace);
CREATE INDEX IF NOT EXISTS idx_memories_pinned ON memories (pinned) WHERE pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_memories_decay_at ON memories (decay_at);
CREATE INDEX IF NOT EXISTS idx_memories_tombstoned ON memories (tombstoned_at);

-- ─── audit log of reads / recalls ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_reads (
  id SERIAL PRIMARY KEY,
  memory_id INTEGER,
  reader VARCHAR(150),
  agent_id VARCHAR(120),
  query TEXT,
  context VARCHAR(120),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_memory_reads_memory ON memory_reads (memory_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_reads_reader ON memory_reads (reader, created_at DESC);

-- ─── knowledge-graph layer (entities + relations) ──────────────────────────
CREATE TABLE IF NOT EXISTS memory_relations (
  id SERIAL PRIMARY KEY,
  subject_a VARCHAR(255),
  relation VARCHAR(120),
  subject_b VARCHAR(255),
  memory_id INTEGER,
  confidence NUMERIC(4,3) DEFAULT 0.500,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_memory_relations_a ON memory_relations (subject_a);
CREATE INDEX IF NOT EXISTS idx_memory_relations_b ON memory_relations (subject_b);

-- ─── agent API keys (auth alternative to JWT for machine callers) ──────────
CREATE TABLE IF NOT EXISTS agent_api_keys (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(120) NOT NULL,
  name VARCHAR(150),
  key_prefix VARCHAR(20),
  key_hash VARCHAR(128),
  scopes VARCHAR(255),
  active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_prefix ON agent_api_keys (key_prefix);

-- ─── per-agent rate-limit counters (rolling minute buckets) ────────────────
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  id SERIAL PRIMARY KEY,
  caller VARCHAR(150),
  bucket VARCHAR(80),
  window_start TIMESTAMPTZ,
  count INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_caller_bucket ON rate_limit_buckets (caller, bucket, window_start DESC);

-- ─── eval harness: golden (query → expected_memory_id) pairs ───────────────
CREATE TABLE IF NOT EXISTS eval_pairs (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  expected_memory_id INTEGER,
  expected_subject VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eval_runs (
  id SERIAL PRIMARY KEY,
  run_label VARCHAR(150),
  passed INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── access control list (per memory / per namespace grants) ───────────────
CREATE TABLE IF NOT EXISTS memory_acl (
  id SERIAL PRIMARY KEY,
  scope VARCHAR(20),                -- 'memory' | 'namespace'
  scope_ref VARCHAR(255),           -- memory_id or namespace name
  grantee VARCHAR(150),             -- user email or agent_id
  permission VARCHAR(20),           -- 'read' | 'write'
  granted_by VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_memory_acl_scope ON memory_acl (scope, scope_ref);
CREATE INDEX IF NOT EXISTS idx_memory_acl_grantee ON memory_acl (grantee);

-- ─── background jobs (consolidation, decay sweep, re-embedding) ────────────
CREATE TABLE IF NOT EXISTS background_jobs (
  id SERIAL PRIMARY KEY,
  job_type VARCHAR(80),
  status VARCHAR(20) DEFAULT 'pending',
  payload JSONB,
  result JSONB,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON background_jobs (status, created_at DESC);

-- ─── drift monitor history ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drift_signals (
  id SERIAL PRIMARY KEY,
  signal_type VARCHAR(80),
  score NUMERIC(6,4),
  threshold NUMERIC(6,4),
  triggered BOOLEAN DEFAULT FALSE,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
