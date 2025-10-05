import React, { useEffect, useMemo, useState } from 'react';
import MegaMenuPromoPanel, { MEGA_PROMOS_KEY } from '../components/MegaMenuPromoPanel'';

// Helper to safely read JSON from localStorage
function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

// Optionally surface categories from the existing mega menu config for convenience
const MEGA_MENU_KEY = 'merkato-mega-menu';

export default function AdminMegaPromos() {
  const [items, setItems] = useState(() => readJson(MEGA_PROMOS_KEY, []));
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [mode, setMode] = useState(() => {
    try { return (localStorage.getItem('merkato-mega-promo-mode') || 'minimal'); } catch { return 'minimal'; }
  });

  // Load once on mount to avoid SSR/localStorage issues
  useEffect(() => {
    setItems(readJson(MEGA_PROMOS_KEY, []));
  }, []);

  // Persist and broadcast updates to live preview surfaces
  const persist = (next) => {
    setItems(next);
    try { localStorage.setItem(MEGA_PROMOS_KEY, JSON.stringify(next)); } catch {}
    try { window.dispatchEvent(new CustomEvent('mega-promo:updated')); } catch {}
  };

  const setPanelMode = (m) => {
    setMode(m);
    try { localStorage.setItem('merkato-mega-promo-mode', m); } catch {}
    try { window.dispatchEvent(new CustomEvent('mega-promo:updated')); } catch {}
  };

  const add = () => {
    const id = `mp-${Date.now()}`;
    const base = { id, title: '', text: '', ctaText: '', href: '/', image: '', type: 'text', enabled: true };
    persist([base, ...items]);
    setSelectedId(id);
  };
  const update = (id, patch) => persist(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id) => {
    const next = items.filter((it) => it.id !== id);
    persist(next);
    if (selectedId === id) setSelectedId(next[0]?.id || null);
  };
  const duplicate = (id) => {
    const orig = items.find((i) => i.id === id);
    if (!orig) return;
    const copy = { ...orig, id: `mp-${Date.now()}` };
    persist([copy, ...items]);
    setSelectedId(copy.id);
  };

  // Derive options from mega menu for convenience (categories/subcategories)
  const menuOptions = useMemo(() => {
    const cfg = readJson(MEGA_MENU_KEY, null);
    const cats = new Set();
    const subs = new Set();
    try {
      if (cfg && Array.isArray(cfg.categories)) {
        cfg.categories.forEach((c) => {
          if (c?.title) cats.add(String(c.title));
          if (Array.isArray(c?.links)) c.links.forEach((l) => l?.text && subs.add(String(l.text)));
        });
      }
    } catch {}
    return { categories: Array.from(cats), subcategories: Array.from(subs) };
  }, [items.length]); // refresh infrequently

  const filtered = useMemo(
    () => items.filter((i) => (filter === 'all' ? true : (i.type || 'text') === filter)),
    [items, filter]
  );
  const selected = useMemo(() => items.find((i) => i.id === selectedId) || items[0] || null, [items, selectedId]);

  const addTag = (field, value) => {
    if (!selected) return;
    const cur = Array.isArray(selected[field]) ? selected[field] : [];
    const next = [...new Set([...cur, value].filter(Boolean))];
    update(selected.id, { [field]: next });
  };
  const removeTag = (field, value) => {
    if (!selected) return;
    const cur = Array.isArray(selected[field]) ? selected[field] : [];
    update(selected.id, { [field]: cur.filter((v) => v !== value) });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, padding: 20 }}>
      <div>
        <h2 style={{ marginBottom: 8 }}>Admin: Mega Menu Promos</h2>
        <p style={{ marginTop: 0, color: '#64748b' }}>
          Create contextual promo blocks that appear in the right panel of the mega menu. Match by subcategory or category; schedule and enable as needed.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '12px 0', flexWrap: 'wrap' }}>
          <button onClick={add} style={{ background: 'var(--color-primary)', color: '#fff', border: 0, padding: '8px 12px', borderRadius: 6 }}>Add Promo</button>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All types</option>
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="cta">CTA</option>
          </select>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>Display mode</span>
            <select value={mode} onChange={(e) => setPanelMode(e.target.value)} title="Choose how the mega promo panel appears">
              <option value="default">colorful</option>
              <option value="minimal">minimal</option>
              <option value="off">off</option>
            </select>
          </label>
          <button onClick={() => persist(items)} title="Save Now">Save</button>
          <button onClick={() => {
            try {
              const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'mega-promos.json'; a.click();
              URL.revokeObjectURL(url);
            } catch {}
          }}>Export JSON</button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="file" accept="application/json" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                try { const arr = JSON.parse(String(reader.result || '[]')); if (Array.isArray(arr)) persist(arr); } catch {}
              };
              reader.readAsText(file);
            }} />
            <span>Import</span>
          </label>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map((it) => (
            <div key={it.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: selectedId === it.id ? '#f8fafc' : '#fff' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="radio" name="selected" checked={(selectedId ?? items[0]?.id) === it.id} onChange={() => setSelectedId(it.id)} title="Select for editing/preview" />
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Title</span>
                  <input value={it.title || ''} onChange={(e) => update(it.id, { title: e.target.value })} style={{ minWidth: 200 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Text</span>
                  <input value={it.text || ''} onChange={(e) => update(it.id, { text: e.target.value })} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Type</span>
                  <select value={it.type || 'text'} onChange={(e) => update(it.id, { type: e.target.value })}>
                    <option value="text">text</option>
                    <option value="image">image</option>
                    <option value="cta">cta</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>CTA Text</span>
                  <input value={it.ctaText || ''} onChange={(e) => update(it.id, { ctaText: e.target.value })} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Href</span>
                  <input value={it.href || ''} onChange={(e) => update(it.id, { href: e.target.value })} placeholder="Use LinkBuilder routes like /discover or a full https:// URL" />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', minWidth: 240 }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Image URL</span>
                  <input value={it.image || ''} onChange={(e) => update(it.id, { image: e.target.value })} placeholder="https://..." />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Start</span>
                  <input type="datetime-local" value={it.startAt || ''} onChange={(e) => update(it.id, { startAt: e.target.value })} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>End</span>
                  <input type="datetime-local" value={it.endAt || ''} onChange={(e) => update(it.id, { endAt: e.target.value })} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={it.enabled ?? true} onChange={(e) => update(it.id, { enabled: e.target.checked })} />
                  <span>Enabled</span>
                </label>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button onClick={() => duplicate(it.id)}>Duplicate</button>
                  <button onClick={() => remove(it.id)} style={{ color: '#b91c1c' }}>Delete</button>
                </div>
              </div>

              {/* Category/Subcategory Tag Editors */}
              <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Match Categories</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {(it.categories || []).map((c) => (
                      <span key={c} style={{ background: '#eef2ff', color: '#3730a3', padding: '3px 8px', borderRadius: 999 }}>
                        {c}
                        <button onClick={() => removeTag('categories', c)} style={{ marginLeft: 6, border: 0, background: 'transparent', color: '#7c3aed' }}>×</button>
                      </span>
                    ))}
                    <input list={`cat-options-${it.id}`} placeholder="Add category" onKeyDown={(e) => {
                      if (e.key === 'Enter') { addTag('categories', e.currentTarget.value.trim()); e.currentTarget.value=''; }
                    }} style={{ minWidth: 160 }} />
                    <datalist id={`cat-options-${it.id}`}>
                      {menuOptions.categories.map((c) => (<option key={c} value={c} />))}
                    </datalist>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Match Subcategories</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {(it.subcategories || []).map((s) => (
                      <span key={s} style={{ background: '#ecfeff', color: '#155e75', padding: '3px 8px', borderRadius: 999 }}>
                        {s}
                        <button onClick={() => removeTag('subcategories', s)} style={{ marginLeft: 6, border: 0, background: 'transparent', color: '#0891b2' }}>×</button>
                      </span>
                    ))}
                    <input list={`sub-options-${it.id}`} placeholder="Add subcategory" onKeyDown={(e) => {
                      if (e.key === 'Enter') { addTag('subcategories', e.currentTarget.value.trim()); e.currentTarget.value=''; }
                    }} style={{ minWidth: 180 }} />
                    <datalist id={`sub-options-${it.id}`}>
                      {menuOptions.subcategories.map((s) => (<option key={s} value={s} />))}
                    </datalist>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 20, color: '#64748b' }}>No promos yet. Click "Add Promo" to create one.</div>
          )}
        </div>
      </div>

      {/* Live Preview Panel */}
      <div>
        <h3 style={{ margin: '8px 0 12px' }}>Live Preview</h3>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          {/* Simulate a couple of categories to see behavior, choose active based on selected tags */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {['Electronics', 'Fashion', 'Home', ...(selected?.categories || [])].slice(0, 6).map((c) => (
              <span key={c} style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8 }}>{c}</span>
            ))}
          </div>
          <MegaMenuPromoPanel
            activeCategory={(selected?.categories || [])[0] || ''}
            activeSubcategory={(selected?.subcategories || [])[0] || ''}
          />
        </div>
      </div>
    </div>
  );
}
