const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const ai = require('../services/ai');

const SCHEMAS = {
  'insert-memory': `{"stored":true,"extracted_facts":[{"fact":string,"type":string,"confidence":number}],"indexed_at":string,"embedding_summary":string,"summary":string}`,
  'recall': `{"query":string,"matches":[{"memory_id":string,"summary":string,"subject":string,"score":number,"when":string}],"synthesized_answer":string,"confidence":number,"summary":string}`,
  'time-travel': `{"subject":string,"as_of":string,"known_facts":[{"fact":string,"first_seen":string,"last_confirmed":string}],"open_questions":[string],"diff_vs_today":string,"summary":string}`,
  'contradiction-detect': `{"contradictions":[{"a":string,"b":string,"a_when":string,"b_when":string,"resolution":string}],"summary":string}`,
  'summary-rollup': `{"subject":string,"period":string,"top_facts":[string],"decisions":[string],"open_items":[string],"trend":string,"summary":string}`,
  'extractor-tuner': `{"current_version":string,"diagnostics":[{"example":string,"why_failed":string,"fix":string}],"new_prompt_proposal":string,"expected_improvement_pct":number,"summary":string}`,
  'embedding-quality': `{"clusters":[{"label":string,"members":[string],"cohesion":number}],"outliers":[string],"recommended_model":string,"quality_score":number,"summary":string}`,
  'conflict-resolve': `{"resolved_fact":string,"chosen_side":string,"reasoning":string,"provenance":[{"memory_id":string,"weight":number}],"confidence":number,"disclaimer":string,"requires_human_review":true,"summary":string}`,
  'relevance-score': `{"query":string,"scores":[{"memory_id":string,"score":number,"why":string}],"top_pick":string,"summary":string}`,
  'importance-score': `{"importance":number,"signals":[{"signal":string,"weight":number}],"recommend_pin":boolean,"recommend_decay_days":number,"summary":string}`,
  'memory-consolidate': `{"consolidated_block":string,"merged_ids":[string],"superseded_facts":[string],"retained_facts":[string],"summary":string}`,
  'rag-chat': `{"answer":string,"citations":[{"memory_id":string,"snippet":string}],"unresolved":[string],"confidence":number,"summary":string}`,
  'pii-redact': `{"redacted_text":string,"findings":[{"type":string,"original":string,"replacement":string}],"residual_risk":string,"summary":string}`,
  'memory-graph-extract': `{"entities":[{"name":string,"type":string}],"relations":[{"subject_a":string,"relation":string,"subject_b":string,"confidence":number}],"summary":string}`,
  'decay-policy-recommend': `{"namespace":string,"recommended_half_life_days":number,"curve":string,"rationale":string,"risk_notes":string,"disclaimer":string,"requires_human_review":true,"summary":string}`,
  'semantic-search': `{"query":string,"hits":[{"memory_id":string,"subject":string,"snippet":string,"score":number}],"score_normalization":string,"summary":string}`,
  'cross-agent-share-advisor': `{"target_agent":string,"recommended_grants":[{"memory_id":string,"permission":string,"redactions_needed":[string]}],"privacy_risks":[string],"disclaimer":string,"requires_human_review":true,"summary":string}`,
  'retention-dry-run': `{"candidates":[{"memory_id":string,"reason":string,"age_days":number}],"projected_deletions":number,"safety_notes":[string],"disclaimer":string,"requires_human_review":true,"summary":string}`,
  'auto-merge-advisor': `{"merge_groups":[{"member_ids":[string],"proposed_merged_text":string,"truth_drift_risk":string}],"disclaimer":string,"requires_human_review":true,"summary":string}`
};

const SAMPLES = {
  'insert-memory': [
    { label: 'Project budget overrun', values: {"subject":"Project Apollo","event_text":"CFO flagged Q3 budget overrun of $480k tied to outsourced QA contract.","tags":"budget,risk,decision"} },
    { label: 'Customer renewal ask', values: {"subject":"Customer #4421","event_text":"Asked for 5% discount on $80k renewal, mentioned competitor pricing.","tags":"sales,renewal"} },
    { label: 'Vendor audit fail', values: {"subject":"Acme Corp","event_text":"Failed SOC2 control 4.2 during 2026-Q2 audit. Remediation due in 30 days.","tags":"compliance,risk"} }
  ],
  'recall': [
    { label: 'Apollo budget', values: {"query":"When did we last discuss Apollo budget overrun?"} },
    { label: 'Customer #4421 history', values: {"query":"Recent interactions with Customer #4421 and any pricing asks?"} },
    { label: 'Acme audit status', values: {"query":"What is the latest on Acme Corp SOC2 audit findings?"} }
  ],
  'time-travel': [
    { label: 'Apollo on 2026-03-15', values: {"subject":"Project Apollo","as_of":"2026-03-15"} },
    { label: 'Customer #4421 on Jan 1', values: {"subject":"Customer #4421","as_of":"2026-01-01"} },
    { label: 'Acme on 2026-02-01', values: {"subject":"Acme Corp","as_of":"2026-02-01"} }
  ],
  'contradiction-detect': [
    { label: 'Apollo schedule', values: {"subject":"Project Apollo","recent_window":"last 60 days"} },
    { label: 'Customer churn signals', values: {"subject":"Customer #4421","recent_window":"last 90 days"} },
    { label: 'Vendor audit dates', values: {"subject":"Acme Corp","recent_window":"last 120 days"} }
  ],
  'summary-rollup': [
    { label: 'Apollo Q3 rollup', values: {"subject":"Project Apollo","period":"Q3 2026"} },
    { label: 'Customer 4421 yearly', values: {"subject":"Customer #4421","period":"last 12 months"} },
    { label: 'Acme since audit', values: {"subject":"Acme Corp","period":"since last SOC2 audit"} }
  ],
  'extractor-tuner': [
    { label: 'fact_extractor on dates', values: {"extractor_name":"fact_extractor","failing_examples":"\"Q3 budget review\" extracts no date; \"next Tuesday\" extracts no concrete date."} },
    { label: 'sentiment on irony', values: {"extractor_name":"sentiment_tagger","failing_examples":"\"Oh great, another all-hands\" labeled positive; \"Love this bug\" labeled positive."} },
    { label: 'amount_parser currencies', values: {"extractor_name":"amount_parser","failing_examples":"\"€4,500\" extracted as 4500 with currency missing; \"USD 4.5k\" extracted as 4 with k lost."} }
  ],
  'embedding-quality': [
    { label: 'Email subjects', values: {"sample_texts":"Refund\nUpgrade\nReview","expected_groups_hint":"support vs feedback"} },
    { label: 'Project topics', values: {"sample_texts":"Apollo budget\nVenus deploy","expected_groups_hint":"by project"} },
    { label: 'Customer asks', values: {"sample_texts":"Discount\nDemo","expected_groups_hint":"commercial"} }
  ],
  'conflict-resolve': [
    { label: 'Apollo budget overrun vs on-track', values: {"a":"Apollo Q3 budget overrun $480k","b":"Apollo Q3 on budget","subject":"Project Apollo"} },
    { label: '#4421 discount granted vs denied', values: {"a":"Customer #4421 approved 5% discount","b":"Customer #4421 discount request denied","subject":"Customer #4421"} },
    { label: 'Acme SOC2 pass vs fail', values: {"a":"Acme passed SOC2 control 4.2","b":"Acme failed SOC2 control 4.2","subject":"Acme Corp"} }
  ],
  'relevance-score': [
    { label: 'Apollo risk query', values: {"query":"Apollo budget risks","memory_ids":"101,102,103"} },
    { label: 'Renewal pricing', values: {"query":"recent pricing asks from customer 4421","memory_ids":"55,56,57"} },
    { label: 'Acme audit', values: {"query":"latest SOC2 status Acme","memory_ids":"33,34,35"} }
  ],
  'importance-score': [
    { label: 'CFO budget alert', values: {"subject":"Project Apollo","event_text":"CFO flagged $480k overrun","tags":"finance,risk"} },
    { label: 'Casual mention', values: {"subject":"Customer #4421","event_text":"Mentioned weather in passing","tags":"smalltalk"} },
    { label: 'Audit failure', values: {"subject":"Acme Corp","event_text":"Failed SOC2 control 4.2","tags":"compliance,risk"} }
  ],
  'memory-consolidate': [
    { label: 'Apollo Q3 cluster', values: {"subject":"Project Apollo","memory_ids":"201,202,203,204","period":"Q3 2026"} },
    { label: 'Customer #4421 yearly', values: {"subject":"Customer #4421","memory_ids":"301,302,303","period":"last 12 months"} },
    { label: 'Acme audit thread', values: {"subject":"Acme Corp","memory_ids":"401,402,403,404,405","period":"since 2026-Q2"} }
  ],
  'rag-chat': [
    { label: 'Apollo status ask', values: {"query":"What is the latest on Apollo budget?","top_k":5} },
    { label: 'Customer 4421 history', values: {"query":"Walk me through Customer #4421 over the past quarter","top_k":8} },
    { label: 'Acme audit chat', values: {"query":"Is Acme still failing SOC2?","top_k":5} }
  ],
  'pii-redact': [
    { label: 'Email + phone', values: {"text":"Contact Jane Doe at jane.doe@example.com or 415-555-0199 about the renewal."} },
    { label: 'SSN sneaking in', values: {"text":"Onboarded vendor with TIN 12-3456789 and rep SSN 123-45-6789."} },
    { label: 'Addresses', values: {"text":"Visited 221B Baker Street; called from +44 20 7946 0958."} }
  ],
  'memory-graph-extract': [
    { label: 'CFO flagged overrun', values: {"event_text":"CFO Jane Smith flagged Q3 budget overrun on Project Apollo tied to QA vendor Beacon."} },
    { label: '#4421 renewal', values: {"event_text":"Customer #4421 (BlueOak) asked AE Tom for 5% renewal discount citing competitor Acme."} },
    { label: 'Acme audit', values: {"event_text":"Acme Corp failed SOC2 control 4.2 during the 2026-Q2 audit run by Coalfire."} }
  ],
  'decay-policy-recommend': [
    { label: 'episodic chat logs', values: {"namespace":"episodic","access_pattern":"reads spike in first 48h then drop to near zero"} },
    { label: 'semantic facts', values: {"namespace":"semantic","access_pattern":"steady reads for months, occasional spikes"} },
    { label: 'scratchpad', values: {"namespace":"scratchpad","access_pattern":"single-session, never re-read"} }
  ],
  'semantic-search': [
    { label: 'Apollo risks', values: {"query":"Apollo budget risk Q3","top_k":5} },
    { label: 'Customer churn signals', values: {"query":"signs of churn from #4421","top_k":8} },
    { label: 'Vendor compliance', values: {"query":"vendor SOC2 failures recent","top_k":5} }
  ],
  'cross-agent-share-advisor': [
    { label: 'Sales→Support handoff', values: {"source_agent":"sales-bot","target_agent":"support-bot","subject":"Customer #4421"} },
    { label: 'Audit→Legal', values: {"source_agent":"audit-bot","target_agent":"legal-bot","subject":"Acme Corp"} },
    { label: 'Eng→Finance', values: {"source_agent":"eng-bot","target_agent":"finance-bot","subject":"Project Apollo"} }
  ],
  'retention-dry-run': [
    { label: '30d episodic sweep', values: {"namespace":"episodic","policy_days":30} },
    { label: '7d scratchpad sweep', values: {"namespace":"scratchpad","policy_days":7} },
    { label: '365d semantic sweep', values: {"namespace":"semantic","policy_days":365} }
  ],
  'auto-merge-advisor': [
    { label: 'Apollo dupes', values: {"subject":"Project Apollo","candidate_ids":"201,202,203"} },
    { label: '#4421 dupes', values: {"subject":"Customer #4421","candidate_ids":"301,302"} },
    { label: 'Acme dupes', values: {"subject":"Acme Corp","candidate_ids":"401,402,403"} }
  ]
};

async function record(feature, input, output) {
  try {
    await pool.query('INSERT INTO ai_results (feature, input, output) VALUES ($1, $2, $3)',
      [feature, input || {}, output || {}]);
  } catch (e) { console.warn('[ai] record failed:', e.message); }
}

router.get('/samples', (req, res) => {
  try {
    const feature = (req.query.feature || '').toString();
    if (!feature) return res.json({ features: Object.keys(SAMPLES) });
    const samples = SAMPLES[feature];
    if (!samples) return res.status(404).json({ error: `unknown feature: ${feature}` });
    res.json({ feature, samples });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/history', async (req, res) => {
  try {
    const feature = (req.query.feature || '').toString();
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 200);
    const r = feature
      ? await pool.query('SELECT id, feature, input, output, created_at FROM ai_results WHERE feature=$1 ORDER BY created_at DESC LIMIT $2', [feature, limit])
      : await pool.query('SELECT id, feature, input, output, created_at FROM ai_results ORDER BY created_at DESC LIMIT $1', [limit]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/insert-memory', async (req, res) => {
  try {
    const result = await ai.runFeature('insert-memory', SCHEMAS['insert-memory'], req.body || {});
    await record('insert-memory', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/recall', async (req, res) => {
  try {
    const result = await ai.runFeature('recall', SCHEMAS['recall'], req.body || {});
    await record('recall', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/time-travel', async (req, res) => {
  try {
    const result = await ai.runFeature('time-travel', SCHEMAS['time-travel'], req.body || {});
    await record('time-travel', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/contradiction-detect', async (req, res) => {
  try {
    const result = await ai.runFeature('contradiction-detect', SCHEMAS['contradiction-detect'], req.body || {});
    await record('contradiction-detect', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/summary-rollup', async (req, res) => {
  try {
    const result = await ai.runFeature('summary-rollup', SCHEMAS['summary-rollup'], req.body || {});
    await record('summary-rollup', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/extractor-tuner', async (req, res) => {
  try {
    const result = await ai.runFeature('extractor-tuner', SCHEMAS['extractor-tuner'], req.body || {});
    await record('extractor-tuner', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/embedding-quality', async (req, res) => {
  try {
    const result = await ai.runFeature('embedding-quality', SCHEMAS['embedding-quality'], req.body || {});
    await record('embedding-quality', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Pass 7 mechanical additions ────────────────────────────────────────────
function mountFeature(slug, opts = {}) {
  router.post('/' + slug, async (req, res) => {
    try {
      const result = await ai.runFeature(slug, SCHEMAS[slug], req.body || {});
      if (opts.advisory) {
        result.disclaimer = result.disclaimer
          || 'This output is advisory only. Persisting requires explicit human review and confirmation.';
        result.requires_human_review = true;
      }
      await record(slug, req.body || {}, result);
      res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

mountFeature('conflict-resolve',           { advisory: true });
mountFeature('relevance-score');
mountFeature('importance-score');
mountFeature('memory-consolidate');
mountFeature('rag-chat');
mountFeature('pii-redact');
mountFeature('memory-graph-extract');
mountFeature('decay-policy-recommend',     { advisory: true });
mountFeature('semantic-search');

// ─── Pass 7 TOO-RISKY items: advisory-only surfaces ─────────────────────────
mountFeature('cross-agent-share-advisor',  { advisory: true });
mountFeature('retention-dry-run',          { advisory: true });
mountFeature('auto-merge-advisor',         { advisory: true });

// ─── Pass 7 NEEDS-CREDS stubs (503 until embeddings provider configured) ────
router.post('/embed-generate', (req, res) => {
  res.status(503).json({
    error: 'embed-generate unavailable: no embeddings provider configured',
    needs_creds: ['OPENAI_API_KEY', 'VOYAGE_API_KEY', 'COHERE_API_KEY'],
    hint: 'Set one embeddings provider key in .env to enable real vector synthesis.',
    requires_human_review: true,
  });
});
router.post('/vector-db-sync', (req, res) => {
  res.status(503).json({
    error: 'vector-db-sync unavailable: no external vector DB configured',
    needs_creds: ['PINECONE_API_KEY', 'WEAVIATE_API_KEY', 'QDRANT_URL', 'QDRANT_API_KEY'],
    hint: 'Configure an external vector DB or enable pgvector in Postgres.',
    requires_human_review: true,
  });
});

module.exports = router;
