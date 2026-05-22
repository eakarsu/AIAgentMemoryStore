import React, { useState } from 'react';
import { pass7, canWrite } from '../services/api';

export default function RetentionDryRunPage() {
  const [days, setDays] = useState(30);
  const [ns, setNs] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState({});
  const writer = canWrite();

  const run = async () => {
    setError(null); setResult(null);
    try { setResult(await pass7.retentionDryRun({ days, namespace: ns || undefined })); }
    catch (e) { setError(e.message); }
  };
  const tombstoneSelected = async () => {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => Number(k));
    if (!ids.length) return;
    if (!window.confirm(`Soft-delete (tombstone) ${ids.length} memories? They can be restored.`)) return;
    try {
      const out = await pass7.tombstone(ids, `dry-run sweep ${days}d`);
      setResult({ ...(result || {}), tombstoned: out });
      setSelected({});
    } catch (e) { setError(e.message); }
  };

  const candidates = result?.candidates || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Retention · Dry-Run</h2>
          <p>Advisory only. NO rows are deleted by this page. Tombstone is soft-delete with restore window.</p>
        </div>
        <div className="page-header-actions">
          <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value) || 30)} style={{ width: 90 }} placeholder="days" />
          <input value={ns} onChange={(e) => setNs(e.target.value)} placeholder="namespace (optional)" />
          <button className="btn ai" onClick={run}>Run Dry-Run</button>
        </div>
      </div>

      {error && <div className="ai-error">{error}</div>}

      {result && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p><strong>Projected deletions:</strong> {result.projected_deletions}</p>
          <p style={{ color: '#f59e0b' }}>{result.disclaimer}</p>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th />
                <th>ID</th><th>Subject</th><th>Namespace</th><th>Created</th><th>Pinned</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((m) => (
                <tr key={m.id}>
                  <td>
                    <input type="checkbox" checked={!!selected[m.id]} onChange={(e) => setSelected((s) => ({ ...s, [m.id]: e.target.checked }))} />
                  </td>
                  <td>{m.id}</td><td>{m.subject}</td><td>{m.namespace}</td><td>{m.created_at}</td><td>{String(m.pinned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {writer && (
            <div style={{ marginTop: 12 }}>
              <button className="btn secondary" onClick={tombstoneSelected}>Tombstone Selected (soft-delete)</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
