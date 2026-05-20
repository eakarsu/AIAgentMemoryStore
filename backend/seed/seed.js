const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function main() {
  const migDir = path.join(__dirname, '..', 'migrations');
  for (const f of fs.readdirSync(migDir).filter((x) => x.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(migDir, f), 'utf8');
    try { await pool.query(sql); console.log(`[seed] applied ${f}`); }
    catch (e) { console.warn(`[seed] ${f} warn: ${e.message}`); }
  }
  await pool.query(
    "INSERT INTO users (email, password, name, role) VALUES ('admin@agent-memory-store.local','secure123','Admin','commander') ON CONFLICT (email) DO NOTHING"
  );
  console.log('[seed] demo user ready');

  // memories
  for (const row of [{"subject":"Project Apollo","event_text":"Budget overrun discussed with CFO.","tags":"decision,risk","status":"active","embedded_at":null},{"subject":"Customer #4421","event_text":"Requested 5% renewal discount.","tags":"sales,renewal","status":"active","embedded_at":null},{"subject":"Project Apollo","event_text":"Q3 milestone pushed by 2 weeks.","tags":"schedule","status":"active","embedded_at":null}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO memories (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  // subjects
  for (const row of [{"name":"Project Apollo","type":"project","fact_count":42,"status":"active"},{"name":"Customer #4421","type":"customer","fact_count":18,"status":"active"},{"name":"Acme Corp","type":"vendor","fact_count":12,"status":"active"}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO subjects (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  // projections
  for (const row of [{"name":"project_health","schema_desc":"{ status, owner, budget_state, schedule_state }","status":"active"},{"name":"customer_renewal","schema_desc":"{ renewal_date, discount_pct, churn_risk }","status":"active"},{"name":"vendor_risk","schema_desc":"{ tier, last_audit, open_issues }","status":"draft"}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO projections (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  // extractors
  for (const row of [{"name":"fact_extractor","version":"v4","model":"haiku-4.5","status":"active","last_run":null},{"name":"sentiment_tagger","version":"v2","model":"haiku-4.5","status":"active","last_run":null},{"name":"amount_parser","version":"v1","model":"haiku-4.5","status":"deprecated","last_run":null}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO extractors (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  // retention_policies
  for (const row of [{"name":"default-90d","days":90,"applies_to":"all","status":"active"},{"name":"customer-1y","days":365,"applies_to":"subject=customer","status":"active"},{"name":"meeting-30d","days":30,"applies_to":"tag=meeting","status":"active"}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO retention_policies (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  console.log('[seed] domain rows seeded');
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
