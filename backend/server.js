const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.BACKEND_PORT || 4059;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4058').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('cors'))), credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'AIAgentMemoryStore', timestamp: new Date().toISOString() }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api', authenticateToken);

// memoryExtras MUST mount BEFORE the /api/memories CRUD so as_of=... wins
app.use('/api', require('./routes/memoryExtras'));

// CRUD entities
app.use('/api/memories', require('./routes/Memories'));
app.use('/api/subjects', require('./routes/Subjects'));
app.use('/api/projections', require('./routes/Projections'));
app.use('/api/extractors', require('./routes/Extractors'));
app.use('/api/retention-policies', require('./routes/RetentionPolicies'));

// AI + cross-cutting
app.use('/api/ai', require('./routes/ai'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/attachments', require('./routes/attachments'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/custom-views', require('./routes/customViews'));

app.listen(PORT, () => console.log(`\nAgent Memory Store API on http://localhost:${PORT}\n`));
