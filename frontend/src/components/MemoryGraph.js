import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, useEdgesState, useNodesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { API_BASE, getToken } from '../services/api';

export default function MemoryGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(18);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/custom-views/memory-graph?limit=${limit}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setNodes(Array.isArray(data.nodes) ? data.nodes : []);
      setEdges(Array.isArray(data.edges) ? data.edges : []);
      setMeta({ total: data.total || 0 });
    } catch (e) {
      setError(e.message || 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  }, [limit, setEdges, setNodes]);

  useEffect(() => { load(); }, [load]);

  const onNodeClick = useCallback((_e, node) => setSelected(node?.data || null), []);

  const summary = useMemo(() => `${nodes.length} memory nodes · ${edges.length} edges (recency + tag similarity)`, [nodes.length, edges.length]);

  return (
    <div className="card" data-testid="memory-graph-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, color: '#cbd5e1' }}>Memory Graph</h3>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>{summary}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ color: '#94a3b8', fontSize: 12 }}>Nodes</label>
          <input
            type="number"
            min={4}
            max={60}
            value={limit}
            onChange={(e) => setLimit(Math.max(4, Math.min(60, Number(e.target.value) || 18)))}
            style={{ width: 70, padding: '6px 8px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6 }}
          />
          <button className="btn secondary" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="ai-error" style={{ marginBottom: 8 }}>{error}</div>}

      <div style={{ height: 460, background: '#0b1220', border: '1px solid #1e293b', borderRadius: 8 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          attributionPosition="bottom-right"
        >
          <MiniMap pannable zoomable style={{ background: '#0f172a' }} maskColor="rgba(2,6,23,0.7)" />
          <Controls showInteractive={false} />
          <Background gap={18} color="#1e293b" />
        </ReactFlow>
      </div>

      {selected && (
        <div style={{ marginTop: 12, padding: 12, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6 }}>
          <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{selected.label}</div>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{selected.event_text}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {String(selected.tags || '').split(',').filter(Boolean).map((t) => (
              <span key={t} className="ai-tag">{t.trim()}</span>
            ))}
          </div>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 6 }}>
            {selected.when ? new Date(selected.when).toLocaleString() : ''}
          </div>
        </div>
      )}
    </div>
  );
}
