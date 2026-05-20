import React, { useCallback, useEffect, useState } from 'react';
import { API_BASE, getToken } from '../services/api';

const empty = { name: '', vector_dim: 1536, retention_days: 30, description: '' };

export default function NamespaceEditor() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/custom-views/namespaces`, { headers: authHeaders() });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setRows(Array.isArray(d.namespaces) ? d.namespaces : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reset = () => { setForm(empty); setEditingId(null); };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        vector_dim: Number(form.vector_dim) || 1536,
        retention_days: Number(form.retention_days) || 30,
        description: form.description || '',
      };
      if (!payload.name) throw new Error('Name required');
      const url = editingId
        ? `${API_BASE}/custom-views/namespaces/${editingId}`
        : `${API_BASE}/custom-views/namespaces`;
      const method = editingId ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      reset();
      await load();
    } catch (err) { setError(err.message); }
  };

  const startEdit = (ns) => {
    setEditingId(ns.id);
    setForm({
      name: ns.name || '',
      vector_dim: ns.vector_dim || 1536,
      retention_days: ns.retention_days || 30,
      description: ns.description || '',
    });
  };

  const remove = async (id) => {
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/custom-views/namespaces/${id}`, { method: 'DELETE', headers: authHeaders() });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      if (editingId === id) reset();
      await load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="card" data-testid="namespace-editor-card">
      <h3 style={{ margin: '0 0 12px', color: '#cbd5e1' }}>Namespace Editor</h3>
      <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 0 }}>
        Manage memory namespaces (name, vector dim, retention).
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 8, alignItems: 'end', marginBottom: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. long-term"
            style={{ width: '100%', padding: '6px 8px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Vector dim</label>
          <input
            type="number"
            value={form.vector_dim}
            onChange={(e) => setForm({ ...form, vector_dim: e.target.value })}
            style={{ width: '100%', padding: '6px 8px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Retention (days)</label>
          <input
            type="number"
            value={form.retention_days}
            onChange={(e) => setForm({ ...form, retention_days: e.target.value })}
            style={{ width: '100%', padding: '6px 8px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Description</label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="optional"
            style={{ width: '100%', padding: '6px 8px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="submit" className="btn ai">{editingId ? 'Update' : 'Create'}</button>
          {editingId && <button type="button" className="btn secondary" onClick={reset}>Cancel</button>}
        </div>
      </form>

      {error && <div className="ai-error" style={{ marginBottom: 10 }}>{error}</div>}
      {loading && <div className="empty-state">Loading namespaces…</div>}

      {!loading && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #1e293b' }}>
                <th style={{ padding: '8px 6px' }}>ID</th>
                <th style={{ padding: '8px 6px' }}>Name</th>
                <th style={{ padding: '8px 6px' }}>Vector dim</th>
                <th style={{ padding: '8px 6px' }}>Retention (days)</th>
                <th style={{ padding: '8px 6px' }}>Description</th>
                <th style={{ padding: '8px 6px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((ns) => (
                <tr key={ns.id} style={{ borderBottom: '1px solid #1e293b', color: '#e2e8f0' }}>
                  <td style={{ padding: '8px 6px', color: '#64748b' }}>{ns.id}</td>
                  <td style={{ padding: '8px 6px', fontWeight: 600 }}>{ns.name}</td>
                  <td style={{ padding: '8px 6px' }}>{ns.vector_dim}</td>
                  <td style={{ padding: '8px 6px' }}>{ns.retention_days}</td>
                  <td style={{ padding: '8px 6px', color: '#94a3b8' }}>{ns.description}</td>
                  <td style={{ padding: '8px 6px', display: 'flex', gap: 6 }}>
                    <button className="btn secondary" onClick={() => startEdit(ns)}>Edit</button>
                    <button className="btn secondary" onClick={() => remove(ns.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="empty-state" style={{ padding: 16 }}>No namespaces yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
