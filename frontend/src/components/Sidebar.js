import React from 'react';
import { NavLink } from 'react-router-dom';
import { logout, getStoredUser } from '../services/api';

const CRUD_LINKS = [
  { to: '/memories', label: 'Memories' },
  { to: '/subjects', label: 'Subjects' },
  { to: '/projections', label: 'Projections' },
  { to: '/extractors', label: 'Extractors' },
  { to: '/retention-policies', label: 'Retention Policies' },
];

const AI_LINKS = [
  { to: '/ai/insert-memory', label: 'AI · Insert Memory' },
  { to: '/ai/recall', label: 'AI · Natural-Language Recall' },
  { to: '/ai/time-travel', label: 'AI · Time-Travel Query' },
  { to: '/ai/contradiction-detect', label: 'AI · Contradiction Detect' },
  { to: '/ai/summary-rollup', label: 'AI · Summary Rollup' },
  { to: '/ai/extractor-tuner', label: 'AI · Extractor Tuner' },
  { to: '/ai/embedding-quality', label: 'AI · Embedding Quality' },
  { to: '/ai/semantic-search', label: 'AI · Semantic Search' },
  { to: '/ai/relevance-score', label: 'AI · Relevance Score' },
  { to: '/ai/importance-score', label: 'AI · Importance Score' },
  { to: '/ai/memory-consolidate', label: 'AI · Memory Consolidate' },
  { to: '/ai/rag-chat', label: 'AI · RAG Chat' },
  { to: '/ai/pii-redact', label: 'AI · PII Redact' },
  { to: '/ai/memory-graph-extract', label: 'AI · Memory Graph Extract' },
  { to: '/ai/conflict-resolve', label: 'AI · Conflict Resolve (advisory)' },
  { to: '/ai/decay-policy-recommend', label: 'AI · Decay Policy Recommend (advisory)' },
  { to: '/ai/cross-agent-share-advisor', label: 'AI · Cross-Agent Share (advisory)' },
  { to: '/ai/retention-dry-run', label: 'AI · Retention Dry-Run (advisory)' },
  { to: '/ai/auto-merge-advisor', label: 'AI · Auto-Merge Advisor (advisory)' },
];

const OPS_LINKS = [
  { to: '/ops/audit-log', label: 'Audit Log' },
  { to: '/ops/pinned', label: 'Pinned Memories' },
  { to: '/ops/retention-dry-run', label: 'Retention Dry-Run' },
  { to: '/ops/eval-harness', label: 'Eval Harness' },
  { to: '/ops/drift', label: 'Drift Monitor' },
  { to: '/ops/cost', label: 'Cost Dashboard' },
  { to: '/ops/replay', label: 'Replay Mode' },
  { to: '/ops/jobs', label: 'Background Jobs' },
  { to: '/ops/knowledge-graph', label: 'Knowledge Graph' },
  { to: '/ops/api-keys', label: 'Agent API Keys' },
  { to: '/ops/acl', label: 'Memory ACL' },
  { to: '/ops/memory-conflicts', label: 'Memory Conflict Resolver' },
];

const CUSTOM_LINKS = [
  { to: '/wb/subject-browser', label: 'Subject Browser' },
  { to: '/wb/time-slider', label: 'Time-Travel Slider' },
];

const MEMORY_VIEW_LINKS = [
  { to: '/custom-views', label: 'Memory Views' },
];

export default function Sidebar() {
  const user = getStoredUser();
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <h1>AGENT MEMORY STORE</h1>
        <p>LLM-native memory: schema-on-read, time-travel, one-line recall.</p>
      </div>
      <NavLink to="/" end>Dashboard</NavLink>
      <NavLink to="/ai/memory-governance-review">AI · Memory governance review</NavLink>
      <NavLink to="/memories">Native tenant memories</NavLink>
      <details><summary className="sidebar-group-label">Archived prototypes · unavailable</summary><p>The legacy global namespace remains disabled. Use native tenant memories or governance review above.</p>{[...CRUD_LINKS.filter(link=>link.to!=='/memories'),...AI_LINKS,...CUSTOM_LINKS,...MEMORY_VIEW_LINKS,...OPS_LINKS].map(link=><NavLink key={link.to} to={link.to}>{link.label} · archived</NavLink>)}</details>
      <div className="sidebar-user">
        {user && (
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name || user.email}</div>
            <div className="sidebar-user-role">{user.role || 'user'}</div>
          </div>
        )}
        <button className="btn secondary sidebar-logout" onClick={logout}>Sign Out</button>
      </div>
    </nav>
  );
}
