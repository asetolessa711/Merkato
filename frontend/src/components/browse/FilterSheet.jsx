import React, { useEffect, useMemo, useState } from 'react';

// Lightweight mobile-only bottom sheet. Caller supplies current values and an onApply handler.
export default function FilterSheet({
  open,
  onClose,
  onApply,
  // initial supports brandList (array of lowercase values) for true multi-select
  initial = { brandList: [], rating: '', price_min: '', price_max: '', in_stock: false, category: '' },
  // brandFacets: [{ label: 'Sony', value: 'sony', count: 12 }]
  brandFacets = [],
}) {
  const [form, setForm] = useState(initial);
  useEffect(() => { setForm(initial); }, [open, initial.brandList, initial.rating, initial.price_min, initial.price_max, initial.in_stock, initial.category]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onToggleBrand = (val) => {
    setForm((f) => {
      const curr = new Set(Array.isArray(f.brandList) ? f.brandList : []);
      if (curr.has(val)) curr.delete(val); else curr.add(val);
      return { ...f, brandList: Array.from(curr) };
    });
  };

  const changed = useMemo(() => {
    try {
      const a = initial;
      const b = form;
      const aBrands = Array.isArray(a.brandList) ? [...a.brandList].sort().join(',') : '';
      const bBrands = Array.isArray(b.brandList) ? [...b.brandList].sort().join(',') : '';
      return (
        aBrands !== bBrands ||
        String(a.rating||'') !== String(b.rating||'') ||
        String(a.price_min||'') !== String(b.price_min||'') ||
        String(a.price_max||'') !== String(b.price_max||'') ||
        Boolean(a.in_stock) !== Boolean(b.in_stock)
      );
    } catch (_) { return true; }
  }, [initial, form]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Filters" style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      display: 'grid', gridTemplateRows: '1fr auto', background: 'rgba(0,0,0,0.4)'
    }} onClick={onClose}>
      {/* Click-through spacer */}
      <div />
      <div onClick={(e)=>e.stopPropagation()} style={{
        background: '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12,
        boxShadow: '0 -10px 30px rgba(0,0,0,0.2)', padding: 16,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
          <strong>Filters</strong>
          <button onClick={onClose} aria-label="Close filters" style={{ background:'transparent', border:0, fontSize:18 }}>✕</button>
        </div>
        {/* Fields mirror desktop facets (mobile-optimized) */}
        <div style={{ display:'grid', gap: 12 }}>
          <div>
            <label style={{ display:'block', fontWeight:600, marginBottom:6 }}>Brand</label>
            <div style={{ maxHeight: 180, overflowY:'auto', border:'1px solid var(--border)', borderRadius:6, padding:8 }}>
              {brandFacets.length === 0 ? (
                <div style={{ color:'#64748b', fontSize:13 }}>No brands</div>
              ) : (
                brandFacets.map((b) => (
                  <label key={b.value} style={{ display:'flex', alignItems:'center', gap:8, padding:'2px 0' }}>
                    <input
                      type="checkbox"
                      checked={Array.isArray(form.brandList) ? form.brandList.includes(b.value) : false}
                      onChange={() => onToggleBrand(b.value)}
                    />
                    <span style={{ flex:1 }}>{b.label}</span>
                    <span aria-hidden style={{ color:'#64748b', fontSize:12 }}>{b.count ?? ''}</span>
                  </label>
                ))
              )}
            </div>
            {Array.isArray(form.brandList) && form.brandList.length > 0 && (
              <button onClick={() => set('brandList', [])} style={{ marginTop: 8 }}>Clear brands</button>
            )}
          </div>

          <div>
            <label style={{ display:'block', fontWeight:600, marginBottom:6 }}>Rating</label>
            <select value={form.rating} onChange={(e)=> set('rating', e.target.value)}>
              <option value="">Any</option>
              <option value="4">4+ stars</option>
              <option value="3">3+ stars</option>
            </select>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div>
              <label>Min</label>
              <input type="number" inputMode="decimal" value={form.price_min} onChange={(e)=> set('price_min', e.target.value)} />
            </div>
            <div>
              <label>Max</label>
              <input type="number" inputMode="decimal" value={form.price_max} onChange={(e)=> set('price_max', e.target.value)} />
            </div>
          </div>
          <div style={{ display:'flex', gap: 8, flexWrap:'wrap' }}>
            <button type="button" onClick={()=> set('price_max', '25')}>Under $25</button>
            <button type="button" onClick={()=> { set('price_min', '25'); set('price_max', '50'); }}>25–50</button>
            <button type="button" onClick={()=> { set('price_min', '50'); set('price_max', ''); }}>Over $50</button>
          </div>

          <label style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input type="checkbox" checked={!!form.in_stock} onChange={(e)=> set('in_stock', e.target.checked)} />
            In stock only
          </label>
        </div>

        <div style={{ display:'flex', gap: 8, justifyContent:'space-between', marginTop: 16 }}>
          <button onClick={() => setForm({ brandList: [], rating:'', price_min:'', price_max:'', in_stock:false, category: form.category || '' })}>Clear all</button>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onApply(form)} disabled={!changed} aria-disabled={!changed}>
              Apply{changed ? '' : ' (no changes)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
