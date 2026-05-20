import React, { useEffect, useState } from 'react';
import { API_BASE, getToken } from '../services/api';

export default function MemoryExporter() {
  const [namespaces, setNamespaces] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/custom-views/namespaces`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data.namespaces) ? data.namespaces : [];
        setNamespaces(list);
        if (list[0]) setSelected(list[0].name);
      })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);

  const fetchSnapshot = async () => {
    if (!selected) return null;
    const r = await fetch(`${API_BASE}/custom-views/memory-export?namespace=${encodeURIComponent(selected)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!r.ok) {
      const t = await r.json().catch(() => ({}));
      throw new Error(t.error || `HTTP ${r.status}`);
    }
    return r.json();
  };

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const snap = await fetchSnapshot();
      setPreview(snap);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = preview || (await fetchSnapshot());
      const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memory-snapshot-${selected}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (!preview) setPreview(snap);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="card" data-testid="memory-exporter-card">
      <h3 style={{ margin: '0 0 12px', color: '#cbd5e1' }}>Memory Export · JSON Snapshot</h3>
      <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 0 }}>
        Pick a namespace, preview the records, then download a portable JSON snapshot.
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ color: '#cbd5e1', fontSize: 13 }}>Namespace</label>
        <select
          value={selected}
          onChange={(e) => { setSelected(e.target.value); setPreview(null); }}
          style={{ padding: '6px 10px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6 }}
        >
          {namespaces.map((n) => (
            <option key={n.id} value={n.name}>
              {n.name} · dim {n.vector_dim} · {n.retention_days}d
            </option>
          ))}
        </select>
        <button className="btn secondary" onClick={handlePreview} disabled={!selected || loading}>
          {loading ? 'Working…' : 'Preview'}
        </button>
        <button className="btn ai" onClick={handleDownload} disabled={!selected || loading} data-testid="export-download-btn">
          Download JSON
        </button>
      </div>

      {error && <div className="ai-error" style={{ marginTop: 10 }}>{error}</div>}

      {preview && (
        <div style={{ marginTop: 14 }}>
          <div style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 6 }}>
            Snapshot for <strong>{preview.namespace?.name}</strong> · {preview.count} memories · exported {new Date(preview.exported_at).toLocaleString()}
          </div>
          <pre style={{ maxHeight: 280, overflow: 'auto', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: 12, fontSize: 12, color: '#e2e8f0' }}>
{JSON.stringify(preview, null, 2).slice(0, 4000)}{JSON.stringify(preview).length > 4000 ? '\n…(truncated in preview, full content downloaded)' : ''}
          </pre>
        </div>
      )}
    </div>
  );
}
