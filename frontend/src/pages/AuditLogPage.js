import React, { useEffect, useState } from 'react';
import { pass7 } from '../services/api';

export default function AuditLogPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState([]);
  const [error, setError] = useState(null);
  const [memId, setMemId] = useState('');

  const load = async () => {
    setError(null);
    try {
      const [reads, sum] = await Promise.all([
        pass7.listMemoryReads(memId || undefined),
        pass7.memoryReadsSummary(),
      ]);
      setRows(Array.isArray(reads) ? reads : []);
      setSummary(Array.isArray(sum) ? sum : []);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Audit Log · Memory Reads</h2>
          <p>Who read what, when. Compliance and retention evidence.</p>
        </div>
        <div className="page-header-actions">
          <input placeholder="filter by memory_id" value={memId} onChange={(e) => setMemId(e.target.value)} />
          <button className="btn ai" onClick={load}>Refresh</button>
        </div>
      </div>
      {error && <div className="ai-error">{error}</div>}

      <div className="card">
        <h3>By reader</h3>
        <table className="data-table">
          <thead><tr><th>Reader</th><th>Reads</th><th>Last read</th></tr></thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.reader}><td>{s.reader}</td><td>{s.reads}</td><td>{s.last_read}</td></tr>
            ))}
            {summary.length === 0 && <tr><td colSpan={3} className="empty-state">No reads logged yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Recent reads</h3>
        <table className="data-table">
          <thead><tr><th>#</th><th>Memory</th><th>Reader</th><th>Agent</th><th>Query</th><th>When</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td><td>{r.memory_id}</td><td>{r.reader}</td>
                <td>{r.agent_id || '—'}</td><td>{r.query || '—'}</td>
                <td>{r.created_at}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="empty-state">No rows.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
