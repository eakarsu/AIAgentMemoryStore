import React, { useEffect, useState } from 'react';
import { pass7, canWrite } from '../services/api';

export default function AclPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState({ scope: 'memory', scope_ref: '', grantee: '', permission: 'read' });
  const writer = canWrite();

  const load = async () => {
    setError(null);
    try { setRows(await pass7.listAcl()); } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!draft.scope_ref || !draft.grantee) return;
    try { await pass7.createAcl(draft); load(); } catch (e) { setError(e.message); }
  };
  const remove = async (id) => { try { await pass7.deleteAcl(id); load(); } catch (e) { setError(e.message); } };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Memory ACL</h2>
          <p>Per-memory or per-namespace read/write grants beyond global writer role. Cross-agent sharing is OFF by default.</p>
        </div>
      </div>
      {error && <div className="ai-error">{error}</div>}

      {writer && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3>Grant access</h3>
          <div className="form-grid">
            <div className="form-group"><label>Scope</label>
              <select value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value })}>
                <option value="memory">memory</option><option value="namespace">namespace</option>
              </select>
            </div>
            <div className="form-group"><label>Scope ref (id or namespace)</label><input value={draft.scope_ref} onChange={(e) => setDraft({ ...draft, scope_ref: e.target.value })} /></div>
            <div className="form-group"><label>Grantee (email or agent_id)</label><input value={draft.grantee} onChange={(e) => setDraft({ ...draft, grantee: e.target.value })} /></div>
            <div className="form-group"><label>Permission</label>
              <select value={draft.permission} onChange={(e) => setDraft({ ...draft, permission: e.target.value })}>
                <option value="read">read</option><option value="write">write</option>
              </select>
            </div>
          </div>
          <button className="btn ai" onClick={create}>Grant</button>
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead><tr><th>#</th><th>Scope</th><th>Ref</th><th>Grantee</th><th>Permission</th><th>Granted by</th><th>When</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td><td>{r.scope}</td><td>{r.scope_ref}</td><td>{r.grantee}</td>
                <td>{r.permission}</td><td>{r.granted_by}</td><td>{r.created_at}</td>
                <td>{writer && <button className="btn secondary" onClick={() => remove(r.id)}>Revoke</button>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="empty-state">No grants.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
