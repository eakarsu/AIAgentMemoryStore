const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [memories_q, subjects_q, projections_q, extractors_q, retention_policies_q] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total FROM memories"),
      pool.query("SELECT COUNT(*) AS total FROM subjects"),
      pool.query("SELECT COUNT(*) AS total FROM projections"),
      pool.query("SELECT COUNT(*) AS total FROM extractors"),
      pool.query("SELECT COUNT(*) AS total FROM retention_policies")
    ]);
    res.json({
      memories: memories_q.rows[0],
      subjects: subjects_q.rows[0],
      projections: projections_q.rows[0],
      extractors: extractors_q.rows[0],
      retention_policies: retention_policies_q.rows[0]
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
