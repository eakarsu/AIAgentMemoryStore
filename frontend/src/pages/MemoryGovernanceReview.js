import React, { useCallback, useEffect, useRef, useState } from 'react';
import AIResultView from '../components/AIResultView';
import RecordDialog from '../components/RecordDialog';
import useCancelableAI from '../components/useCancelableAI';
import { getMemoryGovernanceHistory, memoryGovernanceReview } from '../services/api';
import './MemoryGovernanceReview.css';

const FEATURE = 'agent-memory-governance-review';
export const GOVERNANCE_EXAMPLES = [
  { label: 'Retention review', prompt: 'Fictional planning example: a support assistant stores short customer preferences and task summaries for 30 days. Review a proposed retention policy with an optional 7-day grace period, a user-requested deletion process, and a weekly human review. Assume no production memory records, approvals, or signed consent have been supplied. Identify missing source evidence, privacy risks, and practical review questions. Keep recommendations advisory; do not claim to delete or change stored memory. Present an executive summary, risk table, and proposed next steps in readable prose.' },
  { label: 'Sharing boundaries', prompt: 'Fictional planning example: two assistants may need to share a user-approved task summary while keeping personal identifiers private. Optional context: the summary would expire after 24 hours, cross-tenant sharing is prohibited, and the proposed field allowlist is task type and deadline. No actual user approval, access grant, or source record has been supplied. Review the proposed boundaries and list the evidence needed before any real sharing. Keep all permissions subject to existing authorization and human review. Present a concise summary, safeguards, and unresolved questions in readable prose.' },
  { label: 'Conflicting memories', prompt: 'Fictional planning example: an assistant may have two contradictory preference summaries. Optional context: one summary is older, neither source has been verified, and an empty confidence score must remain unknown. Propose an advisory workflow for source comparison, freshness checks, escalation, and asking the user for clarification. No actual source record, verified preference, or completed correction is supplied. Do not choose a factual winner or claim to merge memories. Present a summary, evidence checklist, and review steps in readable prose.' },
];

function Receipt({ report }) {
  return <dl className="memory-review-receipt"><div><dt>Saved report</dt><dd>{report.interactionId ?? report.id ?? 'Not saved'}</dd></div><div><dt>Model</dt><dd>{report.model || 'Not provided'}</dd></div><div><dt>Provider request</dt><dd>{report.providerReceipt?.requestId || 'Not provided'}</dd></div>{report.createdAt && <div><dt>Created</dt><dd>{new Date(report.createdAt).toLocaleString()}</dd></div>}</dl>;
}

export default function MemoryGovernanceReview() {
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState([]), [historyLoading, setHistoryLoading] = useState(true), [historyError, setHistoryError] = useState('');
  const [selected, setSelected] = useState(null), [prepared, setPrepared] = useState('');
  const historyRequest = useRef(null), submitLock = useRef(false), input = useRef(null);
  const review = useCancelableAI();
  const loadHistory = useCallback(async () => {
    historyRequest.current?.abort();
    const controller = new AbortController(); historyRequest.current = controller;
    setHistoryLoading(true); setHistoryError('');
    try {
      const value = await getMemoryGovernanceHistory({ signal: controller.signal });
      if (!Array.isArray(value.history)) throw new Error('Saved-report history has an unexpected response. Please retry.');
      if (!controller.signal.aborted && historyRequest.current === controller) setHistory(value.history.filter(item => item.feature === FEATURE));
    } catch (error) { if (!controller.signal.aborted && historyRequest.current === controller) setHistoryError(error.message || 'Saved reports could not be loaded'); }
    finally { if (historyRequest.current === controller) { historyRequest.current = null; setHistoryLoading(false); } }
  }, []);
  useEffect(() => { void loadHistory(); return () => { historyRequest.current?.abort(); }; }, [loadHistory]);
  const generate = async event => {
    event.preventDefault();
    if (submitLock.current || !prompt.trim()) return;
    submitLock.current = true; setPrepared('');
    try {
      const result = await review.run(options => memoryGovernanceReview({ prompt: prompt.trim() }, options));
      if (result) void loadHistory();
    } finally { submitLock.current = false; }
  };
  const prepare = example => { setPrompt(example.prompt); setPrepared('Every editable request field is filled. Review the prompt, then choose Generate with OpenRouter.'); };
  const editInputs = () => {
    const original = selected.input?.prompt ?? selected.input?.question ?? selected.input?.message ?? selected.input?.context;
    setPrompt(typeof original === 'string' ? original : '');
    setSelected(null); setPrepared('Saved inputs loaded. A new generation creates a separate report; the original provider receipt is retained.');
    setTimeout(() => input.current?.focus(), 0);
  };
  return <section className="memory-review" aria-labelledby="memory-review-title">
    <header className="page-header"><div><h2 id="memory-review-title">Memory governance review</h2><p>Review memory policies with the configured OpenRouter model.</p></div></header>
    <p className="sr-notice">This is an advisory review of the prompt you supply. It does not insert, share, consolidate, delete, or approve memory records.</p>
    <form className="card" onSubmit={generate} aria-label="Memory governance request">
      <div className="sr-presets"><div><strong>Demo AI · Fill the entire request</strong><p>Each example fills the complete prompt, including its optional planning context. Examples are fictional; replace them with information you are authorized to submit.</p></div><div className="sr-actions">{GOVERNANCE_EXAMPLES.map(example => <button type="button" className="btn secondary" key={example.label} disabled={review.loading} onClick={() => prepare(example)}>Demo AI · {example.label}</button>)}</div></div>
      <label htmlFor="memory-review-prompt">Review prompt</label>
      <textarea ref={input} id="memory-review-prompt" name="prompt" required maxLength={20000} rows={11} value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="Describe the policy or workflow and any optional context to review." disabled={review.loading} />
      {prepared && <p role="status" className="sr-notice">{prepared}</p>}
      <div className="sr-actions"><button type="submit" className="btn ai" disabled={review.loading || !prompt.trim()}>{review.loading ? 'Generating…' : 'Generate with OpenRouter'}</button><button type="button" className="btn secondary" disabled={!review.loading} onClick={review.cancel}>Cancel generation</button></div>
      {review.notice && <p role="status" className="sr-notice">{review.notice}</p>}
      <AIResultView loading={review.loading} error={review.error} />
    </form>
    {review.result && <><AIResultView result={review.result.content} model={review.result.model} title="Memory governance report" /><Receipt report={review.result} /></>}
    <section className="card" aria-labelledby="memory-review-history"><div className="memory-review-history-head"><h3 id="memory-review-history">Your saved reports</h3><button type="button" className="btn secondary" disabled={historyLoading} onClick={() => void loadHistory()}>Refresh</button></div>
      <p>Open a report centrally to read or copy it, or reload its inputs for a separate review. Original provider receipts are retained.</p>
      {historyLoading ? <p role="status">Loading your saved reports…</p> : historyError ? <div className="sr-alert" role="alert">{historyError} <button type="button" className="btn secondary" onClick={() => void loadHistory()}>Retry</button></div> : !history.length ? <p>No saved governance reports yet.</p> : <ul className="memory-review-history-list">{history.map(item => <li key={item.id}><button type="button" className="btn secondary" onClick={() => setSelected(item)}>Open report #{item.id}</button><span>{new Date(item.createdAt).toLocaleString()} · {item.model}</span></li>)}</ul>}
    </section>
    {selected && <RecordDialog title="Saved memory governance report" onClose={() => setSelected(null)}><Receipt report={selected} /><AIResultView result={selected.output?.content ?? selected.output} model={selected.model} title="Memory governance report" /><div className="sr-actions"><button type="button" className="btn" disabled={review.loading} onClick={editInputs}>Edit inputs</button><button type="button" className="btn danger" disabled title="The native API retains immutable provider receipts">Delete · retained receipt</button></div><p className="sr-notice">Edit inputs prepares a new request. This native workflow does not offer a report-delete endpoint; its saved provider receipt is retained.</p></RecordDialog>}
  </section>;
}
