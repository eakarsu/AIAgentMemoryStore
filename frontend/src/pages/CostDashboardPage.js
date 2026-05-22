import React, { useEffect, useState } from 'react';
import { pass7 } from '../services/api';

export default function CostDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    pass7.cost().then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Cost Dashboard</h2>
          <p>Estimated token spend per AI feature, derived from ai_results when usage is logged.</p>
        </div>
      </div>
      {error && <div className="ai-error">{error}</div>}
      {data && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <p><strong>Total calls:</strong> {data.total_calls} · <strong>Estimated total:</strong> ${data.total_cost_usd}</p>
            <p style={{ color: '#94a3b8' }}>{data.note}</p>
          </div>
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Feature</th><th>Calls</th><th>Prompt tok</th><th>Completion tok</th><th>Est. cost (USD)</th><th>Last call</th>
                </tr>
              </thead>
              <tbody>
                {data.by_feature.map((row) => (
                  <tr key={row.feature}>
                    <td>{row.feature}</td><td>{row.calls}</td><td>{row.prompt_tokens}</td>
                    <td>{row.completion_tokens}</td><td>${row.est_cost_usd}</td><td>{row.last_call}</td>
                  </tr>
                ))}
                {data.by_feature.length === 0 && <tr><td colSpan={6} className="empty-state">No AI calls recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
