# Audit Note — AIAgentMemoryStore

## Stack
- Node + Express backend (port 4059) + Create-React-App frontend (port 4058) + PostgreSQL + OpenRouter (via `backend/services/ai.js`); JWT auth, helmet, multer uploads, generic CRUD factory.

## Current inventory
- Routes mounted: `/api/health`, `/api/auth` (login, me, users), `/api/memories` (CRUD + bulk-import + attachments via factory), `/api/subjects` (factory), `/api/projections` (factory), `/api/extractors` (factory), `/api/retention-policies` (factory), `/api/memories` time-travel override (`memoryExtras` — `as_of=...` + `/api/subjects/:name/memories`), `/api/notifications` (list, unread, create, mark-read, mark-all-read), `/api/attachments` (list, upload, download, delete), `/api/webhooks` (CRUD + deliveries + test), `/api/dashboard`, `/api/custom-views` (memory-export, memory-graph, retrieval-quality, namespaces CRUD), `/api/ai/*`. ~72 HTTP routes total once factory expansions (7 per entity × 5 entities) are counted.
- AI endpoints: 7 LLM-backed routes in `backend/routes/ai.js` — `POST /api/ai/insert-memory`, `POST /api/ai/recall`, `POST /api/ai/time-travel`, `POST /api/ai/contradiction-detect`, `POST /api/ai/summary-rollup`, `POST /api/ai/extractor-tuner`, `POST /api/ai/embedding-quality`; plus `GET /api/ai/samples` and `GET /api/ai/history` helpers. All persist to `ai_results` table.
- Frontend pages: `/login`, `/` (Dashboard), `/memories`, `/subjects`, `/projections`, `/extractors`, `/retention-policies`, `/ai/insert-memory`, `/ai/recall`, `/ai/time-travel`, `/ai/contradiction-detect`, `/ai/summary-rollup`, `/ai/extractor-tuner`, `/ai/embedding-quality`, `/wb/subject-browser`, `/wb/time-slider`, `/custom-views`, `/codex/custom-viz`, `/codex/operations`.

## Audit recommendations

### Missing AI counterparts
- `POST /api/ai/embed-generate` — actual embedding-vector synthesis for a memory (currently only "embedding-quality" critique exists; no generation endpoint).
- `POST /api/ai/semantic-search` — relevance-ranked retrieval distinct from `/recall` (recall returns synthesized answer; missing pure ranked-hits search with score normalization).
- `POST /api/ai/relevance-score` — score a memory's relevance to a query/agent/task for re-ranking and pruning.
- `POST /api/ai/conflict-resolve` — given a contradiction pair, propose a canonical resolved fact + provenance (today's `/contradiction-detect` detects but does not resolve).
- `POST /api/ai/decay-policy-recommend` — recommend per-namespace forgetting/decay curves given access patterns.
- `POST /api/ai/memory-consolidate` — summarize+merge N old memories into one canonical episodic block (consolidation worker output).
- `POST /api/ai/rag-chat` — retrieval-augmented chat turn (query → top-k recall → grounded answer with citations).
- `POST /api/ai/importance-score` — score a fresh memory's importance / pin-worthiness before storage.
- `POST /api/ai/pii-redact` — scrub PII from `event_text` before embedding/storage.
- `POST /api/ai/memory-graph-extract` — extract entities + relations from a memory to populate a knowledge graph layer.

### Missing non-AI features
- Real vector column on `memories` (e.g., `pgvector`) + ANN index; current schema has only `embedded_at` timestamp, no vector.
- Namespace / agent / scope column on `memories` (multi-tenant agent isolation). `customViews` exposes namespace endpoints but in-memory only, not joined to memory rows.
- Access-control list per memory / per namespace (row-level read/write grants beyond global `requireWriter`).
- Audit log of every read/write/recall (who-asked-what, retention compliance).
- TTL / expiry enforcement worker that consumes `retention_policies` rows.
- Memory provenance (source agent, source conversation, parent memory id, supersedes id).
- Bulk export beyond CSV (JSONL with embeddings, NDJSON streaming for large stores).
- Background job runner (consolidation, decay, re-embedding on model change).
- Rate limiting on `/api/ai/*` and per-agent quota tracking.
- API-key auth for agents (currently only human JWT login).

### Custom feature suggestions
- Consolidation worker: nightly job that picks low-importance / aging clusters and calls `/api/ai/memory-consolidate`.
- Memory graph view (entities + relations) layered on top of `customViews/memory-graph`.
- Cross-agent memory sharing with explicit grant + read-receipts.
- Eval harness: golden set of (query → expected_memory_id) pairs scored against `/recall` after every embedding or prompt change.
- Drift monitor: alert when `embedding-quality` scores trend down or contradictions spike.
- Pin / promote UI: mark high-value memories immune from decay.
- "Replay" mode: stream a subject's memories in temporal order for offline agent fine-tuning.
- Cost dashboard: token spend per AI feature pulled from `ai_results` JSON.

## Implemented in this pass
None — audit-only.

## Backlog (prioritized)

### Mechanical
- `POST /api/ai/conflict-resolve` (LLM, < 50 lines, reuses `runFeature` pattern).
- `POST /api/ai/relevance-score` (LLM).
- `POST /api/ai/importance-score` (LLM).
- `POST /api/ai/memory-consolidate` (LLM).
- `POST /api/ai/rag-chat` (LLM; composes existing `/recall`).
- `POST /api/ai/pii-redact` (LLM).
- `POST /api/ai/memory-graph-extract` (LLM).
- `POST /api/ai/decay-policy-recommend` (LLM).
- `POST /api/ai/semantic-search` (LLM stand-in until real vectors land).

### Needs creds
- Real embeddings provider (OpenAI / Voyage / Cohere embed API key) for `POST /api/ai/embed-generate` and pgvector population.
- External vector DB integration (Pinecone / Weaviate / Qdrant) if Postgres+pgvector is rejected.

### Needs product decision
- Multi-tenancy model: namespace as soft column vs hard schema-per-agent vs row-level security.
- Retention enforcement semantics: hard-delete vs tombstone vs summarize-then-delete.
- Cross-agent sharing rules and audit visibility.
- API-key vs JWT auth for agent callers; quota model.
- Whether to ship a built-in RAG chat surface or expose only retrieval primitives.

### Needs schema
- Add `vector` column + ANN index to `memories` (pgvector extension).
- Add `namespace`, `agent_id`, `importance`, `pinned`, `superseded_by`, `source_memory_id`, `decay_at` columns to `memories`.
- Add `memory_reads` audit table (memory_id, reader, query, ts).
- Add `memory_relations` table for graph layer (subject_a, relation, subject_b, memory_id).
- Add `agent_api_keys` table.

### Too risky
- Auto-delete via retention worker without dry-run + restore window (data loss risk).
- Auto-merging contradictory memories without human review (truth-drift risk).
- Cross-agent memory sharing flipped on by default (privacy / leakage risk).

## Categorization
- MECHANICAL: 9 items
- NEEDS-CREDS: 2 items
- NEEDS-PRODUCT-DECISION: 5 items
- TOO-RISKY: 3 items

## Apply pass 7 (full backlog implementation)

### What landed
- **New AI routes (12)** appended to `backend/routes/ai.js`, each calling the existing `runFeature(slug, SCHEMAS[slug], body)` helper and persisting via `record(...)` into `ai_results`:
  - MECHANICAL (9): `POST /api/ai/conflict-resolve` (advisory), `relevance-score`, `importance-score`, `memory-consolidate`, `rag-chat`, `pii-redact`, `memory-graph-extract`, `decay-policy-recommend` (advisory), `semantic-search`.
  - TOO-RISKY → advisory-only (3): `cross-agent-share-advisor`, `retention-dry-run`, `auto-merge-advisor`. Each response is force-stamped with `disclaimer` + `requires_human_review: true` by the `mountFeature(..., {advisory:true})` wrapper.
  - NEEDS-CREDS stubs (2): `POST /api/ai/embed-generate` and `POST /api/ai/vector-db-sync` return 503 with `needs_creds[]` listing the env vars required (no real call, no fake vectors).
  - Schema strings and 3 hand-curated sample fills are wired into the existing `/api/ai/samples` + `/api/ai/history` machinery so each new feature gets the same "Sample Fill" pills and per-feature history modal.

- **New non-AI route file** `backend/routes/pass7.js` (mounted at `/api/pass7` in `server.js` between custom-views and `app.listen`):
  - Audit log: `GET/POST /memory-reads`, `GET /memory-reads/summary`.
  - Provenance: `GET/PUT /memories/:id/provenance`.
  - Pin: `POST /memories/:id/pin`, `POST /memories/:id/unpin`, `GET /memories/pinned/list`.
  - Metadata: `PUT /memories/:id/importance`, `PUT /memories/:id/decay-at`, `PUT /memories/:id/namespace`, `GET /memories-by-namespace`.
  - Retention (advisory): `GET /retention/dry-run`, `POST /retention/tombstone`, `POST /retention/restore`. Hard delete intentionally NOT exposed — only soft-tombstone + restore, with `disclaimer` + `requires_human_review`.
  - Knowledge graph: `GET/POST/DELETE /relations`, `GET /relations/graph` (react-flow shaped).
  - Agent API keys: `GET/POST /api-keys`, `POST /api-keys/:id/revoke`. Plaintext key returned ONCE at issue time; storage is sha256.
  - ACL: `GET/POST/DELETE /acl` for memory- or namespace-scoped read/write grants.
  - Rate limits: `GET /rate-limits`, `POST /rate-limits/probe` (per-caller minute buckets).
  - Eval harness: `GET/POST/PUT/DELETE /eval-pairs`, `POST /eval-pairs/run`, `GET /eval-runs`, `GET /eval-runs/:id`.
  - Drift monitor: `GET /drift`, `POST /drift/sample` (synthesises signals from latest `ai_results` rows).
  - Cost dashboard: `GET /cost` (aggregates token counts from `ai_results.output`).
  - Replay mode: `GET /replay/:subject`.
  - Bulk export: `GET /export/jsonl`, `GET /export/ndjson-stream`.
  - Background jobs: `GET/POST /jobs`, `POST /jobs/:id/run` (advisory-only output for decay_sweep, consolidation, reembedding).
  - Consolidation preview + cross-agent share preview: both advisory.
  - `GET /_index` listing all pass7 routes for debugging.

- **One new migration** `backend/migrations/002_pass7.sql` (idempotent — `ADD COLUMN IF NOT EXISTS` + `CREATE TABLE IF NOT EXISTS`):
  - `memories` gains: `namespace`, `agent_id`, `importance`, `pinned`, `superseded_by`, `source_memory_id`, `source_agent`, `source_conversation`, `decay_at`, `tombstoned_at`, `tombstoned_reason` + indexes.
  - New tables: `memory_reads`, `memory_relations`, `agent_api_keys`, `rate_limit_buckets`, `eval_pairs`, `eval_runs`, `memory_acl`, `background_jobs`, `drift_signals` (9 new tables).
  - The existing seed runner (`backend/seed/seed.js`) loops every `*.sql` in `migrations/` sorted by filename, so this is picked up automatically on next startup.

- **Frontend additions:**
  - 12 new AI pages under `frontend/src/pages/AI*.js`, each ~12 lines wrapping the existing `AIPage` component with the right `feature` slug and inputs. Advisory ones explicitly state in their subtitle that output requires human review.
  - 11 new ops pages: `AuditLogPage`, `PinnedMemoriesPage`, `RetentionDryRunPage`, `EvalHarnessPage`, `DriftMonitorPage`, `CostDashboardPage`, `ReplayModePage`, `BackgroundJobsPage`, `KnowledgeGraphPage`, `AgentApiKeysPage`, `AclPage`. Each uses only existing CSS classes (`card`, `data-table`, `form-grid`, `page-header`).
  - `services/api.js` gains `pass7.*` namespace + 13 new `ai*` function exports.
  - `App.js` registers 23 new `<Route>` entries.
  - `Sidebar.js` adds 12 new AI links and a new "Operations" group with 11 links.

### Mapped to backlog categories
- **MECHANICAL (9/9):** all wired as real LLM endpoints with persisted history and sample fills.
- **NEEDS-CREDS (skipped per instructions):** `embed-generate` + `vector-db-sync` left as 503 stubs that explicitly enumerate the missing env vars. No fake vector generation.
- **NEEDS-PRODUCT-DECISION (5/5) — defaults committed, callouts in code:**
  - Multi-tenancy → namespace as a soft column on `memories` (no schema-per-agent, no RLS). Default `'default'`.
  - Retention → tombstone-then-restore, never hard-delete. Tombstoned rows have `tombstoned_at` and `tombstoned_reason`; pinned rows are skipped.
  - Cross-agent sharing → OFF by default. `/cross-agent-share/preview` returns candidates + privacy risks, never grants. ACL grants require an explicit `POST /acl` call.
  - Auth → JWT remains primary; `agent_api_keys` table + CRUD added as scaffolding (issuance + revoke), key validation middleware deferred to a follow-up pass.
  - RAG chat surface → exposed both as `/api/ai/rag-chat` and as a dedicated `/ai/rag-chat` page; retrieval primitives (`/recall`, `/semantic-search`) remain available standalone.
- **NEEDS-SCHEMA (5/5):** addressed by migration `002_pass7.sql`. The `pgvector` column itself is NOT installed (would require the extension on the DB host — flagged as a future credentialed step in the embed-generate 503).
- **TOO-RISKY (3/3) — advisory only:** `conflict-resolve`, `decay-policy-recommend`, `cross-agent-share-advisor`, `retention-dry-run`, `auto-merge-advisor` all return `disclaimer` + `requires_human_review: true`. `/retention/tombstone` is soft-delete with restore. No autonomous mutation paths land.

### Validation
- `node --check backend/server.js` → PASS
- `node --check backend/routes/ai.js` → PASS
- `node --check backend/routes/pass7.js` → PASS
- `node --check` on every new `frontend/src/pages/*.js`, `frontend/src/services/api.js`, `frontend/src/components/Sidebar.js`, `frontend/src/App.js` → PASS
- No new npm dependencies added (frontend + backend `package.json` unchanged).
- No existing endpoints changed — all additions are new mount points under `/api/ai/*` (new slugs) or `/api/pass7/*`. The `memoryExtras` `as_of=...` override remains intact and continues to win over the CRUD factory's `GET /api/memories`.

### Counts
- Backend endpoints added: 14 under `/api/ai` (12 LLM + 2 503-creds) + 46 under `/api/pass7` = **60** new HTTP routes.
- Frontend pages added: 12 AI + 11 ops = **23** new pages.
- New tables: **9** (`memory_reads`, `memory_relations`, `agent_api_keys`, `rate_limit_buckets`, `eval_pairs`, `eval_runs`, `memory_acl`, `background_jobs`, `drift_signals`); plus 11 columns added to `memories`.
- Items skipped: `embed-generate` + `vector-db-sync` left as 503 NEEDS-CREDS stubs (per task constraints). pgvector extension not installed.
- TOO-RISKY items shipped as advisory-only: 3 (auto-delete, auto-merge contradictions, cross-agent sharing) — all with `disclaimer` + `requires_human_review: true` and no autonomous-mutation paths.
