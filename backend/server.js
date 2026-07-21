const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { authenticateToken } = require('./middleware/auth');
const { getJwtSecret } = require('./lib/security');
const { encryptionKey } = require('./services/memoryWorkflow');

const app = express();
const PORT = process.env.BACKEND_PORT || 4059;
try { getJwtSecret(); encryptionKey(); } catch (error) { console.error(`Configuration error: ${error.message}`); process.exit(1); }

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4058').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('cors'))), credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'AIAgentMemoryStore', timestamp: new Date().toISOString() }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api', authenticateToken);
app.use('/api/memory-workflow', require('./routes/tenantMemoryWorkflow'));
app.use('/api', (req, res, next) => {
  if (process.env.ENABLE_LEGACY_GLOBAL_ROUTES === 'true' || req.path.startsWith('/memory-workflow')) return next();
  return res.status(503).json({
    error: 'Legacy global routes are disabled because they are not tenant-isolated',
    supported_workflow: '/api/memory-workflow',
    development_override: 'ENABLE_LEGACY_GLOBAL_ROUTES=true',
  });
});

// memoryExtras MUST mount BEFORE the /api/memories CRUD so as_of=... wins
if (process.env.ENABLE_LEGACY_GLOBAL_ROUTES === 'true') app.use('/api', require('./routes/memoryExtras'));

// CRUD entities
if (process.env.ENABLE_LEGACY_GLOBAL_ROUTES === 'true') {
  app.use('/api/memories', require('./routes/Memories'));
  app.use('/api/subjects', require('./routes/Subjects'));
  app.use('/api/projections', require('./routes/Projections'));
  app.use('/api/extractors', require('./routes/Extractors'));
  app.use('/api/retention-policies', require('./routes/RetentionPolicies'));
}

// AI + cross-cutting
app.use('/api/ai', require('./routes/ai'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/attachments', require('./routes/attachments'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/custom-views', require('./routes/customViews'));

// Pass 7 — full backlog non-AI endpoints (audit, provenance, pin, eval, drift, cost, replay, jobs, ACL, api-keys, exports).
// Mounted under /api/pass7 to avoid colliding with existing routes (memoryExtras still owns GET /api/memories?as_of=...).
if (process.env.ENABLE_LEGACY_GLOBAL_ROUTES === 'true') {
  app.use('/api/pass7', require('./routes/pass7'));
  app.use('/api/memory-conflicts', require('./routes/memoryConflictResolver'));
}

app.listen(PORT, () => console.log(`\nAgent Memory Store API on http://localhost:${PORT}\n`));
