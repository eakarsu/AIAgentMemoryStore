import React, { useEffect, useState } from 'react';
import { pass7, canWrite } from '../services/api';

export default function AgentApiKeysPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState({ agent_id: '', name: '', scopes: 'read,write' });
  const [issued, setIssued] = useState(null);
  const writer = canWrite();

  const load = async () => {
    setError(null);
    try { setRows(await pass7.listApiKeys()); } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);

  const issue = async () => {
    if (!draft.agent_id) return;
    setError(null);
    try {
      const out = await pass7.issueApiKey(draft);
      setIssued(out);
      setDraft({ agent_id: '', name: '', scopes: 'read,write' });
      load();
    } catch (e) { setError(e.message); }
  };
  const revoke = async (id) => { try { await pass7.revokeApiKey(id); load(); } catch (e) { setError(e.message); } };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Agent API Keys</h2>
          <p>Issue per-agent API keys for machine callers. The plaintext key is shown ONCE at issue time.</p>
        </div>
      </div>
      {error && <div className="ai-error">{error}</div>}

      {writer && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3>Issue new key</h3>
          <div className="form-grid">
            <div className="form-group"><label>Agent ID</label><input value={draft.agent_id} onChange={(e) => setDraft({ ...draft, agent_id: e.target.value })} /></div>
            <div className="form-group"><label>Name</label><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div className="form-group"><label>Scopes</label><input value={draft.scopes} onChange={(e) => setDraft({ ...draft, scopes: e.target.value })} /></div>
          </div>
          <button className="btn ai" onClick={issue}>Issue</button>
          {issued && (
            <div className="card" style={{ marginTop: 12, background: 'rgba(34,197,94,0.08)' }}>
              <p><strong>Plaintext key (save now):</strong></p>
              <code style={{ display: 'block', padding: 12, background: '#0f172a' }}>{issued.plaintext_key}</code>
              <p style={{ color: '#f59e0b' }}>{issued.warning}</p>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead><tr><th>#</th><th>Agent</th><th>Name</th><th>Prefix</th><th>Scopes</th><th>Active</th><th>Last used</th><th>Created</th><th /></tr></thead>
          <tbody>
            {rows.map((k) => (
              <tr key={k.id}>
                <td>{k.id}</td><td>{k.agent_id}</td><td>{k.name}</td><td>{k.key_prefix}…</td>
                <td>{k.scopes}</td><td>{String(k.active)}</td><td>{k.last_used_at || '—'}</td><td>{k.created_at}</td>
                <td>{writer && k.active && <button className="btn secondary" onClick={() => revoke(k.id)}>Revoke</button>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} className="empty-state">No keys issued.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
