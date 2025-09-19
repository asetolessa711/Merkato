// src/pages/AdminMicroBanner.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { MICRO_BANNER_KEY } from '../components/MicroBanner';

function AdminMicroBanner() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [previewIdx, setPreviewIdx] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MICRO_BANNER_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch { setItems([]); }
  }, []);

  const persist = (next) => {
    setItems(next);
    try { localStorage.setItem(MICRO_BANNER_KEY, JSON.stringify(next)); } catch {}
    try { window.dispatchEvent(new CustomEvent('microbanner:updated')); } catch {}
  };

  const add = () => {
    const id = `mb-${Date.now()}`;
    persist([{ id, text: '', type: 'promo', action: 'link', href: '/', enabled: true }, ...items]);
  };
  const update = (id, patch) => persist(items.map(it => it.id === id ? { ...it, ...patch } : it));
  const remove = (id) => persist(items.filter(it => it.id !== id));
  const duplicate = (id) => {
    const orig = items.find(i => i.id === id);
    if (!orig) return;
    const copy = { ...orig, id: `mb-${Date.now()}` };
    persist([copy, ...items]);
  };

  const filtered = useMemo(() => items.filter(i => filter === 'all' ? true : i.type === filter), [items, filter]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin: MicroBanner Manager</h2>
      <p>Manage rotating microbanners above the public navbar. Changes save locally and broadcast live.</p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={add} style={{ background: 'var(--color-primary)', color: '#fff', border: 0, padding: '8px 12px', borderRadius: 6 }}>Add</button>
        <select value={filter} onChange={(e)=>setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="promo">Promo</option>
          <option value="info">Info</option>
          <option value="cultural">Cultural</option>
        </select>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {filtered.map((it, idx) => (
          <div key={it.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Text</span>
                <input value={it.text} onChange={(e)=>update(it.id, { text: e.target.value })} style={{ minWidth: 260 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Type</span>
                <select value={it.type} onChange={(e)=>update(it.id, { type: e.target.value })}>
                  <option value="promo">promo</option>
                  <option value="info">info</option>
                  <option value="cultural">cultural</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Action</span>
                <select value={it.action} onChange={(e)=>update(it.id, { action: e.target.value })}>
                  <option value="link">link</option>
                  <option value="modal">modal</option>
                </select>
              </label>
              {it.action === 'link' ? (
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Href</span>
                  <input value={it.href || ''} onChange={(e)=>update(it.id, { href: e.target.value })} placeholder="/shop?sort=top or https://…" />
                </label>
              ) : (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>Modal Title</span>
                    <input value={it.modalTitle || ''} onChange={(e)=>update(it.id, { modalTitle: e.target.value })} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>Modal Body</span>
                    <textarea value={it.modalBody || ''} onChange={(e)=>update(it.id, { modalBody: e.target.value })} />
                  </label>
                </>
              )}
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Start</span>
                <input type="datetime-local" value={it.startAt || ''} onChange={(e)=>update(it.id, { startAt: e.target.value })} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>End</span>
                <input type="datetime-local" value={it.endAt || ''} onChange={(e)=>update(it.id, { endAt: e.target.value })} />
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={it.enabled ?? true} onChange={(e)=>update(it.id, { enabled: e.target.checked })} />
                <span>Enabled</span>
              </label>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button onClick={()=>duplicate(it.id)}>Duplicate</button>
                <button onClick={()=>remove(it.id)} style={{ color: '#b91c1c' }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Preview</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button disabled={items.length <= 1} onClick={()=>setPreviewIdx((i)=> (i-1+items.length)%items.length)}>Prev</button>
          <div style={{ border: '1px dashed #cbd5e1', padding: 12, borderRadius: 8, minHeight: 42, minWidth: 320 }}>
            {items[previewIdx]?.text || 'No items'}
          </div>
          <button disabled={items.length <= 1} onClick={()=>setPreviewIdx((i)=> (i+1)%items.length)}>Next</button>
        </div>
      </div>
    </div>
  );
}

export default AdminMicroBanner;
