
import React, { useEffect, useState } from 'react';
const TOKEN_KEY = Object.keys(localStorage).find((k) => k.endsWith('_token')) || 'agent_memory_store_token';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
export default function TimeSliderWorkbench(){
  const today=new Date();
  const start=new Date(today.getTime()-90*86400000);
  const dayCount=90;
  const [offset,setOffset]=useState(dayCount);
  const asOf=new Date(start.getTime()+offset*86400000).toISOString().slice(0,10);
  const [mems,setMems]=useState([]);const [err,setErr]=useState(null);
  useEffect(()=>{
    fetch(API_BASE+'/memories?as_of='+asOf,{headers:{Authorization:'Bearer '+localStorage.getItem(TOKEN_KEY)}}).then(r=>r.json()).then(d=>setMems(Array.isArray(d)?d:[])).catch(e=>setErr(e.message));
  },[asOf]);
  return (
    <div>
      <div className="page-header"><div><h2>Time-Travel Slider</h2><p>What did we know about each subject as of <strong>{asOf}</strong>?</p></div></div>
      <div className="card">
        <input type="range" min={0} max={dayCount} value={offset} onChange={e=>setOffset(Number(e.target.value))} style={{width:'100%',accentColor:'#a78bfa'}}/>
        <div style={{display:'flex',justifyContent:'space-between',color:'#64748b',fontSize:11,marginTop:6}}>
          <span>{start.toISOString().slice(0,10)}</span><span style={{color:'#a78bfa',fontWeight:600}}>{asOf}</span><span>today</span>
        </div>
        <div style={{marginTop:18}}>
          {err&&<div className="ai-error">{err}</div>}
          {mems.length===0&&<div className="empty-state">Nothing recorded yet at this date.</div>}
          {mems.map(m=>(
            <div key={m.id} style={{padding:'8px 0',borderBottom:'1px solid #1e293b'}}>
              <strong>{m.subject}</strong>
              <div style={{color:'#94a3b8',fontSize:13}}>{m.event_text}</div>
              <div style={{color:'#64748b',fontSize:11,marginTop:4}}>{m.embedded_at?new Date(m.embedded_at).toLocaleString():''}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
