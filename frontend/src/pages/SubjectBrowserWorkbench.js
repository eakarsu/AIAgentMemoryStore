
import React, { useEffect, useState } from 'react';
const TOKEN_KEY = Object.keys(localStorage).find((k) => k.endsWith('_token')) || 'agent_memory_store_token';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
export default function SubjectBrowserWorkbench(){
  const [subjects,setSubjects]=useState([]);const [pick,setPick]=useState(null);const [mems,setMems]=useState([]);
  useEffect(()=>{fetch(API_BASE+'/subjects',{headers:{Authorization:'Bearer '+localStorage.getItem(TOKEN_KEY)}}).then(r=>r.json()).then(setSubjects);},[]);
  useEffect(()=>{
    if(!pick) return;
    fetch(API_BASE+'/subjects/'+encodeURIComponent(pick.name)+'/memories',{headers:{Authorization:'Bearer '+localStorage.getItem(TOKEN_KEY)}}).then(r=>r.json()).then(d=>setMems(Array.isArray(d)?d:[]));
  },[pick]);
  return (
    <div>
      <div className="page-header"><div><h2>Subject Browser</h2><p>Click a subject to see its real memory feed.</p></div></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:16}}>
        <div className="card">
          <h3 style={{margin:'0 0 12px',color:'#cbd5e1'}}>Subjects</h3>
          {subjects.map(s=>(
            <div key={s.id} onClick={()=>setPick(s)} style={{padding:10,borderRadius:6,marginBottom:4,cursor:'pointer',background:pick&&pick.id===s.id?'#1e293b':'transparent'}}>
              <div style={{display:'flex',justifyContent:'space-between'}}><strong>{s.name}</strong><span className="ai-tag">{s.type}</span></div>
              <div style={{color:'#94a3b8',fontSize:12,marginTop:4}}>{s.fact_count} facts</div>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 style={{margin:'0 0 12px',color:'#cbd5e1'}}>Memories · {pick?pick.name:'(pick a subject)'}</h3>
          {!pick&&<div className="empty-state">Pick a subject ←</div>}
          {pick&&mems.length===0&&<div className="empty-state">No memories yet for {pick.name}.</div>}
          {mems.map(m=>(
            <div key={m.id} style={{padding:'10px 0',borderBottom:'1px solid #1e293b'}}>
              <div style={{fontSize:13,color:'#e2e8f0'}}>{m.event_text}</div>
              <div style={{marginTop:4,display:'flex',gap:6}}>{(m.tags||'').split(',').filter(Boolean).map(t=>(<span key={t} className="ai-tag">{t.trim()}</span>))}</div>
              <div style={{color:'#64748b',fontSize:11,marginTop:4}}>{m.embedded_at?new Date(m.embedded_at).toLocaleString():''}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
