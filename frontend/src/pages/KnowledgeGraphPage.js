import React, { useEffect, useState } from 'react';
import { pass7, canWrite } from '../services/api';

export default function KnowledgeGraphPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState({ subject_a: '', relation: '', subject_b: '', memory_id: '', confidence: 0.8 });
  const writer = canWrite();

  const load = async () => {
    setError(null);
    try { setRows(await pass7.listRelations()); } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!draft.subject_a || !draft.relation || !draft.subject_b) return;
    try {
      await pass7.createRelation({
        ...draft,
        memory_id: draft.memory_id ? Number(draft.memory_id) : null,
        confidence: Number(draft.confidence) || 0.5,
      });
      setDraft({ subject_a: '', relation: '', subject_b: '', memory_id: '', confidence: 0.8 });
      load();
    } catch (e) { setError(e.message); }
  };
  const remove = async (id) => { try { await pass7.deleteRelation(id); load(); } catch (e) { setError(e.message); } };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Knowledge Graph · Relations</h2>
          <p>Entities and relations extracted (or hand-curated) on top of memories.</p>
        </div>
      </div>
      {error && <div className="ai-error">{error}</div>}

      {writer && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3>Add relation</h3>
          <div className="form-grid">
            <div className="form-group"><label>Subject A</label><input value={draft.subject_a} onChange={(e) => setDraft({ ...draft, subject_a: e.target.value })} /></div>
            <div className="form-group"><label>Relation</label><input value={draft.relation} onChange={(e) => setDraft({ ...draft, relation: e.target.value })} placeholder="owns / depends_on / mentions" /></div>
            <div className="form-group"><label>Subject B</label><input value={draft.subject_b} onChange={(e) => setDraft({ ...draft, subject_b: e.target.value })} /></div>
            <div className="form-group"><label>Memory ID</label><input value={draft.memory_id} onChange={(e) => setDraft({ ...draft, memory_id: e.target.value })} /></div>
            <div className="form-group"><label>Confidence (0–1)</label><input type="number" step="0.05" value={draft.confidence} onChange={(e) => setDraft({ ...draft, confidence: e.target.value })} /></div>
          </div>
          <button className="btn ai" onClick={create}>Add</button>
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead><tr><th>#</th><th>A</th><th>relation</th><th>B</th><th>memory</th><th>conf</th><th>when</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td><td>{r.subject_a}</td><td>{r.relation}</td><td>{r.subject_b}</td>
                <td>{r.memory_id || '—'}</td><td>{r.confidence}</td><td>{r.created_at}</td>
                <td>{writer && <button className="btn secondary" onClick={() => remove(r.id)}>Delete</button>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="empty-state">No relations.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
