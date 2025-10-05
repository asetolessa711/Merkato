// src/pages/AdminHeroBanners.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import InfoTip from '../components/admin/InfoTip'';
import HeroBar from '../components/HeroBar/HeroBar'';
import { uploadProductImage } from '../utils/uploadImage'';
import {
  loadHeroBanners,
  saveHeroBanners,
  resolveHeroSlides,
  eligibleHeroSlides,
  presetsBg,
  newSlideTemplate,
  upsertBanner,
  deleteBanner,
  getHeroMetrics,
  resetHeroMetrics,
  loadHeroTemplates,
  saveHeroTemplates,
  createTemplateFromSlide,
  deleteHeroTemplate,
  applyHeroTemplate,
} from '../utils/heroBanners'';

const roles = ['all', 'guest', 'customer', 'vendor', 'admin'];
const languages = ['all', 'en', 'en-US', 'en-GB', 'am', 'fr', 'de', 'es'];
const countries = ['US','GB','CA','AU','DE','FR','IT','ES','ET','KE','NG','GH'];

export default function AdminHeroBanners() {
  const [list, setList] = useState(() => loadHeroBanners());
  const [editing, setEditing] = useState(null);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [previewAllowNavigate, setPreviewAllowNavigate] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewPath, setPreviewPath] = useState('/');
  const [previewIncludeDrafts, setPreviewIncludeDrafts] = useState(true);
  const [templates, setTemplates] = useState(() => loadHeroTemplates());
  // Slides list filter
  const [listFilter, setListFilter] = useState('all'); // all | published | drafts
  // QoL: UTM builder for CTAs (ephemeral UI state)
  const [utmEnabled, setUtmEnabled] = useState(false);
  const [utmSource, setUtmSource] = useState('merkato');
  const [utmMedium, setUtmMedium] = useState('hero');
  const utmCampaign = useMemo(() => (editing?.title || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''), [editing?.title]);
  // Copy feedback (CTA links)
  const [copiedPriAt, setCopiedPriAt] = useState(0);
  const [copiedPriUtmAt, setCopiedPriUtmAt] = useState(0);
  const [copiedSecAt, setCopiedSecAt] = useState(0);
  const [copiedSecUtmAt, setCopiedSecUtmAt] = useState(0);
  // Preview zoom (admin-only): fit-to-window or manual percent
  const [zoomMode, setZoomMode] = useState('fit'); // 'fit' | 'manual'
  const [zoom, setZoom] = useState(1); // manual zoom factor (e.g., 1 = 100%)
  const [fitScale, setFitScale] = useState(1);
  const previewBoxRef = useRef(null);

  const metrics = useMemo(() => getHeroMetrics(), [list, showMetrics]);

  // Derived counts for quick stats
  const counts = useMemo(() => {
    const publishedCount = list.filter((s) => s.published !== false).length;
    const draftsCount = list.filter((s) => s.published === false).length;
    return { total: list.length, publishedCount, draftsCount };
  }, [list]);

  // Filtered list for list view
  const filteredList = useMemo(() => {
    if (listFilter === 'published') return list.filter((s) => s.published !== false);
    if (listFilter === 'drafts') return list.filter((s) => s.published === false);
    return list;
  }, [list, listFilter]);

  // Eligibility (uncapped) and resolved (capped to 6) banners for the preview
  const eligibleAll = useMemo(() => eligibleHeroSlides({ currentPath: previewPath, includeDrafts: previewIncludeDrafts }), [list, previewPath, previewIncludeDrafts]);
  const resolvedSlides = useMemo(() => resolveHeroSlides({ currentPath: previewPath, includeDrafts: previewIncludeDrafts }), [list, previewPath, previewIncludeDrafts]);

  const hasPriorityTies = useMemo(() => {
    const seen = new Set();
    for (const s of eligibleAll) {
      const p = Number(s.priority || 0);
      if (seen.has(p)) return true;
      seen.add(p);
    }
    return false;
  }, [eligibleAll]);

  const isCheckoutOrAuth = useMemo(() => /^(\/checkout|\/login|\/signin|\/signup|\/auth)/.test(previewPath), [previewPath]);

  // Device specific sizing (preview surface dimensions before scaling)
  const deviceWidth = previewDevice === 'desktop' ? 1280 : previewDevice === 'tablet' ? 834 : 390; // simplified tablet/mobile widths
  const deviceHeight = 420; // fixed hero height (sync with HeroBar default)

  // Fit-to-window scaling logic
  useEffect(() => {
    if (zoomMode !== 'fit') return; // manual mode ignores fitScale computation
    const el = previewBoxRef.current;
    if (!el) return;
    const recompute = () => {
      if (!el) return;
      const avail = el.clientWidth - 16; // padding margin
      const scale = Math.min(1, Math.max(0.1, avail / deviceWidth));
      setFitScale(scale);
    };
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, [zoomMode, previewDevice, deviceWidth]);

  const effectiveScale = zoomMode === 'manual' ? zoom : fitScale;
  const scaledHeight = deviceHeight * effectiveScale + 8; // include small buffer

  function copyText(val, setFlag) {
    try { if (val) navigator.clipboard.writeText(val); } catch (_) {}
    setFlag(Date.now());
  }

  // Helper: distribute unique priorities among currently eligible slides
  const distributeEligiblePriorities = () => {
    const eligibleIds = new Set(eligibleAll.map((s) => s.id));
    // Assign compact ascending priorities in steps of 10 to keep room between
    const orderedEligible = eligibleAll.map((s, i) => ({ id: s.id, priority: i * 10 }));
    const next = list.map((s) => {
      if (!s || !s.id) return s;
      const found = orderedEligible.find((e) => e.id === s.id);
      return found ? { ...s, priority: found.priority } : s;
    });
    saveHeroBanners(next);
    setList(next);
  };

  const startNew = () => {
    const slide = newSlideTemplate();
    const next = upsertBanner(slide);
    setList(next);
    setEditing(slide);
  };
  const startFromTemplate = (tpl) => {
    const draft = applyHeroTemplate(tpl);
    const next = upsertBanner(draft);
    setList(next);
    setEditing(draft);
  };
  const saveEdit = () => {
    if (!editing) return;
    // Optionally append UTM params to CTAs on save (does not persist the utm UI state)
    const withUtm = utmEnabled ? {
      ...editing,
      ctaHref: appendUtm(editing.ctaHref, { source: utmSource, medium: utmMedium, campaign: utmCampaign }),
      secondaryCtaHref: appendUtm(editing.secondaryCtaHref, { source: utmSource, medium: utmMedium, campaign: utmCampaign }),
    } : editing;
    const next = upsertBanner(withUtm);
    setList(next);
    setEditing(null);
  };
  const cancelEdit = () => setEditing(null);
  const remove = (id) => setList(deleteBanner(id));
  const saveCurrentAsTemplate = () => {
    if (!editing) return;
    const name = prompt('Template name?', editing.title || 'My template');
    const next = createTemplateFromSlide(editing, name);
    setTemplates(next);
  };
  const togglePublish = (item) => {
    const next = list.map((s) => (s.id === item.id ? { ...s, published: !s.published } : s));
    saveHeroBanners(next);
    setList(next);
  };
  const move = (index, dir) => {
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    const tmp = next[index];
    next[index] = next[j];
    next[j] = tmp;
    saveHeroBanners(next);
    setList(next);
  };

  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 1400, margin: '0 auto', padding: '12px 16px 40px' }}>
      {/* Header / toolbar */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <strong>Marketing Manager • Hero Banners</strong>
            <HelpInline />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={startNew}>New hero slide</button>
            <button onClick={() => setShowMetrics((v) => !v)}>{showMetrics ? 'Hide metrics' : 'Show metrics'}</button>
            {showMetrics && <button onClick={() => { resetHeroMetrics(); setShowMetrics(true); }} title="Reset local metrics">Reset metrics</button>}
          </div>
        </div>
        <div style={{ padding: 10, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {/* Device selector */}
          <label style={{ fontSize: 13 }}>Device:
            <select value={previewDevice} onChange={(e) => setPreviewDevice(e.target.value)} style={{ marginLeft: 6 }}>
              <option value="desktop">Desktop</option>
              <option value="tablet">Tablet</option>
              <option value="mobile">Mobile</option>
            </select>
          </label>
          {/* Zoom selector */}
          <label style={{ fontSize: 13 }}>Zoom:
            <select
              style={{ marginLeft: 6 }}
              value={zoomMode === 'fit' ? 'fit' : String(Math.round(zoom * 100))}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'fit') { setZoomMode('fit'); }
                else {
                  setZoomMode('manual');
                  const pct = Math.max(25, Math.min(200, parseInt(val, 10) || 100));
                  setZoom(pct / 100);
                }
              }}
            >
              <option value="fit">Fit to window</option>
              <option value="100">100%</option>
              <option value="90">90%</option>
              <option value="75">75%</option>
              <option value="67">67%</option>
              <option value="50">50%</option>
              <option value="33">33%</option>
            </select>
            <InfoTip text="Fit scales the hero within the available width; choose a fixed % for manual inspection." />
          </label>
          <label style={{ fontSize: 13 }}>
            <input type="checkbox" checked={previewAllowNavigate} onChange={(e)=>setPreviewAllowNavigate(e.target.checked)} />
            <span style={{ marginLeft: 6 }}>Allow navigation</span>
            <InfoTip text="Enable this to click links in the preview. Disable to prevent accidental navigation while editing." />
          </label>
          <label style={{ fontSize: 13 }}>
            <span style={{ marginRight: 6 }}>Route:</span>
            <select value={previewPath} onChange={(e)=>setPreviewPath(e.target.value)}>
              <option value="/">/ (home)</option>
              <option value="/discover">/discover</option>
              <option value="/category/electronics">/category/electronics</option>
              <option value="/deals">/deals</option>
            </select>
            <InfoTip text="Preview on different pages to validate targeting and layout." />
          </label>
          <label style={{ fontSize: 13 }}>
            <span style={{ marginRight: 6 }}>Custom:</span>
            <input value={previewPath} onChange={(e)=>setPreviewPath(e.target.value)} placeholder="/your/path" style={{ width: 160 }} />
          </label>
            <label style={{ fontSize: 13 }}>
              <input type="checkbox" checked={previewIncludeDrafts} onChange={(e)=>setPreviewIncludeDrafts(e.target.checked)} />
              <span style={{ marginLeft: 6 }}>Include drafts</span>
              <InfoTip text="Drafts appear in preview only. Publish when ready to go live." />
            </label>
        </div>
      </div>

      {/* Live preview using runtime resolver */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <strong>Hero banners (runtime preview)</strong>
          <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: 12 }}>
            {resolvedSlides.length} shown • {eligibleAll.length} eligible for “{previewPath}”
          </span>
        </div>
        {eligibleAll.length > 6 && (
          <div style={{ background: '#FEF3C7', color: '#78350F', padding: '8px 12px', borderBottom: '1px solid #FDE68A' }}>
            More than 6 slides match this context. The resolver will only show the top 6 by priority.
            <button onClick={distributeEligiblePriorities} style={{ marginLeft: 8 }}>Distribute priorities</button>
          </div>
        )}
        {hasPriorityTies && (
          <div style={{ background: '#FEF3C7', color: '#78350F', padding: '8px 12px', borderBottom: '1px solid #FDE68A' }}>
            Some eligible slides share the same priority. Order will fall back to recency. Consider distributing priorities.
            <button onClick={distributeEligiblePriorities} style={{ marginLeft: 8 }}>Distribute priorities</button>
          </div>
        )}
        {isCheckoutOrAuth && (
          <div style={{ background: '#DBEAFE', color: '#1E40AF', padding: '8px 12px', borderBottom: '1px solid #BFDBFE' }}>
            Checkout/Auth context: In production, heroes may be suppressed to minimize friction. Preview is still shown here.
          </div>
        )}
        <div
          ref={previewBoxRef}
          style={{ width: '100%', margin: '8px auto 14px', position: 'relative' }}
          onClick={(e) => {
            if (previewAllowNavigate) return;
            const path = e.composedPath?.() || [];
            const a = path.find((el) => el && el.tagName === 'A');
            if (a) { e.preventDefault(); e.stopPropagation(); }
          }}
        >
          {/* Scaled preview surface */}
          <div style={{ height: scaledHeight, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                transform: `translateX(-50%) scale(${effectiveScale})`,
                transformOrigin: 'top center',
                width: deviceWidth,
                height: deviceHeight,
              }}
            >
              {/* Quick upload overlay for preview */}
              <label style={{ position: 'absolute', right: 8, top: 8, zIndex: 2 }}>
                <span className="btn btn--secondary" style={{ cursor: 'pointer' }}>Upload images</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={async (e)=>{
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    try {
                      setIsUploading(true);
                      const token = localStorage.getItem('token') || localStorage.getItem('merkato-token') || '';
                      const urls = await uploadProductImage(files, token);
                      let current = list;
                      urls.forEach((u) => {
                        current = upsertBanner({ ...(newSlideTemplate()), id: `hero_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, imageUrl: u });
                      });
                      setList(current);
                    } finally { setIsUploading(false); }
                  }}
                />
              </label>
              <HeroBar slides={resolvedSlides} height={deviceHeight} />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {showMetrics && (
        <details open style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
          <summary style={{ padding: '10px 12px', cursor: 'pointer' }}>Local metrics</summary>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 12 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Per-slide summary</div>
              <SlideMetricsTable slides={list} metrics={metrics} />
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Raw data</div>
              <pre style={{ margin: 0, padding: 12, maxHeight: 300, overflow: 'auto', background: '#0f172a', color: '#e2e8f0', borderRadius: 8 }}>{JSON.stringify(metrics, null, 2)}</pre>
            </div>
          </div>
        </details>
      )}

      {/* List */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <strong>Slides</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>All {counts.total} • Published {counts.publishedCount} • Drafts {counts.draftsCount}</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Filter:</span>
              <select value={listFilter} onChange={(e)=>setListFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="published">Published</option>
                <option value="drafts">Drafts</option>
              </select>
            </label>
          </div>
        </div>
        <div>
          {list.length === 0 && (
            <p style={{ padding: 12, color: '#64748b' }}>No slides yet. Click “New hero slide”.</p>
          )}
          {list.length > 0 && filteredList.length === 0 && (
            <p style={{ padding: 12, color: '#64748b' }}>No slides match the “{listFilter}” filter.</p>
          )}
          {filteredList.map((s, i) => {
            const idx = list.findIndex((x) => x.id === s.id);
            return (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 12, padding: '8px 12px', borderTop: '1px solid #eef2f7' }}>
              <div style={{ width: 72, height: 42, borderRadius: 6, border: '1px solid #e5e7eb', overflow: 'hidden', background: s.bg, display: 'grid', placeItems: 'center' }}>
                {s.imageUrl ? <img src={s.imageUrl} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 10, color: '#334155' }}>{s.type || 'copy'}</span>}
              </div>
              <div>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {contrastChip(s.bg)}
                  <span>{s.title}</span>
                  <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 6px', borderRadius: 999, border: '1px solid #e5e7eb', color: s.published === false ? '#6B7280' : '#065F46', background: s.published === false ? '#F3F4F6' : '#ECFDF5' }}>
                    {s.published === false ? 'Draft' : 'Published'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{s.subtitle}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>pages: {Array.isArray(s.pages) && s.pages.length ? s.pages.join(', ') : 'all'} • roles: {Array.isArray(s.roles) && s.roles.length ? s.roles.join(', ') : 'all'} • lang: {s.language || 'all'} • regions: {Array.isArray(s.regions) && s.regions.length ? s.regions.join(', ') : 'all'}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setEditing(s)}>Edit</button>
                <button onClick={() => { const clone = { ...s, id: `hero_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, createdAt: new Date().toISOString() }; const next = upsertBanner(clone); setList(next); }}>Duplicate</button>
                <button onClick={() => togglePublish(s)}>{s.published === false ? 'Publish' : 'Unpublish'}</button>
                <button onClick={() => remove(s.id)} aria-label={`Delete ${s.title}`}>Delete</button>
                <button onClick={() => move(idx, -1)} disabled={idx===0}>↑</button>
                <button onClick={() => move(idx, 1)} disabled={idx===list.length-1}>↓</button>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Editor */}
      {editing && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong>Edit slide</strong>
            <div>
              <button onClick={startNew}>New blank</button>
              <div style={{ display: 'inline-block', position: 'relative', marginLeft: 6 }}>
                <details>
                  <summary style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>New from template</summary>
                  <div style={{ position: 'absolute', right: 0, zIndex: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: 8, minWidth: 220 }}>
                    {/* Built-in background presets */}
                    {presetsBg().map((p) => (
                      <button key={p.key} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, padding: 6 }} onClick={() => setEditing({ ...newSlideTemplate(), bg: p.value })}>
                        <span style={{ width: 14, height: 14, borderRadius: 3, background: p.value, border: '1px solid #e5e7eb' }} />
                        <span>{p.label}</span>
                      </button>
                    ))}
                    <div style={{ height: 1, background: '#e5e7eb', margin: '6px 0' }} />
                    {/* User saved templates */}
                    {templates.length === 0 && (
                      <div style={{ fontSize: 12, color: '#64748b', padding: '4px 6px' }}>No saved templates yet.</div>
                    )}
                    {templates.map((t) => (
                      <div key={t.templateId} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 6, alignItems: 'center', padding: '4px 0' }}>
                        <button style={{ textAlign: 'left' }} onClick={() => startFromTemplate(t)} title={new Date(t.createdAt).toLocaleString()}>
                          {t.name}
                        </button>
                        <button title="Use" onClick={() => startFromTemplate(t)}>Use</button>
                        <button title="Delete template" onClick={() => setTemplates(deleteHeroTemplate(t.templateId))}>✕</button>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
              <button style={{ marginLeft: 6 }} onClick={saveCurrentAsTemplate} disabled={!editing}>Save as Template</button>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 10, padding: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Status:</span>
              <button type="button" onClick={() => setEditing({ ...editing, published: false })} disabled={editing.published === false}>Mark Draft</button>
              <button type="button" onClick={() => setEditing({ ...editing, published: true })} disabled={editing.published === true}>Publish</button>
              <span style={{ fontSize: 12, color: editing.published === false ? '#6B7280' : '#065F46', padding: '2px 6px', borderRadius: 999, border: '1px solid #e5e7eb', background: editing.published === false ? '#F3F4F6' : '#ECFDF5' }}>{editing.published === false ? 'Draft' : 'Published'}</span>
            </div>
            <label>Title<input value={editing.title} onChange={(e)=>setEditing({ ...editing, title: e.target.value })} /></label>
            <label>Subtitle<input value={editing.subtitle} onChange={(e)=>setEditing({ ...editing, subtitle: e.target.value })} /></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label>Primary CTA text<input value={editing.ctaText || ''} onChange={(e)=>setEditing({ ...editing, ctaText: e.target.value })} /></label>
              <label>Primary CTA href
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 6 }}>
                  <input value={editing.ctaHref || ''} onChange={(e)=>setEditing({ ...editing, ctaHref: e.target.value })} />
                  <button type="button" disabled={!editing.ctaHref} title="Copy"
                    onClick={() => copyText(editing.ctaHref, setCopiedPriAt)}
                  >{Date.now() - copiedPriAt < 1500 ? 'Copied' : 'Copy'}</button>
                  <button type="button" disabled={!editing.ctaHref} title="Copy with UTM"
                    onClick={() => copyText(appendUtm(editing.ctaHref, { source: utmSource, medium: utmMedium, campaign: utmCampaign }), setCopiedPriUtmAt)}
                  >{Date.now() - copiedPriUtmAt < 1500 ? 'Copied+UTM' : 'Copy+UTM'}</button>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Quick copy helpers <InfoTip text="Copy the link as-is, or append UTM params for marketing tracking." /></div>
              </label>
              <label>Secondary CTA text<input value={editing.secondaryCtaText || ''} onChange={(e)=>setEditing({ ...editing, secondaryCtaText: e.target.value })} /></label>
              <label>Secondary CTA href
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 6 }}>
                  <input value={editing.secondaryCtaHref || ''} onChange={(e)=>setEditing({ ...editing, secondaryCtaHref: e.target.value })} />
                  <button type="button" disabled={!editing.secondaryCtaHref} title="Copy"
                    onClick={() => copyText(editing.secondaryCtaHref, setCopiedSecAt)}
                  >{Date.now() - copiedSecAt < 1500 ? 'Copied' : 'Copy'}</button>
                  <button type="button" disabled={!editing.secondaryCtaHref} title="Copy with UTM"
                    onClick={() => copyText(appendUtm(editing.secondaryCtaHref, { source: utmSource, medium: utmMedium, campaign: utmCampaign }), setCopiedSecUtmAt)}
                  >{Date.now() - copiedSecUtmAt < 1500 ? 'Copied+UTM' : 'Copy+UTM'}</button>
                </div>
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label>
                Layout type
                <select value={editing.type || 'copy-image-right'} onChange={(e)=>setEditing({ ...editing, type: e.target.value })}>
                  <option value="copy-image-right">Copy + Image Right</option>
                  <option value="image-left">Image Left + Copy</option>
                  <option value="split-50">Split 50/50</option>
                  <option value="copy-only">Copy Only</option>
                  <option value="image-only">Image Only</option>
                </select>
              </label>
              <span />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label>Image URL (desktop)<input value={editing.imageUrl} onChange={(e)=>setEditing({ ...editing, imageUrl: e.target.value })} /></label>
              <label>Image URL (tablet)<input value={editing.imageTabletUrl || ''} onChange={(e)=>setEditing({ ...editing, imageTabletUrl: e.target.value })} /></label>
              <label>Image URL (mobile)<input value={editing.imageMobileUrl || ''} onChange={(e)=>setEditing({ ...editing, imageMobileUrl: e.target.value })} /></label>
              <label>Image Alt<input value={editing.imageAlt || ''} onChange={(e)=>setEditing({ ...editing, imageAlt: e.target.value })} /></label>
              <div>
                <label>Upload image (single)</label>
                <input type="file" accept="image/*" onChange={async (e)=>{
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setIsUploading(true);
                    const token = localStorage.getItem('token') || localStorage.getItem('merkato-token') || '';
                    const urls = await uploadProductImage(file, token);
                    if (urls[0]) setEditing({ ...editing, imageUrl: urls[0] });
                  } finally { setIsUploading(false); }
                }} />
              </div>
              <div>
                <label>Upload tablet image</label>
                <input type="file" accept="image/*" onChange={async (e)=>{
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setIsUploading(true);
                    const token = localStorage.getItem('token') || localStorage.getItem('merkato-token') || '';
                    const urls = await uploadProductImage(file, token);
                    if (urls[0]) setEditing({ ...editing, imageTabletUrl: urls[0] });
                  } finally { setIsUploading(false); }
                }} />
              </div>
              <div>
                <label>Upload mobile image</label>
                <input type="file" accept="image/*" onChange={async (e)=>{
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setIsUploading(true);
                    const token = localStorage.getItem('token') || localStorage.getItem('merkato-token') || '';
                    const urls = await uploadProductImage(file, token);
                    if (urls[0]) setEditing({ ...editing, imageMobileUrl: urls[0] });
                  } finally { setIsUploading(false); }
                }} />
              </div>
              <div>
                <label>Bulk upload (multiple)</label>
                <input multiple type="file" accept="image/*" onChange={async (e)=>{
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  try {
                    setIsUploading(true);
                    const token = localStorage.getItem('token') || localStorage.getItem('merkato-token') || '';
                    const urls = await uploadProductImage(files, token);
                    // Create a slide per uploaded image, copying current fields as template
                    let current = list;
                    urls.forEach((u) => {
                      current = upsertBanner({ ...(editing || newSlideTemplate()), id: `hero_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, imageUrl: u });
                    });
                    setList(current);
                  } finally { setIsUploading(false); }
                }} />
              </div>
              {isUploading && <div style={{ color: '#64748b' }}>Uploading…</div>}
            </div>
            {/* Focal point picker */}
            <div>
              <label>Image focal point <InfoTip text="Helps position the most important part of the image across devices (maps to CSS object-position)." /></label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 28px)', gap: 6, marginTop: 6 }}>
                {[
                  '0% 0%','50% 0%','100% 0%',
                  '0% 50%','50% 50%','100% 50%',
                  '0% 100%','50% 100%','100% 100%'
                ].map((pos) => (
                  <button key={pos} type="button" title={pos}
                    onClick={() => setEditing({ ...editing, imageFocal: pos })}
                    style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #e5e7eb', background: (editing.imageFocal || '50% 50%') === pos ? '#DBEAFE' : '#fff' }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Controls how the image is positioned inside its frame (object-position).</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label>Background preset <InfoTip text="Choose the slide theme/background. Adjusts contrast guidance automatically." />
                <select value={editing.bg} onChange={(e)=>setEditing({ ...editing, bg: e.target.value })}>{presetsBg().map((p)=> <option key={p.key} value={p.value}>{p.label}</option>)}</select>
              </label>
              <label>Priority <InfoTip text="Lower number = higher priority. Up to 6 slides show per context. Resolve ties or use 'Distribute priorities'." />
                <input type="number" value={editing.priority || 0} onChange={(e)=>setEditing({ ...editing, priority: Number(e.target.value) })} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>Start At <InfoTip text="Slide becomes eligible at this time (inclusive). Leave empty to start immediately." />
                  <input type="datetime-local" value={toLocal(editing.startAt)} onChange={(e)=>setEditing({ ...editing, startAt: fromLocal(e.target.value) })} />
                </label>
                <label>End At <InfoTip text="Slide stops being eligible at this time. Leave empty for no end date." />
                  <input type="datetime-local" value={toLocal(editing.endAt)} onChange={(e)=>setEditing({ ...editing, endAt: fromLocal(e.target.value) })} />
                </label>
            </div>
              {/* Quick scheduling presets */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>Quick schedule:</span>
                <button type="button" onClick={() => {
                  const start = new Date();
                  const end = new Date(); end.setHours(23,59,0,0);
                  setEditing({ ...editing, startAt: start.toISOString(), endAt: end.toISOString() });
                }}>Today</button>
                <button type="button" onClick={() => {
                  const start = new Date();
                  const end = nextWeekendEnd();
                  setEditing({ ...editing, startAt: start.toISOString(), endAt: end.toISOString() });
                }}>This weekend</button>
                <button type="button" onClick={() => {
                  const start = new Date();
                  const end = new Date(Date.now() + 7*24*60*60*1000);
                  setEditing({ ...editing, startAt: start.toISOString(), endAt: end.toISOString() });
                }}>7 days</button>
                <button type="button" onClick={() => setEditing({ ...editing, startAt: null, endAt: null })}>Clear</button>
              </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <label>Pages (comma); e.g. "/", "/discover" <InfoTip text="Comma-separated paths. Leave empty to allow all pages." />
                <input value={(editing.pages||[]).join(', ')} onChange={(e)=>setEditing({ ...editing, pages: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} />
              </label>
              <label>Roles <InfoTip text="Pick a single audience or 'all'. Avoid mixing 'all' with specific roles." />
                <select value={(editing.roles && editing.roles[0]) || 'all'} onChange={(e)=>setEditing({ ...editing, roles: [e.target.value] })}>{roles.map((r)=>(<option key={r} value={r}>{r}</option>))}</select>
              </label>
              <label>Language <InfoTip text="Target a specific language or leave as 'all'." />
                <select value={editing.language || 'all'} onChange={(e)=>setEditing({ ...editing, language: e.target.value })}>{languages.map((l)=>(<option key={l} value={l}>{l}</option>))}</select>
              </label>
            </div>
            <div>
              <label>Regions (Ctrl/Cmd-click to multi-select) <InfoTip text="Select one or more countries/regions. Leave empty to include all." /></label>
              <br />
              <select multiple size={Math.min(8, countries.length)} value={editing.regions || []} onChange={(e)=>{
                const opts = Array.from(e.target.selectedOptions).map(o=>o.value);
                setEditing({ ...editing, regions: opts });
              }}>
                {countries.map((c)=>(<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
              {/* Editor checks: copy fit, CTAs, images, schedule, contrast hint */}
              <EditorChecks slide={editing} />
              {/* QoL: UTM builder */}
              <details>
                <summary style={{ cursor: 'pointer' }}>UTM builder <InfoTip wrap text="Automatically appends utm_source, utm_medium, and utm_campaign to primary + secondary CTA links on Save (only if each param is currently missing). Existing query strings and hashes are preserved." /></summary>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 8, alignItems: 'center', paddingTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={utmEnabled} onChange={(e)=>setUtmEnabled(e.target.checked)} />
                    <span>Append UTM to CTAs on Save</span>
                  </label>
                  <label>utm_source<input value={utmSource} onChange={(e)=>setUtmSource(e.target.value)} /></label>
                  <label>utm_medium<input value={utmMedium} onChange={(e)=>setUtmMedium(e.target.value)} /></label>
                  <label>utm_campaign<input value={utmCampaign} readOnly title="auto from title" /></label>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>We’ll add params only if missing and preserve existing query/hash.</div>
              </details>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveEdit}>Save</button>
              <button onClick={cancelEdit}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function toLocal(v) {
  if (!v) return '';
  try { const d = new Date(v); const tz = new Date(d.getTime() - d.getTimezoneOffset()*60000); return tz.toISOString().slice(0,16); } catch { return ''; }
}
function fromLocal(v) {
  try { if (!v) return null; const d = new Date(v); return d.toISOString(); } catch { return null; }
}

// Rough contrast chip: samples grayscale luminance from CSS color/gradient fallback.
function contrastChip(bg){
  // Heuristic: if it's a gradient string, assume mid-contrast ok; else parse rgb/hex quickly
  let lum = 0.6;
  try{
    const el = document.createElement('div');
    el.style.background = bg;
    document.body.appendChild(el);
    const cs = getComputedStyle(el).backgroundColor || '#cccccc';
    document.body.removeChild(el);
    const m = cs.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (m){
      const r = parseInt(m[1],10), g=parseInt(m[2],10), b=parseInt(m[3],10);
      // relative luminance approximation
      lum = (0.2126*(r/255) + 0.7152*(g/255) + 0.0722*(b/255));
    }
  }catch(_){ lum = 0.6; }
  const onInk = lum > 0.6 ? '#0B1220' : '#ffffff';
  const label = lum > 0.6 ? 'dark text' : 'light text';
  return <span title={`Contrast hint: ${label}`} style={{ display:'inline-flex', alignItems:'center', gap:6, border:'1px solid #e5e7eb', padding:'2px 6px', borderRadius:999 }}>
    <span style={{ width:12, height:12, background: bg, border:'1px solid #e5e7eb', borderRadius:3 }} />
    <span style={{ fontSize:12, color:onInk }}>{label}</span>
  </span>;
}

function SlideMetricsTable({ slides, metrics }){
  const rows = (slides || []).map((s) => {
    const id = s.id || s.title || 'untitled';
    // impressions
    const imp = Number(metrics?.[`resolve.slide.${id}`] || 0);
    // clicks
    const clk = Number(metrics?.[`click.slide.${id}`] || 0);
    const ctr = imp > 0 ? `${((clk / imp) * 100).toFixed(1)}%` : '—';
    // top paths
    const pathPrefix = `resolve.slidePath.${id}.`;
    const topPaths = Object.keys(metrics || {})
      .filter((k) => k.startsWith(pathPrefix))
      .map((k) => ({ path: k.slice(pathPrefix.length), val: Number(metrics[k] || 0) }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 5);
    return { id, title: s.title, imp, clk, ctr, topPaths };
  });
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 2fr', gap: 8, padding: 8, background: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>
        <div>Slide</div>
        <div>Impr.</div>
        <div>Clicks</div>
        <div>CTR</div>
        <div>Top paths</div>
      </div>
      {rows.map((r) => (
        <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 2fr', gap: 8, padding: 8, borderTop: '1px solid #eef2f7' }}>
          <div title={r.id}>{r.title || r.id}</div>
          <div>{r.imp}</div>
          <div>{r.clk}</div>
          <div>{r.ctr}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{r.topPaths.map((p) => `${p.path} (${p.val})`).join(', ') || '—'}</div>
        </div>
      ))}
    </div>
  );
}

// Compute contrast label without rendering
function contrastLabel(bg){
  let lum = 0.6;
  try{
    const el = document.createElement('div');
    el.style.background = bg;
    document.body.appendChild(el);
    const cs = getComputedStyle(el).backgroundColor || '#cccccc';
    document.body.removeChild(el);
    const m = cs.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (m){
      const r = parseInt(m[1],10), g=parseInt(m[2],10), b=parseInt(m[3],10);
      lum = (0.2126*(r/255) + 0.7152*(g/255) + 0.0722*(b/255));
    }
  }catch(_){ lum = 0.6; }
  return lum > 0.6 ? 'Use dark text' : 'Use light text';
}

function nextWeekendEnd(){
  const d = new Date();
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const daysUntilSunday = (7 - day) % 7; // next Sunday
  const sunday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + daysUntilSunday, 23, 59, 0, 0);
  return sunday;
}

function EditorChecks({ slide }){
  if (!slide) return null;
  const msgs = [];
  // Contrast
  msgs.push({ type: 'info', text: contrastLabel(slide.bg) });
  // Title/Sub head lengths
  if ((slide.title || '').length > 60) msgs.push({ type: 'warn', text: 'Headline is long and may wrap on mobile (>60 chars).' });
  if ((slide.subtitle || '').length > 120) msgs.push({ type: 'warn', text: 'Sub-head is long and may truncate (>120 chars).' });
  // CTAs
  const hasPrimaryText = !!(slide.ctaText && slide.ctaText.trim());
  const hasPrimaryHref = !!(slide.ctaHref && slide.ctaHref.trim());
  if (hasPrimaryText && !hasPrimaryHref) msgs.push({ type: 'warn', text: 'Primary CTA has text but no link.' });
  if (!hasPrimaryText && hasPrimaryHref) msgs.push({ type: 'warn', text: 'Primary CTA has link but no text.' });
  if ((slide.ctaText || '').length > 18) msgs.push({ type: 'warn', text: 'Primary CTA text is long (>18 chars).' });
  if ((slide.secondaryCtaText || '').length > 18) msgs.push({ type: 'info', text: 'Secondary CTA text is long (>18 chars).' });
  // Images
  const layout = slide.type || 'copy-image-right';
  const needsImage = layout !== 'copy-only';
  if (needsImage && !slide.imageUrl) msgs.push({ type: 'warn', text: 'Image URL is recommended for this layout.' });
  if (needsImage && !slide.imageMobileUrl) msgs.push({ type: 'info', text: 'Mobile image is recommended for better small-screen framing.' });
  if (!slide.imageAlt) msgs.push({ type: 'warn', text: 'Image alt text is empty.' });
  // Schedule
  if (slide.startAt && slide.endAt) {
    const s = new Date(slide.startAt).getTime();
    const e = new Date(slide.endAt).getTime();
    if (e <= s) msgs.push({ type: 'warn', text: 'End time must be after start time.' });
  }
  // Pages
  const pages = Array.isArray(slide.pages) ? slide.pages : [];
  if (pages.some((p) => ['/checkout','/login','/signin','/signup','/auth'].some((x) => String(p).startsWith(x)))) {
    msgs.push({ type: 'info', text: 'Avoid targeting checkout/auth pages for promos.' });
  }
  // Roles
  const rolesArr = Array.isArray(slide.roles) ? slide.roles : [];
  if (rolesArr.length > 1 && rolesArr.includes('all')) msgs.push({ type: 'warn', text: 'Roles include "all" plus specific roles. Choose one.' });

  if (!msgs.length) return <div style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, background: '#f8fafc', color: '#0f172a' }}>No issues detected.</div>;
  return (
    <div style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, background: '#f8fafc' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Checks</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {msgs.map((m, idx) => (
          <li key={idx} style={{ color: m.type === 'warn' ? '#B45309' : '#334155', margin: '4px 0' }}>
            {m.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Append UTM parameters to a URL if not present; preserves query and hash
function appendUtm(href, { source, medium, campaign }){
  try {
    if (!href) return href;
    const url = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'https://example.com');
    if (!url.searchParams.get('utm_source') && source) url.searchParams.set('utm_source', source);
    if (!url.searchParams.get('utm_medium') && medium) url.searchParams.set('utm_medium', medium);
    if (!url.searchParams.get('utm_campaign') && campaign) url.searchParams.set('utm_campaign', campaign);
    return url.pathname + (url.search || '') + (url.hash || '');
  } catch (_) {
    // Fallback: naive append
    try {
      const sep = href.includes('?') ? '&' : '?';
      const parts = [];
      if (source && !/utm_source=/.test(href)) parts.push(`utm_source=${encodeURIComponent(source)}`);
      if (medium && !/utm_medium=/.test(href)) parts.push(`utm_medium=${encodeURIComponent(medium)}`);
      if (campaign && !/utm_campaign=/.test(href)) parts.push(`utm_campaign=${encodeURIComponent(campaign)}`);
      return parts.length ? href + sep + parts.join('&') : href;
    } catch (_) { return href; }
  }
}

// (Removed inline InfoTip — now using shared component)

// Compact inline help drawer summarizing key manual sections
function HelpInline(){
  const [open, setOpen] = React.useState(() => {
    try { return sessionStorage.getItem('heroHelpOpen') === '1'; } catch (_) { return false; }
  });
  // Persist state
  React.useEffect(() => {
    try {
      if (open) sessionStorage.setItem('heroHelpOpen', '1');
      else sessionStorage.removeItem('heroHelpOpen');
    } catch (_) {}
  }, [open]);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onClick={()=>setOpen(o=>!o)} aria-expanded={open} style={{ marginLeft: 6 }}>
        {open ? 'Close Help' : 'Help'}
      </button>
      {open && (
        <div style={{ position:'absolute', top:'110%', left:0, zIndex:9999, width:340, maxWidth:'90vw', background:'#0f172a', color:'#e2e8f0', borderRadius:8, boxShadow:'0 6px 18px rgba(0,0,0,0.35)', padding:12, fontSize:13 }}>
          <strong style={{ fontSize:14 }}>Marketing Manager Help</strong>
          <p style={{ lineHeight:1.35, margin:'6px 0 8px' }}>Slides resolve by priority (lower number = higher). Max 6 shown per context. Drafts only appear if the preview toggle is on. Use templates for repeatable layouts; UTM builder appends tracking codes on Save.</p>
          <ul style={{ margin:0, paddingLeft:18 }}>
            <li>Priority ties fall back to recency.</li>
            <li>Schedule (start/end) gates eligibility.</li>
            <li>Targeting: pages • role • language • regions.</li>
            <li>Checks warn about contrast, missing alt, and CTA issues.</li>
            <li>Metrics are local only (impr / clicks / CTR).</li>
          </ul>
          <div style={{ marginTop:8, display:'flex', gap:8, flexWrap:'wrap' }}>
            <a href="/docs/MarketingManager_Manual.pdf" target="_blank" rel="noopener" style={{ color:'#60a5fa' }}>Open Full Manual (PDF)</a>
            <button type="button" onClick={()=>setOpen(false)} style={{ background:'#1e293b', color:'#fff', border:'1px solid #334155', padding:'4px 10px', borderRadius:4 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
