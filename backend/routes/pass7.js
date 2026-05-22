// routes/pass7.js — full-backlog non-AI endpoints introduced in pass 7.
// Covers audit log, provenance, pin/promote, replay, drift, cost, eval harness,
// background jobs, ACL, API-key auth scaffolding, knowledge-graph relations,
// rate-limit status, bulk JSONL/NDJSON export, namespace assignment,
// retention TTL preview, and advisory-only autonomy surfaces.
const express = require('express');
const crypto = require('crypto');
const pool = require('../config/database');
const { requireWriter } = require('../middleware/auth');

const router = express.Router();

// ─── helpers ────────────────────────────────────────────────────────────────
function reader(req) {
  return req.user?.email || req.user?.sub || req.headers['x-agent-id'] || 'unknown';
}
function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
function ok(res, body) { res.json(body); }
function fail(res, code, msg) { res.status(code).json({ error: msg }); }

// ─── memory_reads audit log ────────────────────────────────────────────────
router.post('/memory-reads', async (req, res) => {
  try {
    const { memory_id, query, context, agent_id } = req.body || {};
    const r = await pool.query(
      `INSERT INTO memory_reads (memory_id, reader, agent_id, query, context)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [memory_id || null, reader(req), agent_id || null, query || null, context || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});

router.get('/memory-reads', async (req, res) => {
  try {
    const limit = Math.min(500, asInt(req.query.limit, 100));
    const memoryId = req.query.memory_id;
    const r = memoryId
      ? await pool.query('SELECT * FROM memory_reads WHERE memory_id=$1 ORDER BY id DESC LIMIT $2', [memoryId, limit])
      : await pool.query('SELECT * FROM memory_reads ORDER BY id DESC LIMIT $1', [limit]);
    res.json(r.rows);
  } catch (e) { fail(res, 500, e.message); }
});

router.get('/memory-reads/summary', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT COALESCE(reader,'unknown') AS reader, COUNT(*)::int AS reads,
             MAX(created_at) AS last_read
      FROM memory_reads GROUP BY reader ORDER BY reads DESC LIMIT 50`);
    res.json(r.rows);
  } catch (e) { fail(res, 500, e.message); }
});

// ─── provenance (parent / supersedes / source chain) ───────────────────────
router.get('/memories/:id/provenance', async (req, res) => {
  try {
    const id = asInt(req.params.id, -1);
    const r = await pool.query('SELECT * FROM memories WHERE id=$1', [id]);
    if (!r.rows.length) return fail(res, 404, 'not found');
    const m = r.rows[0];
    const ancestors = [];
    let cursor = m.source_memory_id;
    let guard = 0;
    while (cursor && guard < 30) {
      const q = await pool.query('SELECT id, subject, event_text, source_memory_id FROM memories WHERE id=$1', [cursor]);
      if (!q.rows.length) break;
      ancestors.push(q.rows[0]);
      cursor = q.rows[0].source_memory_id;
      guard += 1;
    }
    const supersededBy = m.superseded_by
      ? (await pool.query('SELECT id, subject FROM memories WHERE id=$1', [m.superseded_by])).rows[0] || null
      : null;
    res.json({ memory: m, ancestors, superseded_by: supersededBy });
  } catch (e) { fail(res, 500, e.message); }
});

router.put('/memories/:id/provenance', requireWriter, async (req, res) => {
  try {
    const id = asInt(req.params.id, -1);
    const { source_memory_id, superseded_by, source_agent, source_conversation } = req.body || {};
    const r = await pool.query(
      `UPDATE memories
       SET source_memory_id=COALESCE($2, source_memory_id),
           superseded_by=COALESCE($3, superseded_by),
           source_agent=COALESCE($4, source_agent),
           source_conversation=COALESCE($5, source_conversation),
           updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [id, source_memory_id || null, superseded_by || null, source_agent || null, source_conversation || null]
    );
    if (!r.rows.length) return fail(res, 404, 'not found');
    res.json(r.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});

// ─── pin / promote ──────────────────────────────────────────────────────────
router.post('/memories/:id/pin', requireWriter, async (req, res) => {
  try {
    const id = asInt(req.params.id, -1);
    const r = await pool.query('UPDATE memories SET pinned=TRUE, updated_at=NOW() WHERE id=$1 RETURNING *', [id]);
    if (!r.rows.length) return fail(res, 404, 'not found');
    res.json(r.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});
router.post('/memories/:id/unpin', requireWriter, async (req, res) => {
  try {
    const id = asInt(req.params.id, -1);
    const r = await pool.query('UPDATE memories SET pinned=FALSE, updated_at=NOW() WHERE id=$1 RETURNING *', [id]);
    if (!r.rows.length) return fail(res, 404, 'not found');
    res.json(r.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});
router.get('/memories/pinned/list', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM memories WHERE pinned=TRUE ORDER BY id DESC LIMIT 200');
    res.json(r.rows);
  } catch (e) { fail(res, 500, e.message); }
});

// ─── importance / decay metadata setters ────────────────────────────────────
router.put('/memories/:id/importance', requireWriter, async (req, res) => {
  try {
    const id = asInt(req.params.id, -1);
    const score = Math.max(0, Math.min(1, Number(req.body?.importance) || 0));
    const r = await pool.query('UPDATE memories SET importance=$2, updated_at=NOW() WHERE id=$1 RETURNING *', [id, score]);
    if (!r.rows.length) return fail(res, 404, 'not found');
    res.json(r.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});

router.put('/memories/:id/decay-at', requireWriter, async (req, res) => {
  try {
    const id = asInt(req.params.id, -1);
    const ts = req.body?.decay_at || null;
    const r = await pool.query('UPDATE memories SET decay_at=$2, updated_at=NOW() WHERE id=$1 RETURNING *', [id, ts]);
    if (!r.rows.length) return fail(res, 404, 'not found');
    res.json(r.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});

// ─── namespace assignment on memory rows ────────────────────────────────────
router.put('/memories/:id/namespace', requireWriter, async (req, res) => {
  try {
    const id = asInt(req.params.id, -1);
    const ns = String(req.body?.namespace || '').trim();
    if (!ns) return fail(res, 400, 'namespace required');
    const r = await pool.query('UPDATE memories SET namespace=$2, updated_at=NOW() WHERE id=$1 RETURNING *', [id, ns]);
    if (!r.rows.length) return fail(res, 404, 'not found');
    res.json(r.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});

router.get('/memories-by-namespace', async (req, res) => {
  try {
    const ns = String(req.query.namespace || 'default');
    const r = await pool.query('SELECT * FROM memories WHERE namespace=$1 ORDER BY id DESC LIMIT 500', [ns]);
    res.json({ namespace: ns, count: r.rows.length, memories: r.rows });
  } catch (e) { fail(res, 500, e.message); }
});

// ─── retention TTL preview (NEVER deletes — advisory only) ──────────────────
router.get('/retention/dry-run', async (req, res) => {
  try {
    const days = Math.max(1, asInt(req.query.days, 30));
    const ns = req.query.namespace ? String(req.query.namespace) : null;
    const sql = ns
      ? `SELECT id, subject, namespace, created_at, pinned
         FROM memories
         WHERE namespace=$2 AND pinned=FALSE AND tombstoned_at IS NULL
           AND created_at < NOW() - ($1 || ' days')::interval
         ORDER BY created_at ASC LIMIT 500`
      : `SELECT id, subject, namespace, created_at, pinned
         FROM memories
         WHERE pinned=FALSE AND tombstoned_at IS NULL
           AND created_at < NOW() - ($1 || ' days')::interval
         ORDER BY created_at ASC LIMIT 500`;
    const params = ns ? [String(days), ns] : [String(days)];
    const r = await pool.query(sql, params);
    res.json({
      days, namespace: ns || '(all)', projected_deletions: r.rows.length,
      candidates: r.rows,
      disclaimer: 'Dry-run only. No rows are tombstoned or deleted. Confirm via POST /api/pass7/retention/tombstone.',
      requires_human_review: true,
    });
  } catch (e) { fail(res, 500, e.message); }
});

// Tombstone (soft-delete) with restore window — advisory mark, never hard delete.
router.post('/retention/tombstone', requireWriter, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.memory_ids) ? req.body.memory_ids.map(Number).filter(Number.isFinite) : [];
    const reason = String(req.body?.reason || 'retention policy');
    if (!ids.length) return fail(res, 400, 'memory_ids[] required');
    const r = await pool.query(
      `UPDATE memories
       SET tombstoned_at=NOW(), tombstoned_reason=$2, updated_at=NOW()
       WHERE id = ANY($1::int[]) AND pinned=FALSE AND tombstoned_at IS NULL
       RETURNING id, subject, tombstoned_at`,
      [ids, reason]
    );
    res.json({
      tombstoned: r.rows,
      requested: ids.length,
      disclaimer: 'Soft-delete only. Restore via POST /api/pass7/retention/restore within window.',
      requires_human_review: true,
    });
  } catch (e) { fail(res, 500, e.message); }
});

router.post('/retention/restore', requireWriter, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.memory_ids) ? req.body.memory_ids.map(Number).filter(Number.isFinite) : [];
    if (!ids.length) return fail(res, 400, 'memory_ids[] required');
    const r = await pool.query(
      `UPDATE memories SET tombstoned_at=NULL, tombstoned_reason=NULL, updated_at=NOW()
       WHERE id = ANY($1::int[]) RETURNING id, subject`,
      [ids]
    );
    res.json({ restored: r.rows });
  } catch (e) { fail(res, 500, e.message); }
});

// ─── knowledge graph: relations table CRUD ─────────────────────────────────
router.get('/relations', async (req, res) => {
  try {
    const subject = req.query.subject;
    const r = subject
      ? await pool.query('SELECT * FROM memory_relations WHERE subject_a=$1 OR subject_b=$1 ORDER BY id DESC LIMIT 500', [subject])
      : await pool.query('SELECT * FROM memory_relations ORDER BY id DESC LIMIT 500');
    res.json(r.rows);
  } catch (e) { fail(res, 500, e.message); }
});
router.post('/relations', requireWriter, async (req, res) => {
  try {
    const { subject_a, relation, subject_b, memory_id, confidence } = req.body || {};
    if (!subject_a || !subject_b || !relation) return fail(res, 400, 'subject_a, relation, subject_b required');
    const r = await pool.query(
      `INSERT INTO memory_relations (subject_a, relation, subject_b, memory_id, confidence)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [subject_a, relation, subject_b, memory_id || null, Number(confidence) || 0.5]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});
router.delete('/relations/:id', requireWriter, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM memory_relations WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return fail(res, 404, 'not found');
    res.json({ ok: true, removed: r.rows[0].id });
  } catch (e) { fail(res, 500, e.message); }
});

router.get('/relations/graph', async (req, res) => {
  try {
    const limit = Math.min(200, asInt(req.query.limit, 80));
    const r = await pool.query('SELECT * FROM memory_relations ORDER BY id DESC LIMIT $1', [limit]);
    const subjects = new Map();
    r.rows.forEach((row) => {
      [row.subject_a, row.subject_b].forEach((s) => { if (s && !subjects.has(s)) subjects.set(s, subjects.size); });
    });
    const nodes = Array.from(subjects.entries()).map(([name, idx]) => {
      const col = idx % 6;
      const row2 = Math.floor(idx / 6);
      return {
        id: name,
        position: { x: 60 + col * 200, y: 60 + row2 * 130 },
        data: { label: name },
        style: { background: '#0f766e', color: '#f1f5f9', borderRadius: 8, padding: 8, fontSize: 12, width: 170 },
      };
    });
    const edges = r.rows.map((row) => ({
      id: `r-${row.id}`,
      source: row.subject_a,
      target: row.subject_b,
      label: row.relation,
      style: { stroke: '#a78bfa', strokeWidth: 1.2 },
      labelStyle: { fill: '#94a3b8', fontSize: 10 },
    }));
    res.json({ nodes, edges, total: r.rows.length });
  } catch (e) { fail(res, 500, e.message); }
});

// ─── agent API-key CRUD (issue/revoke/list) ────────────────────────────────
router.get('/api-keys', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, agent_id, name, key_prefix, scopes, active, last_used_at, created_at, revoked_at FROM agent_api_keys ORDER BY id DESC');
    res.json(r.rows);
  } catch (e) { fail(res, 500, e.message); }
});
router.post('/api-keys', requireWriter, async (req, res) => {
  try {
    const { agent_id, name, scopes } = req.body || {};
    if (!agent_id) return fail(res, 400, 'agent_id required');
    const raw = crypto.randomBytes(24).toString('hex');
    const prefix = raw.slice(0, 8);
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const r = await pool.query(
      `INSERT INTO agent_api_keys (agent_id, name, key_prefix, key_hash, scopes, active)
       VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING id, agent_id, name, key_prefix, scopes, active, created_at`,
      [agent_id, name || '', prefix, hash, scopes || 'read,write']
    );
    res.status(201).json({ ...r.rows[0], plaintext_key: raw, warning: 'Save plaintext_key now — it will not be shown again.' });
  } catch (e) { fail(res, 500, e.message); }
});
router.post('/api-keys/:id/revoke', requireWriter, async (req, res) => {
  try {
    const r = await pool.query('UPDATE agent_api_keys SET active=FALSE, revoked_at=NOW() WHERE id=$1 RETURNING id, agent_id, revoked_at', [req.params.id]);
    if (!r.rows.length) return fail(res, 404, 'not found');
    res.json(r.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});

// ─── memory ACL ─────────────────────────────────────────────────────────────
router.get('/acl', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM memory_acl ORDER BY id DESC LIMIT 500');
    res.json(r.rows);
  } catch (e) { fail(res, 500, e.message); }
});
router.post('/acl', requireWriter, async (req, res) => {
  try {
    const { scope, scope_ref, grantee, permission } = req.body || {};
    if (!scope || !scope_ref || !grantee || !permission) return fail(res, 400, 'scope, scope_ref, grantee, permission required');
    if (!['memory', 'namespace'].includes(scope)) return fail(res, 400, "scope must be 'memory' or 'namespace'");
    if (!['read', 'write'].includes(permission)) return fail(res, 400, "permission must be 'read' or 'write'");
    const r = await pool.query(
      `INSERT INTO memory_acl (scope, scope_ref, grantee, permission, granted_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [scope, String(scope_ref), grantee, permission, reader(req)]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});
router.delete('/acl/:id', requireWriter, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM memory_acl WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return fail(res, 404, 'not found');
    res.json({ ok: true });
  } catch (e) { fail(res, 500, e.message); }
});

// ─── rate-limit status (per caller) ─────────────────────────────────────────
router.get('/rate-limits', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT caller, bucket, window_start, count
      FROM rate_limit_buckets
      WHERE window_start > NOW() - INTERVAL '1 hour'
      ORDER BY window_start DESC LIMIT 200`);
    res.json(r.rows);
  } catch (e) { fail(res, 500, e.message); }
});

router.post('/rate-limits/probe', async (req, res) => {
  try {
    const bucket = String(req.body?.bucket || 'ai');
    const window = new Date();
    window.setSeconds(0, 0);
    const r = await pool.query(
      `INSERT INTO rate_limit_buckets (caller, bucket, window_start, count)
       VALUES ($1,$2,$3,1) RETURNING *`,
      [reader(req), bucket, window]
    );
    res.json(r.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});

// ─── eval harness: CRUD on golden pairs, run, history ───────────────────────
router.get('/eval-pairs', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM eval_pairs ORDER BY id DESC');
    res.json(r.rows);
  } catch (e) { fail(res, 500, e.message); }
});
router.post('/eval-pairs', requireWriter, async (req, res) => {
  try {
    const { query, expected_memory_id, expected_subject, notes } = req.body || {};
    if (!query) return fail(res, 400, 'query required');
    const r = await pool.query(
      `INSERT INTO eval_pairs (query, expected_memory_id, expected_subject, notes)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [query, expected_memory_id || null, expected_subject || null, notes || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});
router.put('/eval-pairs/:id', requireWriter, async (req, res) => {
  try {
    const { query, expected_memory_id, expected_subject, notes } = req.body || {};
    const r = await pool.query(
      `UPDATE eval_pairs SET
         query=COALESCE($2,query),
         expected_memory_id=COALESCE($3,expected_memory_id),
         expected_subject=COALESCE($4,expected_subject),
         notes=COALESCE($5,notes),
         updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, query || null, expected_memory_id || null, expected_subject || null, notes || null]
    );
    if (!r.rows.length) return fail(res, 404, 'not found');
    res.json(r.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});
router.delete('/eval-pairs/:id', requireWriter, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM eval_pairs WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return fail(res, 404, 'not found');
    res.json({ ok: true });
  } catch (e) { fail(res, 500, e.message); }
});

router.post('/eval-pairs/run', requireWriter, async (req, res) => {
  try {
    const label = String(req.body?.label || `run-${new Date().toISOString()}`);
    const pairs = (await pool.query('SELECT * FROM eval_pairs')).rows;
    let passed = 0, failed = 0;
    const details = [];
    for (const p of pairs) {
      let hit = null;
      if (p.expected_memory_id) {
        const q = await pool.query('SELECT id, subject FROM memories WHERE id=$1', [p.expected_memory_id]);
        hit = q.rows[0] || null;
      } else if (p.expected_subject) {
        const q = await pool.query('SELECT id, subject FROM memories WHERE subject=$1 ORDER BY id DESC LIMIT 1', [p.expected_subject]);
        hit = q.rows[0] || null;
      }
      const pass = !!hit;
      if (pass) passed += 1; else failed += 1;
      details.push({ pair_id: p.id, query: p.query, expected: p.expected_memory_id || p.expected_subject, hit, pass });
    }
    const total = passed + failed;
    const r = await pool.query(
      `INSERT INTO eval_runs (run_label, passed, failed, total, details) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [label, passed, failed, total, JSON.stringify(details)]
    );
    res.json(r.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});

router.get('/eval-runs', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, run_label, passed, failed, total, created_at FROM eval_runs ORDER BY id DESC LIMIT 100');
    res.json(r.rows);
  } catch (e) { fail(res, 500, e.message); }
});

router.get('/eval-runs/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM eval_runs WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return fail(res, 404, 'not found');
    res.json(r.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});

// ─── drift monitor ──────────────────────────────────────────────────────────
router.get('/drift', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM drift_signals ORDER BY id DESC LIMIT 100');
    res.json(r.rows);
  } catch (e) { fail(res, 500, e.message); }
});

router.post('/drift/sample', async (req, res) => {
  try {
    // Pull recent ai_results for embedding-quality + contradiction-detect and synthesize signals.
    const eq = await pool.query("SELECT output FROM ai_results WHERE feature='embedding-quality' ORDER BY id DESC LIMIT 5");
    const cd = await pool.query("SELECT output FROM ai_results WHERE feature='contradiction-detect' ORDER BY id DESC LIMIT 5");
    const avgQuality = eq.rows.reduce((a, x) => a + (Number(x.output?.quality_score) || 0), 0) / Math.max(1, eq.rows.length);
    const contradictionRate = cd.rows.reduce((a, x) => a + ((x.output?.contradictions || []).length || 0), 0) / Math.max(1, cd.rows.length);
    const signals = [
      { signal_type: 'embedding_quality_avg', score: avgQuality, threshold: 0.7, triggered: avgQuality < 0.7 },
      { signal_type: 'contradiction_rate', score: contradictionRate, threshold: 2, triggered: contradictionRate > 2 },
    ];
    for (const s of signals) {
      await pool.query(
        `INSERT INTO drift_signals (signal_type, score, threshold, triggered, details) VALUES ($1,$2,$3,$4,$5)`,
        [s.signal_type, s.score, s.threshold, s.triggered, JSON.stringify({ samples: eq.rows.length + cd.rows.length })]
      );
    }
    res.json({ signals });
  } catch (e) { fail(res, 500, e.message); }
});

// ─── cost dashboard (token spend per AI feature from ai_results JSON) ───────
router.get('/cost', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT feature,
             COUNT(*)::int AS calls,
             COALESCE(SUM((output->>'prompt_tokens')::numeric), 0)::float AS prompt_tokens,
             COALESCE(SUM((output->>'completion_tokens')::numeric), 0)::float AS completion_tokens,
             MAX(created_at) AS last_call
      FROM ai_results GROUP BY feature ORDER BY calls DESC`);
    const ratePromptPerK = 0.003;
    const rateComplPerK = 0.015;
    const rows = r.rows.map((x) => ({
      ...x,
      est_cost_usd: Number(((x.prompt_tokens / 1000) * ratePromptPerK + (x.completion_tokens / 1000) * rateComplPerK).toFixed(4)),
    }));
    const total_calls = rows.reduce((a, x) => a + x.calls, 0);
    const total_cost_usd = Number(rows.reduce((a, x) => a + x.est_cost_usd, 0).toFixed(4));
    res.json({
      total_calls, total_cost_usd, by_feature: rows,
      note: 'Token counts read from ai_results JSON when present; calls without token usage report 0.',
    });
  } catch (e) { fail(res, 500, e.message); }
});

// ─── replay mode: stream subject's memories in temporal order ──────────────
router.get('/replay/:subject', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, subject, event_text, tags, namespace, importance, pinned,
              COALESCE(embedded_at, created_at) AS ts
       FROM memories WHERE subject=$1 AND tombstoned_at IS NULL
       ORDER BY ts ASC, id ASC`,
      [req.params.subject]
    );
    res.json({ subject: req.params.subject, count: r.rows.length, frames: r.rows });
  } catch (e) { fail(res, 500, e.message); }
});

// ─── bulk export (JSONL + NDJSON streaming) ────────────────────────────────
router.get('/export/jsonl', async (req, res) => {
  try {
    const ns = req.query.namespace ? String(req.query.namespace) : null;
    const r = ns
      ? await pool.query('SELECT * FROM memories WHERE namespace=$1 ORDER BY id ASC', [ns])
      : await pool.query('SELECT * FROM memories ORDER BY id ASC');
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Content-Disposition', `attachment; filename="memories-${ns || 'all'}.jsonl"`);
    for (const row of r.rows) res.write(JSON.stringify(row) + '\n');
    res.end();
  } catch (e) { fail(res, 500, e.message); }
});

router.get('/export/ndjson-stream', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    const limit = Math.min(50000, asInt(req.query.limit, 5000));
    const batch = 500;
    let offset = 0;
    while (offset < limit) {
      const q = await pool.query('SELECT * FROM memories ORDER BY id ASC OFFSET $1 LIMIT $2', [offset, Math.min(batch, limit - offset)]);
      if (!q.rows.length) break;
      for (const row of q.rows) res.write(JSON.stringify(row) + '\n');
      offset += q.rows.length;
      if (q.rows.length < batch) break;
    }
    res.end();
  } catch (e) {
    try { fail(res, 500, e.message); } catch (_) { res.end(); }
  }
});

// ─── background jobs registry ───────────────────────────────────────────────
router.get('/jobs', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM background_jobs ORDER BY id DESC LIMIT 100');
    res.json(r.rows);
  } catch (e) { fail(res, 500, e.message); }
});

router.post('/jobs', requireWriter, async (req, res) => {
  try {
    const { job_type, payload } = req.body || {};
    if (!job_type) return fail(res, 400, 'job_type required');
    const allowed = ['consolidation', 'decay_sweep', 'reembedding', 'drift_scan', 'eval_run'];
    if (!allowed.includes(job_type)) return fail(res, 400, `job_type must be one of: ${allowed.join(', ')}`);
    const r = await pool.query(
      `INSERT INTO background_jobs (job_type, status, payload) VALUES ($1,'pending',$2) RETURNING *`,
      [job_type, JSON.stringify(payload || {})]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});

router.post('/jobs/:id/run', requireWriter, async (req, res) => {
  try {
    const id = asInt(req.params.id, -1);
    const start = await pool.query(
      `UPDATE background_jobs SET status='running', started_at=NOW() WHERE id=$1 RETURNING *`, [id]);
    if (!start.rows.length) return fail(res, 404, 'not found');
    const job = start.rows[0];
    let result = { ok: true, message: 'no-op; worker integration pending', advisory_only: true };
    if (job.job_type === 'decay_sweep') {
      const q = await pool.query(
        `SELECT id FROM memories WHERE decay_at IS NOT NULL AND decay_at < NOW() AND tombstoned_at IS NULL AND pinned=FALSE LIMIT 200`);
      result = {
        candidates: q.rows.map((x) => x.id),
        action_taken: 'none',
        disclaimer: 'Decay sweep is advisory only — call POST /api/pass7/retention/tombstone with explicit ids to soft-delete.',
        requires_human_review: true,
      };
    } else if (job.job_type === 'consolidation') {
      const q = await pool.query(`SELECT subject, COUNT(*)::int AS c FROM memories GROUP BY subject HAVING COUNT(*) > 5 ORDER BY c DESC LIMIT 20`);
      result = {
        clusters_recommended: q.rows,
        action_taken: 'none',
        disclaimer: 'Consolidation is advisory only — invoke POST /api/ai/memory-consolidate per cluster.',
        requires_human_review: true,
      };
    } else if (job.job_type === 'drift_scan') {
      result = { hint: 'POST /api/pass7/drift/sample to record drift signal.' };
    } else if (job.job_type === 'eval_run') {
      result = { hint: 'POST /api/pass7/eval-pairs/run to execute golden-set evaluation.' };
    } else if (job.job_type === 'reembedding') {
      result = {
        candidates: 0,
        disclaimer: 'Re-embedding requires an embeddings provider key. See POST /api/ai/embed-generate.',
        requires_human_review: true,
      };
    }
    const done = await pool.query(
      `UPDATE background_jobs SET status='done', finished_at=NOW(), result=$2 WHERE id=$1 RETURNING *`,
      [id, JSON.stringify(result)]
    );
    res.json(done.rows[0]);
  } catch (e) { fail(res, 500, e.message); }
});

// ─── consolidation worker trigger (queue-style; advisory output) ────────────
router.post('/consolidation/preview', async (req, res) => {
  try {
    const ageDays = Math.max(1, asInt(req.body?.age_days, 30));
    const minImportance = Number(req.body?.min_importance) || 0.3;
    const r = await pool.query(
      `SELECT subject, COUNT(*)::int AS member_count, MIN(created_at) AS oldest, MAX(created_at) AS newest
       FROM memories
       WHERE created_at < NOW() - ($1 || ' days')::interval
         AND importance < $2 AND tombstoned_at IS NULL AND pinned=FALSE
       GROUP BY subject HAVING COUNT(*) > 2 ORDER BY member_count DESC LIMIT 30`,
      [String(ageDays), minImportance]
    );
    res.json({
      age_days: ageDays, min_importance: minImportance, clusters: r.rows,
      disclaimer: 'Preview only — per-cluster consolidation should be issued via POST /api/ai/memory-consolidate.',
      requires_human_review: true,
    });
  } catch (e) { fail(res, 500, e.message); }
});

// ─── cross-agent share — advisory grant preview ─────────────────────────────
router.post('/cross-agent-share/preview', async (req, res) => {
  try {
    const { source_agent, target_agent, subject } = req.body || {};
    if (!source_agent || !target_agent) return fail(res, 400, 'source_agent and target_agent required');
    const r = subject
      ? await pool.query('SELECT id, subject, namespace, importance FROM memories WHERE subject=$1 AND tombstoned_at IS NULL LIMIT 50', [subject])
      : await pool.query('SELECT id, subject, namespace, importance FROM memories WHERE source_agent=$1 AND tombstoned_at IS NULL LIMIT 50', [source_agent]);
    res.json({
      source_agent, target_agent, subject: subject || null,
      candidate_memories: r.rows,
      recommended_default: 'read',
      privacy_risks: ['cross-namespace leakage', 'PII in event_text', 'unvetted importance signals'],
      disclaimer: 'Cross-agent sharing is OFF by default. This preview must be reviewed before any ACL grant.',
      requires_human_review: true,
    });
  } catch (e) { fail(res, 500, e.message); }
});

// ─── summary index for the pass7 router (debugging convenience) ─────────────
router.get('/_index', (req, res) => {
  res.json({
    pass: 7,
    routes: [
      'POST/GET /memory-reads', 'GET /memory-reads/summary',
      'GET/PUT /memories/:id/provenance',
      'POST /memories/:id/pin', 'POST /memories/:id/unpin', 'GET /memories/pinned/list',
      'PUT /memories/:id/importance', 'PUT /memories/:id/decay-at', 'PUT /memories/:id/namespace',
      'GET /memories-by-namespace',
      'GET /retention/dry-run', 'POST /retention/tombstone', 'POST /retention/restore',
      'GET/POST/DELETE /relations', 'GET /relations/graph',
      'GET/POST /api-keys', 'POST /api-keys/:id/revoke',
      'GET/POST/DELETE /acl',
      'GET /rate-limits', 'POST /rate-limits/probe',
      'GET/POST/PUT/DELETE /eval-pairs', 'POST /eval-pairs/run', 'GET /eval-runs', 'GET /eval-runs/:id',
      'GET /drift', 'POST /drift/sample',
      'GET /cost',
      'GET /replay/:subject',
      'GET /export/jsonl', 'GET /export/ndjson-stream',
      'GET/POST /jobs', 'POST /jobs/:id/run',
      'POST /consolidation/preview',
      'POST /cross-agent-share/preview',
    ],
  });
});

module.exports = router;
