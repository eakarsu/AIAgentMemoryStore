const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const TOKEN_KEY = 'agent_memory_store_token';
const USER_KEY = 'agent_memory_store_user';

export { API_BASE };
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} };
export const getStoredUser = () => { try { const r = localStorage.getItem(USER_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
export const setStoredUser = (u) => { try { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); } catch {} };
export function logout() { setToken(null); setStoredUser(null); if (typeof window !== 'undefined') window.location.assign('/login'); }
export function getRole() { return (getStoredUser()?.role || 'viewer').toLowerCase(); }
export function canWrite() { return ['commander', 'analyst'].includes(getRole()); }
export function isCommander() { return getRole() === 'commander'; }

async function request(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (res.status === 401 && !['/auth/login','/auth/native-login'].includes(url)) { logout(); throw new Error('Session expired'); }
  const data = await res.json().catch(() => {throw new Error('The native API returned an unreadable response. Retry.');});
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function crud(base) {
  return {
    list: () => request(`/${base}`),
    get: (id) => request(`/${base}/${id}`),
    create: (data) => request(`/${base}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, d) => request(`/${base}/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id) => request(`/${base}/${id}`, { method: 'DELETE' }),
    bulkImport: (csv) => request(`/${base}/bulk-import`, { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: csv }),
    listAttachments: (id) => request(`/${base}/${id}/attachments`),
    uploadAttachment: async (id, file) => {
      const token = getToken();
      const form = new FormData(); form.append('file', file);
      const res = await fetch(`${API_BASE}/${base}/${id}/attachments`, {
        method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      return data;
    },
  };
}

export const login = async(email,password)=>{const result=await request('/auth/native-login',{method:'POST',body:JSON.stringify({email,password})});if(typeof result.token!=='string'||!result.token||!result.user||!Number.isSafeInteger(Number(result.user.id))||result.user.email?.toLowerCase()!==email.trim().toLowerCase())throw Error('Native sign-in returned an invalid identity. No session was saved.');let claims;try{claims=JSON.parse(atob(result.token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch(_){throw Error('Native sign-in token was malformed. No session was saved.');}if(Number(claims.id)!==Number(result.user.id)||claims.email!==result.user.email||claims.role!==result.user.role||claims.tenant_id!==result.user.tenant_id)throw Error('Native sign-in token did not match the returned account. No session was saved.');return result;};
export const getMe = () => request('/auth/native-me');
export const memoryGovernanceReview = (body, options = {}) => request('/ai/memory-governance-review', { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const getMemoryGovernanceHistory = (options = {}) => request('/ai/history', options);

export const memoriesApi = crud('memories');
export const subjectsApi = crud('subjects');
export const projectionsApi = crud('projections');
export const extractorsApi = crud('extractors');
export const retention_policiesApi = crud('retention-policies');

export const aiInsertMemory = (body, options = {}) => request('/ai/insert-memory', { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiRecall = (body, options = {}) => request('/ai/recall', { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiTimeTravel = (body, options = {}) => request('/ai/time-travel', { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiContradictionDetect = (body, options = {}) => request('/ai/contradiction-detect', { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiSummaryRollup = (body, options = {}) => request('/ai/summary-rollup', { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiExtractorTuner = (body, options = {}) => request('/ai/extractor-tuner', { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiEmbeddingQuality = (body, options = {}) => request('/ai/embedding-quality', { ...options, method: 'POST', body: JSON.stringify(body || {}) });

export const getAIHistory = (feature, limit = 25) => {
  const qs = new URLSearchParams({ ...(feature ? { feature } : {}), limit: String(limit) }).toString();
  return request(`/ai/history?${qs}`);
};
export const getAISamples = (feature) => {
  const qs = new URLSearchParams({ feature: feature || '' }).toString();
  return request(`/ai/samples?${qs}`);
};

export const getDashboardStats = () => request('/dashboard');

export const getNotifications = () => request('/notifications');
export const getUnreadNotifications = () => request('/notifications/unread');
export const markNotificationRead = (id) => request(`/notifications/${id}/read`, { method: 'POST' });
export const markAllNotificationsRead = () => request('/notifications/mark-all-read', { method: 'POST' });

export const webhooksApi = {
  list: () => request('/webhooks'),
  create: (d) => request('/webhooks', { method: 'POST', body: JSON.stringify(d) }),
  update: (id, d) => request(`/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  remove: (id) => request(`/webhooks/${id}`, { method: 'DELETE' }),
  test: (event, payload) => request('/webhooks/test', { method: 'POST', body: JSON.stringify({ event, payload }) }),
  deliveries: (id) => request(`/webhooks/${id}/deliveries`),
};

// ─── Pass 7 — new AI features ────────────────────────────────────────────────
export const aiConflictResolve         = (body, options = {}) => request('/ai/conflict-resolve',          { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiRelevanceScore          = (body, options = {}) => request('/ai/relevance-score',           { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiImportanceScore         = (body, options = {}) => request('/ai/importance-score',          { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiMemoryConsolidate       = (body, options = {}) => request('/ai/memory-consolidate',        { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiRagChat                 = (body, options = {}) => request('/ai/rag-chat',                  { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiPiiRedact               = (body, options = {}) => request('/ai/pii-redact',                { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiMemoryGraphExtract      = (body, options = {}) => request('/ai/memory-graph-extract',      { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiDecayPolicyRecommend    = (body, options = {}) => request('/ai/decay-policy-recommend',    { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiSemanticSearch          = (body, options = {}) => request('/ai/semantic-search',           { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiCrossAgentShareAdvisor  = (body, options = {}) => request('/ai/cross-agent-share-advisor', { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiRetentionDryRun         = (body, options = {}) => request('/ai/retention-dry-run',         { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiAutoMergeAdvisor        = (body, options = {}) => request('/ai/auto-merge-advisor',        { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiEmbedGenerate           = (body, options = {}) => request('/ai/embed-generate',            { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const memoryConflictResolve     = (body) => request('/memory-conflicts/resolve',     { method: 'POST', body: JSON.stringify(body || {}) });

// ─── Pass 7 — non-AI ops (pass7 router) ──────────────────────────────────────
export const pass7 = {
  // audit
  listMemoryReads: (memoryId) => request(`/pass7/memory-reads${memoryId ? `?memory_id=${memoryId}` : ''}`),
  logMemoryRead:   (body)     => request('/pass7/memory-reads', { method: 'POST', body: JSON.stringify(body || {}) }),
  memoryReadsSummary: ()      => request('/pass7/memory-reads/summary'),
  // provenance
  getProvenance:   (id)       => request(`/pass7/memories/${id}/provenance`),
  setProvenance:   (id, body) => request(`/pass7/memories/${id}/provenance`, { method: 'PUT', body: JSON.stringify(body || {}) }),
  // pin
  pin:             (id)       => request(`/pass7/memories/${id}/pin`,   { method: 'POST' }),
  unpin:           (id)       => request(`/pass7/memories/${id}/unpin`, { method: 'POST' }),
  listPinned:      ()         => request('/pass7/memories/pinned/list'),
  // importance + decay + namespace
  setImportance:   (id, score)    => request(`/pass7/memories/${id}/importance`, { method: 'PUT', body: JSON.stringify({ importance: score }) }),
  setDecayAt:      (id, ts)       => request(`/pass7/memories/${id}/decay-at`,   { method: 'PUT', body: JSON.stringify({ decay_at: ts }) }),
  setNamespace:    (id, ns)       => request(`/pass7/memories/${id}/namespace`,  { method: 'PUT', body: JSON.stringify({ namespace: ns }) }),
  byNamespace:     (ns)           => request(`/pass7/memories-by-namespace?namespace=${encodeURIComponent(ns)}`),
  // retention
  retentionDryRun: (params={})    => request(`/pass7/retention/dry-run?days=${params.days||30}${params.namespace?`&namespace=${encodeURIComponent(params.namespace)}`:''}`),
  tombstone:       (ids, reason)  => request('/pass7/retention/tombstone', { method: 'POST', body: JSON.stringify({ memory_ids: ids, reason }) }),
  restore:         (ids)          => request('/pass7/retention/restore',   { method: 'POST', body: JSON.stringify({ memory_ids: ids }) }),
  // relations
  listRelations:   (subject)      => request(`/pass7/relations${subject?`?subject=${encodeURIComponent(subject)}`:''}`),
  createRelation:  (body)         => request('/pass7/relations', { method: 'POST', body: JSON.stringify(body || {}) }),
  deleteRelation:  (id)           => request(`/pass7/relations/${id}`, { method: 'DELETE' }),
  relationsGraph:  (limit=80)     => request(`/pass7/relations/graph?limit=${limit}`),
  // api-keys
  listApiKeys:     ()             => request('/pass7/api-keys'),
  issueApiKey:     (body)         => request('/pass7/api-keys', { method: 'POST', body: JSON.stringify(body || {}) }),
  revokeApiKey:    (id)           => request(`/pass7/api-keys/${id}/revoke`, { method: 'POST' }),
  // acl
  listAcl:         ()             => request('/pass7/acl'),
  createAcl:       (body)         => request('/pass7/acl', { method: 'POST', body: JSON.stringify(body || {}) }),
  deleteAcl:       (id)           => request(`/pass7/acl/${id}`, { method: 'DELETE' }),
  // rate limits
  listRateLimits:  ()             => request('/pass7/rate-limits'),
  probeRateLimit:  (bucket)       => request('/pass7/rate-limits/probe', { method: 'POST', body: JSON.stringify({ bucket }) }),
  // eval
  listEvalPairs:   ()             => request('/pass7/eval-pairs'),
  createEvalPair:  (body)         => request('/pass7/eval-pairs', { method: 'POST', body: JSON.stringify(body || {}) }),
  updateEvalPair:  (id, body)     => request(`/pass7/eval-pairs/${id}`, { method: 'PUT', body: JSON.stringify(body || {}) }),
  deleteEvalPair:  (id)           => request(`/pass7/eval-pairs/${id}`, { method: 'DELETE' }),
  runEvalPairs:    (label)        => request('/pass7/eval-pairs/run', { method: 'POST', body: JSON.stringify({ label }) }),
  listEvalRuns:    ()             => request('/pass7/eval-runs'),
  getEvalRun:      (id)           => request(`/pass7/eval-runs/${id}`),
  // drift
  listDrift:       ()             => request('/pass7/drift'),
  sampleDrift:     ()             => request('/pass7/drift/sample', { method: 'POST' }),
  // cost
  cost:            ()             => request('/pass7/cost'),
  // replay
  replay:          (subject)      => request(`/pass7/replay/${encodeURIComponent(subject)}`),
  // jobs
  listJobs:        ()             => request('/pass7/jobs'),
  createJob:       (body)         => request('/pass7/jobs', { method: 'POST', body: JSON.stringify(body || {}) }),
  runJob:          (id)           => request(`/pass7/jobs/${id}/run`, { method: 'POST' }),
  // consolidation / share preview
  consolidationPreview: (body)    => request('/pass7/consolidation/preview', { method: 'POST', body: JSON.stringify(body || {}) }),
  crossAgentSharePreview: (body)  => request('/pass7/cross-agent-share/preview', { method: 'POST', body: JSON.stringify(body || {}) }),
};
