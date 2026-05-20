import React, { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { API_BASE, getToken } from '../services/api';

export default function RetrievalQualityChart() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(14);
  const [k, setK] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/custom-views/retrieval-quality?days=${days}&k=${k}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e.message || 'Failed to load'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days, k]);

  const series = useMemo(() => (data && Array.isArray(data.series) ? data.series : []), [data]);
  const precisionKey = `precision_at_${k}`;
  const avgPrecision = useMemo(() => {
    if (!series.length) return 0;
    const sum = series.reduce((acc, row) => acc + (row[precisionKey] || 0), 0);
    return sum / series.length;
  }, [series, precisionKey]);

  return (
    <div className="card" data-testid="retrieval-quality-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, color: '#cbd5e1' }}>Retrieval Quality</h3>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>
            Precision@{k} · Recall · MRR over the last {days} days
            {data ? ` · ${data.total_memories} memories indexed` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ color: '#94a3b8', fontSize: 12 }}>k</label>
          <input
            type="number"
            min={1}
            max={20}
            value={k}
            onChange={(e) => setK(Math.max(1, Math.min(20, Number(e.target.value) || 5)))}
            style={{ width: 60, padding: '6px 8px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6 }}
          />
          <label style={{ color: '#94a3b8', fontSize: 12 }}>days</label>
          <input
            type="number"
            min={5}
            max={60}
            value={days}
            onChange={(e) => setDays(Math.max(5, Math.min(60, Number(e.target.value) || 14)))}
            style={{ width: 70, padding: '6px 8px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6 }}
          />
        </div>
      </div>

      {loading && <div className="empty-state">Loading retrieval metrics…</div>}
      {error && <div className="ai-error">{error}</div>}

      {!loading && !error && (
        <>
          <div style={{ display: 'flex', gap: 14, marginBottom: 10, color: '#cbd5e1', fontSize: 13 }}>
            <span>Avg precision@{k}: <strong style={{ color: '#22d3ee' }}>{avgPrecision.toFixed(3)}</strong></span>
            <span>Data points: <strong>{series.length}</strong></span>
          </div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 12, right: 24, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 1]} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }} />
                <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                <Line type="monotone" dataKey={precisionKey} stroke="#22d3ee" strokeWidth={2} dot={false} name={`precision@${k}`} />
                <Line type="monotone" dataKey="recall" stroke="#a78bfa" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="mrr" stroke="#facc15" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
