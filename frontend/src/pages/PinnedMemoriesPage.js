import React, { useEffect, useState } from 'react';
import { pass7, canWrite } from '../services/api';

export default function PinnedMemoriesPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [pinId, setPinId] = useState('');
  const writer = canWrite();

  const load = async () => {
    setError(null);
    try { setRows(await pass7.listPinned()); } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);

  const pin = async () => {
    if (!pinId) return;
    setError(null);
    try { await pass7.pin(Number(pinId)); setPinId(''); load(); } catch (e) { setError(e.message); }
  };
  const unpin = async (id) => {
    setError(null);
    try { await pass7.unpin(id); load(); } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Pinned Memories</h2>
          <p>High-value memories immune from decay.</p>
        </div>
        {writer && (
          <div className="page-header-actions">
            <input placeholder="memory id" value={pinId} onChange={(e) => setPinId(e.target.value)} />
            <button className="btn ai" onClick={pin}>Pin</button>
          </div>
        )}
      </div>
      {error && <div className="ai-error">{error}</div>}
      <div className="card">
        <table className="data-table">
          <thead><tr><th>ID</th><th>Subject</th><th>Event</th><th>Tags</th><th>Importance</th><th /></tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td>{m.id}</td><td>{m.subject}</td>
                <td style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.event_text}</td>
                <td>{m.tags}</td><td>{m.importance}</td>
                <td>{writer && <button className="btn secondary" onClick={() => unpin(m.id)}>Unpin</button>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="empty-state">Nothing pinned.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
