// src/pages/AdminTrustTicker.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { DEFAULT_TRUST_MESSAGES, TRUST_MESSAGES_KEY } from '../components/MicroBanner';

function AdminTrustTicker() {
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState('mix'); // 'mix' | 'off'
  const [forceGreen, setForceGreen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TRUST_MESSAGES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch { setItems([]); }
    try { setMode(String(localStorage.getItem('trust-ticker-mode') || 'mix').toLowerCase()); } catch {}
    try { setForceGreen(String(localStorage.getItem('trust-ticker-bargreen') || 'false').toLowerCase() === 'true'); } catch {}
  }, []);

  const persistItems = (next) => {
    setItems(next);
    try { localStorage.setItem(TRUST_MESSAGES_KEY, JSON.stringify(next)); } catch {}
    try { window.dispatchEvent(new CustomEvent('trust:updated')); } catch {}
  };
  const persistMode = (next) => {
    setMode(next);
    try { localStorage.setItem('trust-ticker-mode', String(next)); } catch {}
    try { window.dispatchEvent(new CustomEvent('trust:updated')); } catch {}
  };
  const persistForceGreen = (next) => {
    setForceGreen(next);
    try { localStorage.setItem('trust-ticker-bargreen', String(next)); } catch {}
    try { window.dispatchEvent(new CustomEvent('trust:updated')); } catch {}
  };

  const add = () => {
    const id = `trust-${Date.now()}`;
    persistItems([{ id, text: '', type: 'trust', enabled: true }, ...items]);
  };
  const update = (id, patch) => persistItems(items.map(it => it.id === id ? { ...it, ...patch } : it));
  const remove = (id) => persistItems(items.filter(it => it.id !== id));
  const duplicate = (id) => {
    const orig = items.find(i => i.id === id);
    if (!orig) return;
    const copy = { ...orig, id: `trust-${Date.now()}` };
    persistItems([copy, ...items]);
  };

  const effective = useMemo(() => (items.length ? items : DEFAULT_TRUST_MESSAGES), [items]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin: Trust Ticker</h2>
      <p>Control trust messages interleaved into the microbanner. Changes save locally and broadcast live.</p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={add} style={{ background: 'var(--color-primary)', color: '#fff', border: 0, padding: '8px 12px', borderRadius: 6 }}>Add trust item</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Mode</span>
          <select value={mode} onChange={(e)=>persistMode(e.target.value)}>
            <option value="mix">mix (interleave)</option>
            <option value="off">off (no trust items)</option>
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={forceGreen} onChange={(e)=>persistForceGreen(e.target.checked)} /> force green style for all items
        </label>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {effective.map((it) => (
          <div key={it.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Text</span>
                <input value={it.text} onChange={(e)=>update(it.id, { text: e.target.value })} style={{ minWidth: 260 }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={it.enabled ?? true} onChange={(e)=>update(it.id, { enabled: e.target.checked })} /> Enabled
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
        <div style={{ border: '1px dashed #cbd5e1', padding: 12, borderRadius: 8, minHeight: 42, minWidth: 320 }}>
          {effective.map((i) => i.text).filter(Boolean).join('  •  ') || 'No items'}
        </div>
      </div>
    </div>
  );
}

export default AdminTrustTicker;
