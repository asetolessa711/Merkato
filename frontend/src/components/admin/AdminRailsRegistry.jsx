import React, { useEffect, useMemo, useState } from 'react';

// Operator-facing Rails Registry manager backed by /api/admin/rails endpoints
export default function AdminRailsRegistry() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ search:'', tactic:'', owner:'', environment:'', placementKey:'', opsStatus:'' });
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null); // rail object

  useEffect(() => { fetchPage(1); }, []);

  async function fetchPage(p = page) {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
      Object.entries(filters).forEach(([k,v])=>{ if(v) params.set(k,String(v)); });
      const headers = { 'Accept':'application/json' };
      try { const t = localStorage.getItem('token'); if(t) headers.Authorization = `Bearer ${t}`; } catch(_){}
      const res = await fetch(`/api/admin/rails?${params.toString()}`, { headers });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRows(json.rails || []);
      setTotal(Number(json.total||0));
      setPage(Number(json.page||p));
      setPageSize(Number(json.pageSize||pageSize));
      setSelected(new Set());
    } catch(e){ setError(e); }
    finally { setLoading(false); }
  }

  const allChecked = useMemo(() => rows.length && rows.every(r => selected.has(r.railId)), [rows, selected]);
  const someChecked = useMemo(() => rows.some(r => selected.has(r.railId)) && !allChecked, [rows, selected, allChecked]);

  function toggleAll() {
    const next = new Set(selected);
    if(rows.length && rows.every(r => next.has(r.railId))) {
      rows.forEach(r => next.delete(r.railId));
    } else {
      rows.forEach(r => next.add(r.railId));
    }
    setSelected(next);
  }

  function toggleOne(id) {
    const next = new Set(selected);
    if(next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  async function bulkUpdate(updates){
    if(!selected.size) return;
    if(!window.confirm(`Apply changes to ${selected.size} rail(s)?`)) return;
    try {
      const headers = { 'Content-Type':'application/json', 'Accept':'application/json' };
      try { const t = localStorage.getItem('token'); if(t) headers.Authorization = `Bearer ${t}`; } catch(_){}
      const res = await fetch('/api/admin/rails/bulk', { method:'PATCH', headers, body: JSON.stringify({ railIds: Array.from(selected), updates }) });
      if(!res.ok) throw new Error(`Bulk update failed: HTTP ${res.status}`);
      await fetchPage();
    } catch(e){ alert(e.message||String(e)); }
  }

  async function saveEdit(partial){
    if(!editing) return;
    const railId = editing.railId;
    try {
      const headers = { 'Content-Type':'application/json', 'Accept':'application/json' };
      try { const t = localStorage.getItem('token'); if(t) headers.Authorization = `Bearer ${t}`; } catch(_){}
      const res = await fetch(`/api/admin/rails/${encodeURIComponent(railId)}`, { method:'PUT', headers, body: JSON.stringify({ ...editing, ...partial }) });
      if(!res.ok) throw new Error(`Save failed: HTTP ${res.status}`);
      setEditing(null);
      await fetchPage();
    } catch(e){ alert(e.message||String(e)); }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div style={{ display:'grid', gap:12 }}>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <input placeholder="Search by ID or name" value={filters.search} onChange={e=>setFilters(f=>({...f, search:e.target.value }))} onKeyDown={e=>{ if(e.key==='Enter') fetchPage(1); }} style={input} />
        <select value={filters.opsStatus} onChange={e=>setFilters(f=>({...f, opsStatus:e.target.value }))} style={sel} aria-label="Ops status filter">
          <option value="">All statuses</option>
          {['Active','Paused','Archived'].map(s=> <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.tactic} onChange={e=>setFilters(f=>({...f, tactic:e.target.value }))} style={sel} aria-label="Tactic filter">
          <option value="">All tactics</option>
          {['Curated','Sponsored','CrossSell','DealsHub','CategoryPromo','Collection','BrandSpotlight'].map(s=> <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.owner} onChange={e=>setFilters(f=>({...f, owner:e.target.value }))} style={sel} aria-label="Owner filter">
          <option value="">All owners</option>
          {['Marketing','System+Marketing','Vendor'].map(s=> <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.environment} onChange={e=>setFilters(f=>({...f, environment:e.target.value }))} style={sel} aria-label="Environment filter">
          <option value="">All env</option>
          {['Prod','Staging','Dev'].map(s=> <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.placementKey} onChange={e=>setFilters(f=>({...f, placementKey:e.target.value }))} style={sel} aria-label="Placement filter">
          <option value="">All placements</option>
          {['Hero','BelowHero','Mid','CategoryTop','DealsPage','PDP','Cart','CollectionPage','SearchResults'].map(s=> <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={()=>fetchPage(1)} style={btn}>Apply</button>
        <button onClick={()=>{ setFilters({ search:'', tactic:'', owner:'', environment:'', placementKey:'', opsStatus:'' }); fetchPage(1); }} style={btn}>Reset</button>
      </div>

      <div style={{ border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={{...th, width:32}}>
                <input type="checkbox" aria-checked={someChecked? 'mixed' : (allChecked? 'true':'false')} checked={allChecked} ref={el=>{ if(el) el.indeterminate = someChecked; }} onChange={toggleAll} />
              </th>
              <th style={th}>Rail</th>
              <th style={th}>Tactic</th>
              <th style={th}>Placement</th>
              <th style={th}>Env</th>
              <th style={th}>Owner</th>
              <th style={th}>Status</th>
              <th style={{...th, textAlign:'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_,i)=> (
                <tr key={i}>
                  <td style={td}><div style={skeleton}/></td>
                  {Array.from({ length: 7 }).map((__,j)=> <td key={j} style={td}><div style={skeleton}/></td>)}
                </tr>
              ))
            ) : error ? (
              <tr><td colSpan={8} style={{ ...td, color:'red' }}>Failed to load: {String(error.message||error)}</td></tr>
            ) : rows.length ? rows.map(r => (
              <tr key={r.railId} style={{ borderTop:'1px solid #eee' }}>
                <td style={td}><input type="checkbox" checked={selected.has(r.railId)} onChange={()=>toggleOne(r.railId)} /></td>
                <td style={td}>
                  <div style={{ display:'flex', flexDirection:'column' }}>
                    <strong>{r.displayName || r.title || r.railId}</strong>
                    <span style={{ fontSize:11, color:'#64748b' }}>{r.railId}</span>
                    {!!(r.badges&&r.badges.length) && (<span style={{ fontSize:10, color:'#0f766e' }}>{r.badges.join(' ')}</span>)}
                  </div>
                </td>
                <td style={td}>{r.tactic||'—'}</td>
                <td style={td}>{r.placementKey||r.placement?.slot||'—'}</td>
                <td style={td}>{r.environment||'Prod'}</td>
                <td style={td}>{r.owner||'Marketing'}</td>
                <td style={td}>{r.opsStatus||'Active'}</td>
                <td style={{...td, textAlign:'right'}}>
                  <button style={btnSm} onClick={()=>setEditing(r)}>Edit</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={8} style={td}>No results</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk actions */}
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <span style={{ fontSize:12, color:'#64748b' }}>{selected.size} selected</span>
        <select defaultValue="" onChange={(e)=>{ const v = e.target.value; if(!v) return; if(v.startsWith('owner:')) { bulkUpdate({ owner: v.slice(6) }); } if(v.startsWith('ops:')) { bulkUpdate({ opsStatus: v.slice(4) }); } if(v.startsWith('place:')) { bulkUpdate({ placementKey: v.slice(6) }); } e.target.value = ''; }} style={sel} aria-label="Bulk action">
          <option value="">Bulk action…</option>
          <option disabled>— Owner —</option>
          {['Marketing','System+Marketing','Vendor'].map(o=> <option key={o} value={`owner:${o}`}>Set owner: {o}</option>)}
          <option disabled>— Status —</option>
          {['Active','Paused','Archived'].map(s=> <option key={s} value={`ops:${s}`}>Set status: {s}</option>)}
          <option disabled>— Placement —</option>
          {['Hero','BelowHero','Mid','CategoryTop','DealsPage','PDP','Cart','CollectionPage','SearchResults'].map(p=> <option key={p} value={`place:${p}`}>Set placement: {p}</option>)}
        </select>
      </div>

      {/* Pagination */}
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <button style={btn} disabled={page<=1} onClick={()=>fetchPage(page-1)}>Prev</button>
        <span style={{ fontSize:12, color:'#64748b' }}>Page {page} / {totalPages}</span>
        <button style={btn} disabled={page>=totalPages} onClick={()=>fetchPage(page+1)}>Next</button>
        <select value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)); fetchPage(1); }} style={sel} aria-label="Page size">
          {[25,50,100].map(n=> <option key={n} value={n}>{n}/page</option>)}
        </select>
      </div>

      {/* Edit Drawer (simple modal) */}
      {editing && (
        <div role="dialog" aria-modal="true" style={modalOverlay} onClick={()=>setEditing(null)}>
          <div style={modal} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ margin:0 }}>Edit Rail</h3>
              <button onClick={()=>setEditing(null)} style={btnSm}>Close</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:12, marginTop:12 }}>
              <Field label="Rail ID" readOnly value={editing.railId} />
              <Field label="Display Name" value={editing.displayName||''} onChange={v=>setEditing(e=>({ ...e, displayName: v }))} />
              <Field label="Ops Status" as="select" value={editing.opsStatus||'Active'} onChange={v=>setEditing(e=>({ ...e, opsStatus: v }))} options={['Active','Paused','Archived']} />
              <Field label="Tactic" as="select" value={editing.tactic||''} onChange={v=>setEditing(e=>({ ...e, tactic: v }))} options={['','Curated','Sponsored','CrossSell','DealsHub','CategoryPromo','Collection','BrandSpotlight']} />
              <Field label="Owner" as="select" value={editing.owner||'Marketing'} onChange={v=>setEditing(e=>({ ...e, owner: v }))} options={['Marketing','System+Marketing','Vendor']} />
              <Field label="Environment" as="select" value={editing.environment||'Prod'} onChange={v=>setEditing(e=>({ ...e, environment: v }))} options={['Prod','Staging','Dev']} />
              <Field label="Placement" as="select" value={editing.placementKey||''} onChange={v=>setEditing(e=>({ ...e, placementKey: v }))} options={['','Hero','BelowHero','Mid','CategoryTop','DealsPage','PDP','Cart','CollectionPage','SearchResults']} />
              <Field label="Category" value={editing.category||''} onChange={v=>setEditing(e=>({ ...e, category: v }))} />
              <Field label="Variant" value={editing.variant||''} onChange={v=>setEditing(e=>({ ...e, variant: v }))} />
              <Field label="Badges (space-separated)" value={(editing.badges||[]).join(' ')} onChange={v=>setEditing(e=>({ ...e, badges: v.split(' ').map(s=>s.trim()).filter(Boolean) }))} />
              <Field label="Notes" as="textarea" value={editing.notes||''} onChange={v=>setEditing(e=>({ ...e, notes: v }))} />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 }}>
              <button style={btn} onClick={()=>saveEdit({})}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, readOnly, as, options }){
  return (
    <label style={{ fontSize:12 }}>
      {label}
      {as === 'select' ? (
        <select disabled={readOnly} value={value} onChange={e=>onChange && onChange(e.target.value)} style={input}>
          {(options||[]).map(o => <option key={o} value={o}>{o||'—'}</option>)}
        </select>
      ) : as === 'textarea' ? (
        <textarea readOnly={readOnly} value={value} onChange={e=>onChange && onChange(e.target.value)} style={{ ...input, minHeight: 80 }} />
      ) : (
        <input readOnly={readOnly} value={value} onChange={e=>onChange && onChange(e.target.value)} style={input} />
      )}
    </label>
  );
}

const th = { textAlign:'left', padding:'6px 8px', background:'#fafafa', fontWeight:600, fontSize:12 };
const td = { padding:'6px 8px', fontSize:12 };
const btn = { padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:6, background:'#fff', cursor:'pointer' };
const btnSm = { padding:'4px 8px', border:'1px solid #e5e7eb', borderRadius:6, background:'#fff', cursor:'pointer', fontSize:12 };
const sel = { fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', background:'#fff' };
const input = { fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background:'#fff' };
const skeleton = { height: 12, borderRadius: 3, background:'#eef2f7' };
const modalOverlay = { position:'fixed', inset:0, background:'rgba(15,23,42,0.35)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex: 50 };
const modal = { width:'min(860px, 92vw)', maxHeight:'90vh', overflowY:'auto', background:'#fff', borderRadius:10, padding:16, boxShadow:'0 20px 60px rgba(0,0,0,0.25)' };
