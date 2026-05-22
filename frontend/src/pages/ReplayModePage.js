import React, { useState } from 'react';
import { pass7 } from '../services/api';

export default function ReplayModePage() {
  const [subject, setSubject] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!subject) return;
    setError(null); setData(null);
    try { setData(await pass7.replay(subject)); } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Replay Mode</h2>
          <p>Stream a subject's memories in temporal order for offline agent fine-tuning or audit.</p>
        </div>
        <div className="page-header-actions">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="subject" />
          <button className="btn ai" onClick={load}>Replay</button>
        </div>
      </div>
      {error && <div className="ai-error">{error}</div>}
      {data && (
        <div className="card">
          <p>{data.subject} · {data.count} frames</p>
          <ol>
            {data.frames.map((f) => (
              <li key={f.id} style={{ marginBottom: 8 }}>
                <strong>{f.ts}</strong> · #{f.id} · {f.namespace} · imp={f.importance}{f.pinned ? ' · pinned' : ''}
                <div style={{ color: '#cbd5e1' }}>{f.event_text}</div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
