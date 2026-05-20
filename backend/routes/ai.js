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
  'embedding-quality': `{"clusters":[{"label":string,"members":[string],"cohesion":number}],"outliers":[string],"recommended_model":string,"quality_score":number,"summary":string}`
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

module.exports = router;
