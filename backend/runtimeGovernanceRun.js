"use strict";

const crypto = require('node:crypto');
const { Client } = require('pg');

const failure = (status, message) => Object.assign(new Error(message), { status });

// This handler uses the existing runtime sessions and immutable provider receipts.
function createRuntimeGovernanceRun({ databaseUrl, actor, feature, projectName, systemPrompt, env = process.env, fetchImpl = (...args) => fetch(...args), timeoutMs = 110000 }) {
  return async function runtimeGovernanceRun(req, res) {
    let timer, providerResponse, saveClient, endClient;
    let timedOut = false;
    const controller = new AbortController();
    const interrupted = () => {
      if (!res.writableEnded) controller.abort();
    };
    const ensureActive = () => {
      if (timedOut) throw failure(504, 'OpenRouter review timed out. Please try again.');
      if (controller.signal.aborted || req.aborted || res.destroyed) throw failure(499, 'Request cancelled');
    };
    const closeClient = () => {
      if (saveClient && !endClient) endClient = saveClient.end().catch(() => {});
      return endClient || Promise.resolve();
    };
    const interruptStorage = () => { void closeClient(); };
    req.on('aborted', interrupted);
    res.on('close', interrupted);
    try {
      const user = actor(req);
      if (!user) return res.status(401).json({ error: 'Authentication required' });
      const prompt = String(req.body?.prompt || req.body?.question || req.body?.message || req.body?.context || '').trim();
      if (!prompt) return res.status(400).json({ error: 'prompt is required' });
      if (prompt.length > 20000) return res.status(400).json({ error: 'Keep the review prompt within 20,000 characters' });

      const baseUrl = String(env.OPENROUTER_BASE_URL || '').replace(/\/+$/, '');
      const model = String(env.OPENROUTER_MODEL || '').trim();
      const apiKey = String(env.OPENROUTER_API_KEY || '').trim();
      if (baseUrl !== 'https://openrouter.ai/api/v1' || !model || !apiKey) return res.status(503).json({ error: 'The configured OpenRouter model, key, and exact HTTPS endpoint are required' });

      timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
      ensureActive();
      try {
        providerResponse = await fetchImpl(baseUrl + '/chat/completions', {
          method: 'POST', signal: controller.signal,
          headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'X-Title': projectName },
          body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], max_tokens: 650 })
        });
      } catch (error) {
        ensureActive();
        throw failure(502, 'OpenRouter could not be reached. Please try again.');
      }
      ensureActive();
      if (!providerResponse.ok) throw failure(502, 'OpenRouter rejected the review (' + providerResponse.status + ')');
      let provider;
      try { provider = await providerResponse.json(); }
      catch (error) { ensureActive(); throw failure(502, 'OpenRouter returned an unreadable response'); }
      ensureActive();
      const content = String(provider.choices?.[0]?.message?.content || '').trim();
      if(provider.choices?.[0]?.finish_reason==='length')throw failure(502,'OpenRouter returned a truncated response');
      if (!content) throw failure(502, 'OpenRouter returned an empty response');
      const providerReceipt = { requestId: String(provider.id || ''), provider: String(provider.provider || 'openrouter'), upstreamModel: String(provider.model || model), created: Number(provider.created || 0) };
      if (!providerReceipt.requestId) throw failure(502, 'OpenRouter provider receipt is missing');

      // Separate awaited commands mean cancellation before COMMIT cannot save a late answer.
      saveClient = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 10000 });
      saveClient.on('error', () => {});
      controller.signal.addEventListener('abort', interruptStorage, { once: true });
      let committed = false, interactionId;
      try {
        ensureActive();
        await saveClient.connect();
        ensureActive();
        await saveClient.query('BEGIN');
        const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const freshActor = async () => {
          let fresh;
          if(user.nativeIdentity){const native=user.nativeIdentity;
            fresh=await saveClient.query('SELECT r.id FROM users u JOIN runtime_app_users r ON r.email=u.email WHERE u.id=$1 AND u.email=$2 AND u.role=$3 AND u.tenant_id=$4 AND r.id=$5 AND r.active=TRUE FOR SHARE OF u,r',[native.id,native.email,native.role,native.tenant_id,user.id]);
            const jwt=require('jsonwebtoken');let current;try{current=jwt.verify(token,env.JWT_SECRET,{algorithms:['HS256']});}catch(_){throw failure(401,'Session expired before the report could be saved');}
            if(current.id!==native.id||current.email!==native.email||current.role!==native.role||current.tenant_id!==native.tenant_id)throw failure(401,'Native account identity changed');
          }else{
          const fresh = await saveClient.query('SELECT u.id FROM runtime_app_sessions s JOIN runtime_app_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.user_id=$2 AND s.expires_at>clock_timestamp() AND u.active=TRUE FOR SHARE OF u,s', [tokenHash, user.id]);
          }
          if (fresh.rows.length !== 1) throw failure(401, 'Session expired before the report could be saved');
        };
        await freshActor();
        ensureActive();
        const saved = await saveClient.query('INSERT INTO runtime_ai_interactions(user_id,feature,input,output,model,provider_receipt) VALUES($1,$2,$3::jsonb,$4::jsonb,$5,$6::jsonb) RETURNING id', [user.id, feature, JSON.stringify({ prompt }), JSON.stringify({ content }), model, JSON.stringify(providerReceipt)]);
        ensureActive();
        await freshActor();
        ensureActive();
        await saveClient.query('COMMIT');
        committed = true;
        interactionId = Number(saved.rows[0].id);
      } catch (error) {
        if (!committed && !controller.signal.aborted && !endClient) await saveClient.query('ROLLBACK').catch(() => {});
        ensureActive();
        throw error;
      } finally {
        controller.signal.removeEventListener('abort', interruptStorage);
        await closeClient();
      }
      // A completed native commit is retained even if the browser leaves afterward.
      if (!res.destroyed) res.json({ content, model, providerReceipt, interactionId, feature });
    } catch (error) {
      if (res.destroyed || req.aborted || (controller.signal.aborted && !timedOut)) return;
      const status = Number(error.status) || 503;
      res.status(status).json({ error: error.status ? error.message : 'Memory governance storage is unavailable. Please try again.' });
    } finally {
      clearTimeout(timer);
      req.removeListener('aborted', interrupted);
      res.removeListener('close', interrupted);
      if (providerResponse?.body && !providerResponse.bodyUsed) await providerResponse.body.cancel().catch(() => {});
      controller.abort();
      await closeClient();
    }
  };
}

module.exports = { createRuntimeGovernanceRun };
