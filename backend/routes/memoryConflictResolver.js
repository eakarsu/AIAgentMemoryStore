const express = require('express');
const router = express.Router();

function resolveConflict(memory) {
  const confidence = Number(memory.confidence ?? 0.5);
  const freshnessDays = Number(memory.freshness_days ?? memory.age_days ?? 30);
  const sourceTrust = Number(memory.source_trust ?? 0.5);
  const usageCount = Number(memory.usage_count ?? 0);
  const contradictionCount = Number(memory.contradictions ?? 0);
  const score = Math.max(0, Math.min(100, Math.round(
    confidence * 35 + sourceTrust * 30 + Math.max(0, 20 - freshnessDays / 3) + Math.min(15, usageCount * 1.5) - contradictionCount * 12
  )));
  return {
    id: memory.id || memory.memory_id || memory.label || 'memory',
    subject: memory.subject || 'unknown',
    statement: memory.statement || memory.text || '',
    score,
    recommendation: score >= 70 ? 'keep_primary' : score >= 45 ? 'needs_human_review' : 'supersede_or_tombstone',
  };
}

router.post('/resolve', (req, res) => {
  const memories = Array.isArray(req.body?.memories) ? req.body.memories : [];
  const items = memories.length ? memories : [
    { id: 'mem_102', subject: 'Acme renewal', statement: 'Budget approved for Q3 expansion', confidence: 0.78, source_trust: 0.84, freshness_days: 11, usage_count: 8, contradictions: 1 },
    { id: 'mem_118', subject: 'Acme renewal', statement: 'Expansion budget delayed until next year', confidence: 0.62, source_trust: 0.56, freshness_days: 4, usage_count: 2, contradictions: 2 }
  ];
  const resolved = items.map(resolveConflict).sort((a, b) => b.score - a.score);
  res.json({
    preferredMemoryId: resolved[0]?.id || null,
    reviewRequired: resolved.some((item) => item.recommendation !== 'keep_primary'),
    resolutionMode: resolved[0]?.score >= 70 ? 'auto_advisory' : 'human_review',
    items: resolved,
  });
});

module.exports = router;
