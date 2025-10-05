// src/pages/AdminMicroBanner.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { MICRO_BANNER_KEY } from '../components/MicroBanner'';
import InfoTip from '../components/admin/InfoTip'';

// Utilities for guardrails
function hexToRgb(hex) {
  if (!hex) return null;
  let c = hex.trim();
  if (c.startsWith('var(')) return null; // can't compute CSS var here
  if (c.startsWith('#')) c = c.slice(1);
  if (c.length === 3) c = c.split('').map((ch) => ch + ch).join('');
  const num = parseInt(c, 16);
  if (Number.isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function srgbToLin(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function relativeLuminance({ r, g, b }) {
  const R = srgbToLin(r), G = srgbToLin(g), B = srgbToLin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
function contrastRatio(bgHex, fgHex) {
  const bg = hexToRgb(bgHex), fg = hexToRgb(fgHex);
  if (!bg || !fg) return null;
  const L1 = relativeLuminance(bg);
  const L2 = relativeLuminance(fg);
  const [hi, lo] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

// (Removed local InfoTip; using shared component)

function AdminMicroBanner() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [previewIdx, setPreviewIdx] = useState(0);
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MICRO_BANNER_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch { setItems([]); }
    try {
      const mraw = localStorage.getItem('mb-metrics');
      setMetrics(mraw ? JSON.parse(mraw) : {});
    } catch { setMetrics({}); }
  }, []);

  useEffect(() => {
    const onMetrics = () => {
      try {
        const mraw = localStorage.getItem('mb-metrics');
        setMetrics(mraw ? JSON.parse(mraw) : {});
      } catch { /* no-op */ }
    };
    window.addEventListener('microbanner:metrics', onMetrics);
    window.addEventListener('microbanner:updated', onMetrics);
    window.addEventListener('storage', onMetrics);
    return () => {
      window.removeEventListener('microbanner:metrics', onMetrics);
      window.removeEventListener('microbanner:updated', onMetrics);
      window.removeEventListener('storage', onMetrics);
    };
  }, []);

  const persist = (next) => {
    setItems(next);
    try { localStorage.setItem(MICRO_BANNER_KEY, JSON.stringify(next)); } catch {}
    try { window.dispatchEvent(new CustomEvent('microbanner:updated')); } catch {}
  };

  const resetMetrics = () => {
    try { localStorage.removeItem('mb-metrics'); } catch {}
    setMetrics({});
    try { window.dispatchEvent(new CustomEvent('microbanner:metrics', { detail: { type: 'reset' } })); } catch {}
  };

  const add = () => {
    const id = `mb-${Date.now()}`;
    persist([{ id, text: '', type: 'promo', action: 'link', href: '/', cta: 'Learn more', bg: '', fg: '',
      // Targeting & behavior defaults
      audiences: ['guest'], pages: ['home'], regions: [], language: '',
      stickyDesktopOnly: false, dismissible: true, freqCap: 'oncePerSession', priority: 0,
      status: 'draft', enabled: false
    }, ...items]);
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

  const canPublish = (it) => {
    // Guardrails: one line length and contrast if explicit colors provided
    const tooLong = (it?.text || '').length > 110;
    let lowContrast = false;
    if (it?.bg && it?.fg && it.bg.startsWith('#') && it.fg.startsWith('#')) {
      const cr = contrastRatio(it.bg, it.fg);
      lowContrast = cr !== null && cr < 4.5;
    }
    return !tooLong && !lowContrast;
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Micro‑banners Manager</h2>
  <p>Manage rotating microbanners above the public navbar. Changes save locally and broadcast live. <InfoTip text="Draft vs live is controlled with the Publish / Unpublish buttons; metrics are local only." /></p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={add} style={{ background: 'var(--color-primary)', color: '#fff', border: 0, padding: '8px 12px', borderRadius: 6 }}>Add</button>
        <select value={filter} onChange={(e)=>setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="trust">Trust</option>
          <option value="info">Info</option>
          <option value="promo">Promo</option>
          <option value="warning">Warning</option>
          <option value="danger">Danger</option>
          <option value="neutral">Neutral</option>
        </select>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {filtered.map((it, idx) => (
          <div key={it.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Text <InfoTip text="Keep under ~110 chars for a single concise line." /></span>
                <input value={it.text} onChange={(e)=>update(it.id, { text: e.target.value })} style={{ minWidth: 260 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Type <InfoTip text="Semantic style; also influences default theming." /></span>
                <select value={it.type} onChange={(e)=>update(it.id, { type: e.target.value })}>
                  <option value="trust">trust</option>
                  <option value="info">info</option>
                  <option value="promo">promo</option>
                  <option value="warning">warning</option>
                  <option value="danger">danger</option>
                  <option value="neutral">neutral</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Action <InfoTip text="Link opens a URL. Modal shows inline content (title + body)." /></span>
                <select value={it.action} onChange={(e)=>update(it.id, { action: e.target.value })}>
                  <option value="link">link</option>
                  <option value="modal">modal</option>
                </select>
              </label>
              {it.action === 'link' ? (
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Href <InfoTip text="Internal (/discover or builder-based) or absolute (https://). UTM copy helpers on right." /></span>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:6 }}>
                    <input value={it.href || ''} onChange={(e)=>update(it.id, { href: e.target.value })} placeholder="/discover or a full https://…" />
                    <button type="button" disabled={!it.href} title="Copy" onClick={()=>{
                      try { navigator.clipboard.writeText(it.href); } catch {}
                    }}>Copy</button>
                    <button type="button" disabled={!it.href} title="Copy + basic UTM" onClick={()=>{
                      try {
                        const url = new URL(it.href, window.location.origin);
                        if (!url.searchParams.get('utm_source')) url.searchParams.set('utm_source','microbanner');
                        if (!url.searchParams.get('utm_medium')) url.searchParams.set('utm_medium','header');
                        if (!url.searchParams.get('utm_campaign')) url.searchParams.set('utm_campaign','promo');
                        navigator.clipboard.writeText(url.pathname + (url.search||'') + (url.hash||''));
                      } catch { /* no-op */ }
                    }}>Copy+UTM</button>
                  </div>
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
                <span style={{ fontSize: 12, opacity: 0.7 }}>CTA Label</span>
                <input value={it.cta || ''} onChange={(e)=>update(it.id, { cta: e.target.value })} placeholder="e.g., Shop now" />
              </label>
              {/* Colors with presets and pickers */}
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>BG Color <InfoTip text="Optional override; keep good contrast with text." /></span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={it.bg || ''} onChange={(e)=>update(it.id, { bg: e.target.value })}>
                      <option value="">Default (auto)</option>
                      <option value="#FFF7ED">Amber 50</option>
                      <option value="#EFF6FF">Blue 50</option>
                      <option value="#F1F5F9">Slate 100</option>
                      <option value="#FEF3C7">Amber 100</option>
                      <option value="#FEF2F2">Red 50</option>
                      <option value="#ECFDF5">Mint 50</option>
                    </select>
                    <input type="color" value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(it.bg||'') ? it.bg : '#ffffff'} onChange={(e)=>update(it.id, { bg: e.target.value })} title="Pick custom BG color" />
                  </div>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>FG Color <InfoTip text="Optional foreground override." /></span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={it.fg || ''} onChange={(e)=>update(it.id, { fg: e.target.value })}>
                      <option value="">Default (auto)</option>
                      <option value="#111827">Ink (near black)</option>
                      <option value="#0f172a">Slate 900</option>
                      <option value="#065f46">Green 800</option>
                      <option value="#1f2937">Gray 800</option>
                    </select>
                    <input type="color" value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(it.fg||'') ? it.fg : '#111827'} onChange={(e)=>update(it.id, { fg: e.target.value })} title="Pick custom FG color" />
                  </div>
                </label>
              </div>
              {/* Targeting */}
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Audiences <InfoTip text="Multi-select: show only to these user roles." /></span>
                <select multiple value={it.audiences || []} onChange={(e)=>{
                  const vals = Array.from(e.target.selectedOptions).map(o=>o.value);
                  update(it.id, { audiences: vals });
                }} style={{ minWidth: 160, height: 70 }}>
                  <option value="guest">guest</option>
                  <option value="customer">customer</option>
                  <option value="vendor">vendor</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Pages <InfoTip text="Match contexts like home/product/cart. Leave many selected only if needed." /></span>
                <select multiple value={it.pages || []} onChange={(e)=>{
                  const vals = Array.from(e.target.selectedOptions).map(o=>o.value);
                  update(it.id, { pages: vals });
                }} style={{ minWidth: 160, height: 90 }}>
                  <option value="home">Home</option>
                  <option value="category">Category</option>
                  <option value="product">Product</option>
                  <option value="cart">Cart</option>
                </select>
              </label>
              {/* Regions and Language pickers */}
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Regions/Countries <InfoTip text="Geographic targeting (multi). Empty = all." /></span>
                <select multiple value={(it.regions || [])} onChange={(e)=>{
                  const vals = Array.from(e.target.selectedOptions).map(o=>o.value.toUpperCase());
                  update(it.id, { regions: vals });
                }} style={{ minWidth: 220, height: 100 }}>
                  {['ALL','ET','KE','NG','GH','US','GB','AE','SA','DE','FR','CA','AU','IN','CN'].map(c => (
                    <option key={c} value={c === 'ALL' ? '' : c}>{c === 'ALL' ? 'All regions' : c}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Language <InfoTip text="Target a single locale or leave All." /></span>
                <select value={it.language || ''} onChange={(e)=>update(it.id, { language: e.target.value })}>
                  <option value="">All languages</option>
                  {[
                    ['en','English'], ['am','Amharic'], ['om','Oromo'], ['ti','Tigrinya'],
                    ['sw','Swahili'], ['fr','French'], ['ar','Arabic'], ['es','Spanish'], ['de','German']
                  ].map(([code,label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Start <InfoTip text="Eligibility begins at this time (local)." /></span>
                <input type="datetime-local" value={it.startAt || ''} onChange={(e)=>update(it.id, { startAt: e.target.value })} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>End <InfoTip text="Slide stops being eligible after this time." /></span>
                <input type="datetime-local" value={it.endAt || ''} onChange={(e)=>update(it.id, { endAt: e.target.value })} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Priority <InfoTip text="Lower number surfaces first when multiple eligible." /></span>
                <input type="number" value={Number(it.priority || 0)} onChange={(e)=>update(it.id, { priority: Number(e.target.value||0) })} />
              </label>
              {/* Behavior */}
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={it.stickyDesktopOnly || false} onChange={(e)=>update(it.id, { stickyDesktopOnly: e.target.checked })} />
                <span>Sticky on desktop only</span>
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={it.dismissible ?? true} onChange={(e)=>update(it.id, { dismissible: e.target.checked })} />
                <span>Dismissible</span>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Frequency cap <InfoTip text="Limit how often a user sees this banner." /></span>
                <select value={it.freqCap || 'oncePerSession'} onChange={(e)=>update(it.id, { freqCap: e.target.value })}>
                  <option value="always">always</option>
                  <option value="oncePerSession">oncePerSession</option>
                  <option value="oncePerDay">oncePerDay</option>
                </select>
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

            {/* Guardrails status and publish controls */}
            <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: (it.text?.length || 0) > 110 ? '#b91c1c' : '#64748b' }}>
                {`Length: ${(it.text?.length || 0)} / 110`}
              </span>
              {it.bg && it.fg && (
                <span style={{ fontSize: 12, color: (contrastRatio(it.bg, it.fg) ?? 5) >= 4.5 ? '#16a34a' : '#b91c1c' }}>
                  {(() => {
                    const cr = contrastRatio(it.bg, it.fg);
                    return cr ? `Contrast: ${cr.toFixed(2)}${cr < 4.5 ? ' (low)' : ''}` : 'Contrast: n/a';
                  })()}
                </span>
              )}
              {/* Metrics */}
              {(() => {
                const m = metrics[it.id] || { impressions: 0, clicks: 0, dismisses: 0 };
                const ctr = m.impressions > 0 ? ((m.clicks / m.impressions) * 100).toFixed(1) : '0.0';
                return (
                  <span style={{ fontSize: 12, color: '#334155' }}>
                    {`Impr: ${m.impressions} · Clicks: ${m.clicks} · Dismiss: ${m.dismisses} · CTR: ${ctr}%`}
                  </span>
                );
              })()}
              <button
                onClick={() => update(it.id, { enabled: true, status: 'live' })}
                disabled={!canPublish(it)}
                title={!canPublish(it) ? 'Fix length or contrast before publishing' : 'Publish'}
              >Publish</button>
              <button onClick={() => update(it.id, { enabled: false, status: 'draft' })}>Unpublish</button>
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
          <button onClick={resetMetrics} title="Clear local metrics for all banners">Reset Metrics</button>
        </div>
      </div>
    </div>
  );
}

export default AdminMicroBanner;
