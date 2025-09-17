import React, { useEffect, useMemo, useState, useRef } from 'react';
import axios from 'axios';
import MerkatoNavbar from '../components/MerkatoNavbar';

// Simple drag handle icon
const Grab = () => <span aria-hidden>⋮⋮</span>;

const ICONS = ['👗','📱','🏠','💄','🏕️','🚗','🧸','📚','🍼','🎮','💸','🛠️','🧭','🛍️','🏪','🧰','🎨','📦','🧹','🍳'];

function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} title="Pick Icon">{value || '😀'}</button>
      {open && (
        <div style={{ position: 'absolute', top: '110%', left: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 6, display: 'grid', gridTemplateColumns: 'repeat(8, 28px)', gap: 6, zIndex: 10 }}>
          {ICONS.map(ic => (
            <button key={ic} type="button" onClick={() => { onChange(ic); setOpen(false); }} style={{ width: 28, height: 28, lineHeight: '28px' }}>{ic}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function LivePreview({ menu }) {
  return (
    <div style={{ background: '#1f2236', color: '#fff', borderRadius: 8, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Live Preview</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, minHeight: 200 }}>
        <div>
          {menu.map((col, i) => (
            <div key={i} style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', marginBottom: 6 }}>
              {(col.icon || col.thumb) ? <span style={{ marginRight: 6 }}>{col.icon || '•'}</span> : null}
              <strong style={{ color: '#fff' }}>{col.title || 'Untitled'}</strong>
            </div>
          ))}
        </div>
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 12 }}>
          {menu.map((col, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ color: '#cbd5e1', marginBottom: 6 }}>{col.title}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(col.links || []).map((lnk, j) => (
                  <li key={j} style={{ color: '#cbd5e1' }}>{lnk.label}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminMegaMenu() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [menu, setMenu] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [audit, setAudit] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const dragCat = useRef({ from: null });
  const dragSub = useRef({ parent: null, from: null });
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const headers = useMemo(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/admin/mega-menu', { headers });
        const arr = Array.isArray(res.data?.menu) ? res.data.menu : [];
        if (mounted) setMenu(arr);
        // Seed audit
        try {
          const a = await axios.get('/api/admin/mega-menu/audit', { headers });
          if (mounted) setAudit(Array.isArray(a.data?.entries) ? a.data.entries : []);
        } catch {}
        // Preload products (for vendor preview)
        try {
          setLoadingProducts(true);
          const p = await axios.get('/api/products');
          if (mounted) setAllProducts(Array.isArray(p.data) ? p.data : []);
        } catch {} finally {
          setLoadingProducts(false);
        }
      } catch (e) {
        setError('Failed to load mega menu');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; }
  }, [headers]);

  const addMain = () => setMenu((m) => [...m, { title: 'New Category', icon: '🗂️', status: 'active', links: [] }]);
  const addSub = (i) => setMenu((m) => m.map((c, idx) => idx === i ? { ...c, links: [...(c.links||[]), { label: 'New Item', to: '/shop', status: 'active' }] } : c));
  const delMain = (i) => setMenu((m) => m.filter((_, idx) => idx !== i));
  const delSub = (i, j) => setMenu((m) => m.map((c, idx) => idx === i ? { ...c, links: (c.links||[]).filter((_, k) => k !== j) } : c));
  const move = (from, to) => setMenu((m) => { const arr = m.slice(); const [it] = arr.splice(from,1); arr.splice(to,0,it); return arr; });
  const moveSub = (i, from, to) => setMenu((m) => {
    const arr = m.slice();
    const links = (arr[i].links || []).slice();
    const [it] = links.splice(from,1);
    links.splice(to,0,it);
    arr[i] = { ...arr[i], links };
    return arr;
  });

  const save = async () => {
    try {
      setSaving(true);
      const res = await axios.put('/api/admin/mega-menu', { menu }, { headers });
      // Persist to localStorage so navbar updates immediately without reload
      try { localStorage.setItem('merkato-mega-menu', JSON.stringify(res.data.menu || menu)); } catch {}
      // Notify listeners (Navbar) to refresh
      try { window.dispatchEvent(new CustomEvent('mega-menu:updated')); } catch {}
      // Refresh audit list after save
      try {
        const a = await axios.get('/api/admin/mega-menu/audit', { headers });
        setAudit(Array.isArray(a.data?.entries) ? a.data.entries : []);
      } catch {}
    } catch (e) {
      setError('Failed to save mega menu');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    if (!filter) return menu;
    const q = filter.toLowerCase();
    return menu.filter(col => (col.title||'').toLowerCase().includes(q) || (col.links||[]).some(l => (l.label||'').toLowerCase().includes(q)));
  }, [menu, filter]);

  // Vendor tagging preview: infer target tag from first link query parameter
  const vendorPreview = useMemo(() => {
    const cat = menu[activeIdx] || {};
    const links = Array.isArray(cat.links) ? cat.links : [];
    // Find a link with a category hint
    let hint = '';
    for (const l of links) {
      try {
        const url = new URL(l.to, 'https://dummy.local');
        const catParam = url.searchParams.get('cat') || url.searchParams.get('category');
        if (catParam) { hint = catParam; break; }
      } catch {}
    }
    const items = Array.isArray(allProducts) ? allProducts : [];
    const norm = (s) => (s || '').toString().toLowerCase();
    const filteredItems = items.filter(p => {
      if (!hint) return false;
      return norm(p.category).includes(norm(hint)) || norm(p.name).includes(norm(hint));
    }).slice(0, 5);
    return { hint, items: filteredItems };
  }, [menu, activeIdx, allProducts]);

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginTop: 0 }}>Admin: Mega Menu Management</h2>
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: 16 }}>
        <div>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={addMain}>+ Add Category</button>
            <button onClick={save} disabled={saving || loading} style={{ background: '#007bff', color: '#fff', padding: '6px 12px', borderRadius: 6 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <input placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginLeft: 'auto' }} />
          </div>
          {loading ? (
            <div>Loading…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((col, i) => (
                <div key={i}
                     style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}
                     draggable
                     onDragStart={() => { dragCat.current = { from: i }; }}
                     onDragOver={(e) => e.preventDefault()}
                     onDrop={() => { const from = dragCat.current.from; if (from == null || from === i) return; move(from, i); dragCat.current = { from: null }; }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button title="Move up" onClick={() => i>0 && move(i, i-1)}><Grab/></button>
                    <button title="Move down" onClick={() => i<menu.length-1 && move(i, i+1)}><Grab/></button>
                    <input value={col.title || ''} placeholder="Title (default)" onChange={(e) => setMenu(m => m.map((c, idx) => idx===i ? { ...c, title: e.target.value } : c))} style={{ flex: 1 }} />
                    <input value={col.title_en || ''} placeholder="Title EN" onChange={(e) => setMenu(m => m.map((c, idx) => idx===i ? { ...c, title_en: e.target.value } : c))} style={{ width: 120 }} />
                    <input value={col.title_am || ''} placeholder="Title AM" onChange={(e) => setMenu(m => m.map((c, idx) => idx===i ? { ...c, title_am: e.target.value } : c))} style={{ width: 120 }} />
                    <input value={col.title_or || ''} placeholder="Title OR" onChange={(e) => setMenu(m => m.map((c, idx) => idx===i ? { ...c, title_or: e.target.value } : c))} style={{ width: 120 }} />
                    <IconPicker value={col.icon || ''} onChange={(ic) => setMenu(m => m.map((c, idx) => idx===i ? { ...c, icon: ic } : c))} />
                    <select value={col.status || 'active'} onChange={(e) => setMenu(m => m.map((c, idx) => idx===i ? { ...c, status: e.target.value } : c))}>
                      <option value="active">Visible</option>
                      <option value="hidden">Hidden</option>
                    </select>
                    <button onClick={() => delMain(i)} title="Delete">🗑</button>
                  </div>
                  <div style={{ marginTop: 8, paddingLeft: 24 }}>
                    <button onClick={() => addSub(i)}>+ Add Subcategory</button>
                    {(col.links || []).map((lnk, j) => (
                      <div key={j}
                           style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 120px auto', gap: 6, alignItems: 'center', marginTop: 6 }}
                           draggable
                           onDragStart={() => { dragSub.current = { parent: i, from: j }; }}
                           onDragOver={(e) => e.preventDefault()}
                           onDrop={() => { const { parent, from } = dragSub.current; if (parent !== i || from == null || from === j) return; moveSub(i, from, j); dragSub.current = { parent: null, from: null }; }}>
                        <button title="Up" onClick={() => j>0 && moveSub(i, j, j-1)}><Grab/></button>
                        <input value={lnk.label || ''} placeholder="Label (default)" onChange={(e) => setMenu(m => m.map((c, idx) => idx===i ? { ...c, links: (c.links||[]).map((l, k) => k===j ? { ...l, label: e.target.value } : l) } : c))} />
                        <input value={lnk.label_en || ''} placeholder="Label EN" onChange={(e) => setMenu(m => m.map((c, idx) => idx===i ? { ...c, links: (c.links||[]).map((l, k) => k===j ? { ...l, label_en: e.target.value } : l) } : c))} />
                        <input value={lnk.label_am || ''} placeholder="Label AM" onChange={(e) => setMenu(m => m.map((c, idx) => idx===i ? { ...c, links: (c.links||[]).map((l, k) => k===j ? { ...l, label_am: e.target.value } : l) } : c))} />
                        <input value={lnk.label_or || ''} placeholder="Label OR" onChange={(e) => setMenu(m => m.map((c, idx) => idx===i ? { ...c, links: (c.links||[]).map((l, k) => k===j ? { ...l, label_or: e.target.value } : l) } : c))} />
                        <input value={lnk.to || ''} placeholder="Link (to)" onChange={(e) => setMenu(m => m.map((c, idx) => idx===i ? { ...c, links: (c.links||[]).map((l, k) => k===j ? { ...l, to: e.target.value } : l) } : c))} />
                        <input value={lnk.icon || ''} placeholder="Icon (emoji)" onChange={(e) => setMenu(m => m.map((c, idx) => idx===i ? { ...c, links: (c.links||[]).map((l, k) => k===j ? { ...l, icon: e.target.value } : l) } : c))} />
                        <button onClick={() => delSub(i, j)} title="Delete">🗑</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          {/* Category selector for vendor preview */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Preview Category</label>
            <select value={activeIdx} onChange={(e) => setActiveIdx(parseInt(e.target.value, 10) || 0)}>
              {menu.map((c, i) => (
                <option value={i} key={i}>{c.title || c.title_en || `Category ${i+1}`}</option>
              ))}
            </select>
          </div>
          <LivePreview menu={menu} />
          {/* Vendor Tagging Preview */}
          <div style={{ marginTop: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
            <h4 style={{ marginTop: 0 }}>Vendor Tagging Preview</h4>
            {loadingProducts ? (
              <div>Loading products…</div>
            ) : vendorPreview.hint ? (
              vendorPreview.items.length > 0 ? (
                <ul style={{ paddingLeft: 18 }}>
                  {vendorPreview.items.map((p) => (
                    <li key={p._id || p.id}>{p.name} {p.category ? <em style={{ color: '#64748b' }}>({p.category})</em> : null}</li>
                  ))}
                </ul>
              ) : (
                <div>No products matched for hint “{vendorPreview.hint}”.</div>
              )
            ) : (
              <div>Select or add a subcategory with a cat= or category= parameter to preview matching products.</div>
            )}
          </div>
          <div style={{ marginTop: 12, background: '#f8fafc', padding: 10, borderRadius: 8 }}>
            <small>Tip: After saving, the public navbar updates immediately. Frontend also reads from /api/categories on next load.</small>
          </div>
          {/* Audit log */}
          <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
            <h4 style={{ marginTop: 0 }}>Audit Log</h4>
            <ul style={{ maxHeight: 160, overflow: 'auto', listStyle: 'none', padding: 0, margin: 0 }}>
              {audit.map((e, i) => (
                <li key={i} style={{ borderBottom: '1px solid #f1f5f9', padding: '6px 0' }}>
                  <code>{new Date(e.ts).toLocaleString()}</code> — <strong>{e.action}</strong> by {e.user?.email || e.user?.id || 'unknown'} • cats: {e.counts?.categories} • links: {e.counts?.links}
                </li>
              ))}
              {audit.length === 0 && <li><em>No changes yet.</em></li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
