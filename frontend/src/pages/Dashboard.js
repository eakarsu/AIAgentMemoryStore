import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../services/api';

const FEATURES = [
  { path: '/memories', title: 'Memories', icon: 'M', color: '#3b82f6', desc: 'Manage memories.' },
  { path: '/subjects', title: 'Subjects', icon: 'S', color: '#3b82f6', desc: 'Manage subjects.' },
  { path: '/projections', title: 'Projections', icon: 'P', color: '#3b82f6', desc: 'Manage projections.' },
  { path: '/extractors', title: 'Extractors', icon: 'X', color: '#3b82f6', desc: 'Manage extractors.' },
  { path: '/retention-policies', title: 'Retention Policies', icon: 'R', color: '#3b82f6', desc: 'Manage retention policies.' },
  { path: '/ai/insert-memory', title: 'AI · Insert Memory', icon: '*', color: '#8b5cf6', desc: 'Insert Memory' },
  { path: '/ai/recall', title: 'AI · Natural-Language Recall', icon: '*', color: '#8b5cf6', desc: 'Natural-Language Recall' },
  { path: '/ai/time-travel', title: 'AI · Time-Travel Query', icon: '*', color: '#8b5cf6', desc: 'Time-Travel Query' },
  { path: '/ai/contradiction-detect', title: 'AI · Contradiction Detect', icon: '*', color: '#8b5cf6', desc: 'Contradiction Detect' },
  { path: '/ai/summary-rollup', title: 'AI · Summary Rollup', icon: '*', color: '#8b5cf6', desc: 'Summary Rollup' },
  { path: '/ai/extractor-tuner', title: 'AI · Extractor Tuner', icon: '*', color: '#8b5cf6', desc: 'Extractor Tuner' },
  { path: '/ai/embedding-quality', title: 'AI · Embedding Quality', icon: '*', color: '#8b5cf6', desc: 'Embedding Quality' }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { getDashboardStats().then(setStats).catch((e) => setErr(e.message)); }, []);

  return (
    <div>
      <div className="dashboard-header">
        <h2>Agent Memory Store</h2>
        <p>LLM-native memory: schema-on-read, time-travel, one-line recall.</p>
      </div>
      {err && <div className="ai-error">Stats unavailable: {err}</div>}
      {stats && (
        <div className="stats-grid">
          <div className="stat"><div className="stat-label">Memories</div><div className="stat-value">{stats.memories?.total ?? '—'}</div></div>
          <div className="stat"><div className="stat-label">Subjects</div><div className="stat-value">{stats.subjects?.total ?? '—'}</div></div>
          <div className="stat"><div className="stat-label">Projections</div><div className="stat-value">{stats.projections?.total ?? '—'}</div></div>
          <div className="stat"><div className="stat-label">Extractors</div><div className="stat-value">{stats.extractors?.total ?? '—'}</div></div>
          <div className="stat"><div className="stat-label">Retention Policies</div><div className="stat-value">{stats.retention_policies?.total ?? '—'}</div></div>
        </div>
      )}
      <h3 style={{ color: '#cbd5e1', margin: '8px 0 14px', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 }}>Capabilities</h3>
      <div className="feature-grid">
        {FEATURES.map((f) => (
          <div key={f.path} className="feature-card" style={{ ['--card-color']: f.color }} onClick={() => navigate(f.path)}>
            <div className="feature-card-icon" style={{ background: f.color + '22', color: f.color }}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
