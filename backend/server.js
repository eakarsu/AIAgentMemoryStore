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

app.use('/api', require('./runtimeAcceptance'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api', authenticateToken);
app.use('/api/memory-workflow', require('./routes/nativeMemoryRecords')(require('./config/database')));
app.use('/api/memory-workflow', require('./routes/tenantMemoryWorkflow'));
app.use('/api', (req, res, next) => {
  // Only the authenticated tenant workflow is supported here. Obsolete local
  // legacy flags never expose global memory rows or bypass tenant isolation.
  if (req.path === '/memory-workflow' || req.path.startsWith('/memory-workflow/')) return next();
  return res.status(503).json({
    error: 'Legacy global routes are disabled because they are not tenant-isolated',
    supported_workflow: '/api/memory-workflow',
    code: 'legacy_global_route_quarantined',
  });
});

// Global memoryExtras and original global CRUD remain archived and unmounted.

// AI + cross-cutting
app.use('/api/ai', require('./routes/ai'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/attachments', require('./routes/attachments'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/custom-views', require('./routes/customViews'));

// Original global pass7/conflict routes remain archived and unmounted.

app.listen(PORT, () => console.log(`\nAgent Memory Store API on http://localhost:${PORT}\n`));
