import React, { useEffect, useState } from 'react';
import { pass7 } from '../services/api';

export default function DriftMonitorPage() {
  const [signals, setSignals] = useState([]);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    try { setSignals(await pass7.listDrift()); } catch (e) { setError(e.message); }
  };
  const sample = async () => {
    setError(null);
    try { await pass7.sampleDrift(); load(); } catch (e) { setError(e.message); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Drift Monitor</h2>
          <p>Embedding quality + contradiction-rate trend signals. Sample pulls from the latest AI results.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn ai" onClick={sample}>Sample now</button>
          <button className="btn secondary" onClick={load}>Refresh</button>
        </div>
      </div>
      {error && <div className="ai-error">{error}</div>}
      <div className="card">
        <table className="data-table">
          <thead><tr><th>#</th><th>Signal</th><th>Score</th><th>Threshold</th><th>Triggered</th><th>When</th></tr></thead>
          <tbody>
            {signals.map((s) => (
              <tr key={s.id} style={{ background: s.triggered ? 'rgba(245,158,11,0.12)' : 'transparent' }}>
                <td>{s.id}</td><td>{s.signal_type}</td><td>{Number(s.score).toFixed(3)}</td>
                <td>{s.threshold}</td><td>{String(s.triggered)}</td><td>{s.created_at}</td>
              </tr>
            ))}
            {signals.length === 0 && <tr><td colSpan={6} className="empty-state">No signals yet — click "Sample now".</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
