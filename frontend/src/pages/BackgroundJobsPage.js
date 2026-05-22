import React, { useEffect, useState } from 'react';
import { pass7, canWrite } from '../services/api';

const JOB_TYPES = ['consolidation', 'decay_sweep', 'reembedding', 'drift_scan', 'eval_run'];

export default function BackgroundJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [jobType, setJobType] = useState('decay_sweep');
  const writer = canWrite();

  const load = async () => {
    setError(null);
    try { setJobs(await pass7.listJobs()); } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);

  const enqueue = async () => {
    try { await pass7.createJob({ job_type: jobType }); load(); } catch (e) { setError(e.message); }
  };
  const run = async (id) => {
    try { await pass7.runJob(id); load(); } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Background Jobs</h2>
          <p>Consolidation, decay sweep, re-embedding, drift scan, eval run. All produce advisory output by default.</p>
        </div>
        {writer && (
          <div className="page-header-actions">
            <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
              {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button className="btn ai" onClick={enqueue}>Enqueue</button>
          </div>
        )}
      </div>
      {error && <div className="ai-error">{error}</div>}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Type</th><th>Status</th><th>Created</th><th>Started</th><th>Finished</th><th>Result</th><th /></tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>{j.id}</td><td>{j.job_type}</td><td>{j.status}</td>
                <td>{j.created_at}</td><td>{j.started_at || '—'}</td><td>{j.finished_at || '—'}</td>
                <td style={{ maxWidth: 350, fontSize: 12 }}>
                  <details><summary>view</summary><pre>{JSON.stringify(j.result, null, 2)}</pre></details>
                </td>
                <td>{writer && j.status === 'pending' && <button className="btn secondary" onClick={() => run(j.id)}>Run</button>}</td>
              </tr>
            ))}
            {jobs.length === 0 && <tr><td colSpan={8} className="empty-state">No jobs queued.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
