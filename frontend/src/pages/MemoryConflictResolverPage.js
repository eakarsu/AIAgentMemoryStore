import React, { useState } from 'react';
import { memoryConflictResolve } from '../services/api';

const starter = JSON.stringify({
  memories: [
    { id: 'mem_102', subject: 'Acme renewal', statement: 'Budget approved for Q3 expansion', confidence: 0.78, source_trust: 0.84, freshness_days: 11, usage_count: 8, contradictions: 1 },
    { id: 'mem_118', subject: 'Acme renewal', statement: 'Expansion budget delayed until next year', confidence: 0.62, source_trust: 0.56, freshness_days: 4, usage_count: 2, contradictions: 2 }
  ]
}, null, 2);

export default function MemoryConflictResolverPage() {
  const [payload, setPayload] = useState(starter);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const run = async () => {
    setError('');
    try {
      setResult(await memoryConflictResolve(JSON.parse(payload)));
    } catch (err) {
      setError(err.message || 'Conflict resolution failed');
    }
  };

  return (
    <div className="page">
      <div className="page-header"><h1>Memory Conflict Resolver</h1><p>Adjudicate contradictory agent memories using confidence, freshness, trust, usage, and contradiction count.</p></div>
      <div className="grid two">
        <section className="card">
          <textarea className="input mono" rows={18} value={payload} onChange={(event) => setPayload(event.target.value)} />
          <button className="btn primary" onClick={run}>Resolve Conflict</button>
          {error && <p className="error">{error}</p>}
        </section>
        <section className="card">
          {!result ? <p className="muted">Resolution appears here.</p> : (
            <>
              <div className="metric-row">
                <div><span>Preferred</span><strong>{result.preferredMemoryId}</strong></div>
                <div><span>Mode</span><strong>{result.resolutionMode}</strong></div>
                <div><span>Review</span><strong>{result.reviewRequired ? 'Yes' : 'No'}</strong></div>
              </div>
              {result.items.map((item) => (
                <div className="list-card" key={item.id}>
                  <div className="row between"><strong>{item.id}</strong><span>{item.score}</span></div>
                  <p>{item.statement}</p>
                  <p className="muted">{item.subject} · {item.recommendation}</p>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
