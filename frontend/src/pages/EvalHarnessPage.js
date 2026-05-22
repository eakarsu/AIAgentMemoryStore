import React, { useEffect, useState } from 'react';
import { pass7, canWrite } from '../services/api';

export default function EvalHarnessPage() {
  const [pairs, setPairs] = useState([]);
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState({ query: '', expected_memory_id: '', expected_subject: '', notes: '' });
  const [label, setLabel] = useState('');
  const writer = canWrite();

  const load = async () => {
    setError(null);
    try {
      const [p, r] = await Promise.all([pass7.listEvalPairs(), pass7.listEvalRuns()]);
      setPairs(Array.isArray(p) ? p : []);
      setRuns(Array.isArray(r) ? r : []);
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!draft.query) return;
    try {
      await pass7.createEvalPair({
        query: draft.query,
        expected_memory_id: draft.expected_memory_id ? Number(draft.expected_memory_id) : null,
        expected_subject: draft.expected_subject || null,
        notes: draft.notes || null,
      });
      setDraft({ query: '', expected_memory_id: '', expected_subject: '', notes: '' });
      load();
    } catch (e) { setError(e.message); }
  };
  const remove = async (id) => { try { await pass7.deleteEvalPair(id); load(); } catch (e) { setError(e.message); } };
  const run = async () => {
    try { await pass7.runEvalPairs(label || undefined); setLabel(''); load(); } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Eval Harness</h2>
          <p>Golden (query → expected memory) pairs scored against retrieval after every prompt or embedding change.</p>
        </div>
        <div className="page-header-actions">
          <input placeholder="run label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
          {writer && <button className="btn ai" onClick={run}>Run Eval</button>}
        </div>
      </div>
      {error && <div className="ai-error">{error}</div>}

      {writer && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3>Add golden pair</h3>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Query</label>
              <textarea value={draft.query} onChange={(e) => setDraft({ ...draft, query: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Expected memory ID</label>
              <input value={draft.expected_memory_id} onChange={(e) => setDraft({ ...draft, expected_memory_id: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Expected subject</label>
              <input value={draft.expected_subject} onChange={(e) => setDraft({ ...draft, expected_subject: e.target.value })} />
            </div>
            <div className="form-group full-width">
              <label>Notes</label>
              <input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </div>
          </div>
          <button className="btn ai" onClick={create}>Add pair</button>
        </div>
      )}

      <div className="card">
        <h3>Golden pairs ({pairs.length})</h3>
        <table className="data-table">
          <thead><tr><th>ID</th><th>Query</th><th>Expected ID</th><th>Expected Subject</th><th>Notes</th><th /></tr></thead>
          <tbody>
            {pairs.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td><td>{p.query}</td><td>{p.expected_memory_id || '—'}</td>
                <td>{p.expected_subject || '—'}</td><td>{p.notes || '—'}</td>
                <td>{writer && <button className="btn secondary" onClick={() => remove(p.id)}>Delete</button>}</td>
              </tr>
            ))}
            {pairs.length === 0 && <tr><td colSpan={6} className="empty-state">No pairs yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Recent runs</h3>
        <table className="data-table">
          <thead><tr><th>#</th><th>Label</th><th>Passed</th><th>Failed</th><th>Total</th><th>When</th></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td><td>{r.run_label}</td><td>{r.passed}</td><td>{r.failed}</td><td>{r.total}</td><td>{r.created_at}</td>
              </tr>
            ))}
            {runs.length === 0 && <tr><td colSpan={6} className="empty-state">No runs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
