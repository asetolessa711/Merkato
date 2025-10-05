import React, { useEffect, useState, useMemo } from 'react';
import {
  loadRails,
  upsertRail,
  deleteRail,
  duplicateRail,
  newRailTemplate,
  parseSkuList,
  resolveRails,
} from '../utils/railsStore'';

// MVP Admin Rails management (Phase 1)
export default function AdminRails() {
  const [railsMap, setRailsMap] = useState({});
  const [filter, setFilter] = useState('all'); // all|published|drafts
  const [editingId, setEditingId] = useState(null);
  const [skuInput, setSkuInput] = useState('');
  const [includeDraftsPreview, setIncludeDraftsPreview] = useState(true);
  const [sortKey, setSortKey] = useState('priority'); // reserved for future list sorting
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => { try { setRailsMap(loadRails()); } catch (_) {} }, []);

  const railsArr = useMemo(() => Object.values(railsMap), [railsMap]);
  let filtered = railsArr.filter(r => {
    if (filter === 'published') return r.status === 'published';
    if (filter === 'drafts') return r.status !== 'published';
    return true;
  }).sort((a,b)=>{
    const pa = Number(a.priority||0); const pb = Number(b.priority||0);
    if (pa !== pb) return pa - pb;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Note: Metrics overlay removed. Use the global Rails Metrics panel in Marketing Manager.

  const editing = editingId ? railsMap[editingId] : null;

  function createRail() {
    const rail = newRailTemplate();
    const next = upsertRail(rail);
    setRailsMap(next);
    setEditingId(rail.id);
  }

  function saveRail(partial) {
    if (!editing) return;
    const items = parseSkuList(skuInput).map(sku => ({ sku, reason: 'manual' }));
    const next = upsertRail({ ...editing, ...partial, items });
    setRailsMap(next);
  }

  function removeRail(id) { if (!window.confirm('Delete rail?')) return; const next = deleteRail(id); setRailsMap(next); if (editingId === id) setEditingId(null); }
  function duplicate(id) { const next = duplicateRail(id); setRailsMap(next); }

  useEffect(()=>{ if(editing) { setSkuInput((editing.items||[]).map(i=>i.sku).join('\n')); } }, [editingId]);

  // Simple preview for currently resolved below_hero rail
  const previewRails = useMemo(()=>{
    try { return resolveRails({ page:'home', slot:'below_hero', includeDrafts: includeDraftsPreview }); } catch(_) { return []; }
  }, [railsMap, includeDraftsPreview]);

  return (
    <div style={{ display:'flex', gap:24, alignItems:'flex-start', padding:20 }}>
      {/* Left: List */}
      <div style={{ flex:'0 0 340px' }}>
        <h2 style={{ marginTop:0, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>Rails</span>
        </h2>
        <div style={{ display:'flex', gap:8, marginBottom:8 }}>
          <button onClick={createRail}>+ New Rail</button>
          <select value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="drafts">Drafts</option>
          </select>
        </div>
        <ul style={{ listStyle:'none', padding:0, margin:0, maxHeight: '70vh', overflowY:'auto' }}>
          {filtered.map(r => (
            <li key={r.id} style={{ border:'1px solid #ddd', padding:8, marginBottom:6, borderRadius:6, background: editingId===r.id?'#F0F9FF':'#fff' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <button style={{ background:'none', border:'none', textAlign:'left', cursor:'pointer', flex:1 }} onClick={()=>setEditingId(r.id)}>
                  <strong>{r.title}</strong>
                  <div style={{ fontSize:11, color:'#666' }}>{r.placement.page}/{r.placement.slot} · {r.status}</div>
                </button>
                <div style={{ display:'flex', gap:4 }}>
                  <button title="Duplicate" onClick={()=>duplicate(r.id)}>⧉</button>
                  <button title="Delete" onClick={()=>removeRail(r.id)}>✕</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Middle: Editor */}
      <div style={{ flex:1, minHeight:300 }}>
        {editing ? (
          <div>
            <h3 style={{ marginTop:0 }}>Edit Rail</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
              <label style={{ fontSize:12 }}>Title
                <input style={{ width:'100%' }} value={editing.title} onChange={e=>saveRail({ title:e.target.value })} />
              </label>
              <label style={{ fontSize:12 }}>Status
                <select value={editing.status} onChange={e=>saveRail({ status:e.target.value })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
              <label style={{ fontSize:12 }}>Type
                <select value={editing.type} onChange={e=>saveRail({ type:e.target.value })}>
                  <option value="featured">Featured</option>
                  <option value="new">New</option>
                  <option value="best_sellers">Best Sellers</option>
                  <option value="trending">Trending</option>
                  <option value="staff_picks">Staff Picks</option>
                  <option value="sponsored_mix">Sponsored Mix</option>
                </select>
              </label>
              <label style={{ fontSize:12 }}>Page
                <select value={editing.placement.page} onChange={e=>saveRail({ placement:{ ...editing.placement, page:e.target.value } })}>
                  <option value="home">home</option>
                  <option value="category">category</option>
                </select>
              </label>
              <label style={{ fontSize:12 }}>Slot
                <select value={editing.placement.slot} onChange={e=>saveRail({ placement:{ ...editing.placement, slot:e.target.value } })}>
                  <option value="below_hero">below_hero</option>
                  <option value="mid_1">mid_1</option>
                  <option value="mid_2">mid_2</option>
                </select>
              </label>
              <label style={{ fontSize:12 }}>Priority
                <input type="number" value={editing.priority} onChange={e=>saveRail({ priority:Number(e.target.value) })} />
              </label>
              {/* Targeting */}
              <label style={{ fontSize:12 }}>Roles (comma)
                <input style={{ width:'100%' }} value={(editing.targeting?.roles||[]).join(',')} onChange={e=>saveRail({ targeting:{ ...(editing.targeting||{}), roles: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) || ['all'] } })} />
              </label>
              <label style={{ fontSize:12 }}>Regions (comma)
                <input style={{ width:'100%' }} value={(editing.targeting?.regions||[]).join(',')} onChange={e=>saveRail({ targeting:{ ...(editing.targeting||{}), regions: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) } })} />
              </label>
              <label style={{ fontSize:12 }}>Languages (comma)
                <input style={{ width:'100%' }} value={(editing.targeting?.languages||[]).join(',')} onChange={e=>saveRail({ targeting:{ ...(editing.targeting||{}), languages: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) || ['all'] } })} />
              </label>
              <label style={{ fontSize:12 }}>Start At
                <input type="datetime-local" value={editing.schedule?.startAt ? editing.schedule.startAt.slice(0,16) : ''} onChange={e=>saveRail({ schedule:{ ...(editing.schedule||{}), startAt: e.target.value ? new Date(e.target.value).toISOString() : null } })} />
              </label>
              <label style={{ fontSize:12 }}>End At
                <input type="datetime-local" value={editing.schedule?.endAt ? editing.schedule.endAt.slice(0,16) : ''} onChange={e=>saveRail({ schedule:{ ...(editing.schedule||{}), endAt: e.target.value ? new Date(e.target.value).toISOString() : null } })} />
              </label>
              {/* Capacity (read-only for now) */}
              <fieldset style={{ border:'1px solid #e2e8f0', padding:6, borderRadius:6 }}>
                <legend style={{ fontSize:11, padding:'0 4px' }}>Capacity (read-only)</legend>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <label style={{ fontSize:11 }}>Max
                    <input disabled value={editing.capacity?.maxItems ?? ''} style={{ width:70 }} />
                  </label>
                  <label style={{ fontSize:11 }}>Min
                    <input disabled value={editing.capacity?.minItems ?? ''} style={{ width:70 }} />
                  </label>
                  <label style={{ fontSize:11 }}>Sponsored / Sess
                    <input disabled value={editing.capacity?.sponsoredSessionCap ?? ''} style={{ width:90 }} />
                  </label>
                </div>
              </fieldset>
            </div>
            <div style={{ marginTop:12 }}>
              <label style={{ fontSize:12, display:'block' }}>Items (SKUs comma or newline)
                <textarea style={{ width:'100%', minHeight:120, fontFamily:'monospace' }} value={skuInput} onChange={e=>setSkuInput(e.target.value)} onBlur={()=>saveRail({})} placeholder="SKU123, SKU456" />
              </label>
              <div style={{ fontSize:11, color:'#555' }}>Parsed: {parseSkuList(skuInput).length} unique SKUs</div>
            </div>
          </div>
        ) : (
          <div style={{ color:'#666' }}>Select or create a rail to begin editing.</div>
        )}
      </div>

      {/* Right: Preview */}
      <div style={{ flex:'0 0 340px' }}>
        <h3 style={{ marginTop:0 }}>Preview (Below Hero)</h3>
        <label style={{ fontSize:12, display:'flex', gap:4, alignItems:'center' }}>
          <input type="checkbox" checked={includeDraftsPreview} onChange={e=>setIncludeDraftsPreview(e.target.checked)} /> Include drafts
        </label>
        {previewRails.length ? previewRails.map(r => (
          <div key={r.id} style={{ border:'1px solid #ddd', padding:8, marginTop:8, borderRadius:6 }}>
            <strong>{r.title}</strong>
            <div style={{ fontSize:11, color:'#666' }}>{r.items.length} items</div>
          </div>
        )) : <div style={{ fontSize:12, color:'#666', marginTop:8 }}>No rail resolved.</div>}
      </div>
      {/* Metrics overlay removed; use the Rails Metrics section above. */}
    </div>
  );
}
