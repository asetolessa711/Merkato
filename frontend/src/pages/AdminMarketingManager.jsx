// src/pages/AdminMarketingManager.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MicroBanner, { MICRO_BANNER_KEY } from '../components/MicroBanner'';
import ROUTES from '../config/routes'';
import AdminHeroBanners from './AdminHeroBanners'';
import AdminMicroBanner from './AdminMicroBanner'';
import AdminRails from './AdminRails'';
import AdminRailsRegistry from '../components/admin/AdminRailsRegistry'';
import AdminRailsMetricsPanel from '../components/admin/AdminRailsMetricsPanel'';

export default function AdminMarketingManager() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showHeroManager, setShowHeroManager] = useState(false);
  const [previewAllowDismiss, setPreviewAllowDismiss] = useState(false);
  const [previewAllowNavigate, setPreviewAllowNavigate] = useState(false);
  const [showMicroManager, setShowMicroManager] = useState(false);
  const [showRailsManager, setShowRailsManager] = useState(false);
  const [showRailsMetrics, setShowRailsMetrics] = useState(false);
  const [windowDays, setWindowDays] = useState(7);
  const baselineDays = useMemo(() => Math.max(28, windowDays), [windowDays]);
  const [metricsFilters, setMetricsFilters] = useState({ tactic:'', owner:'', placementKey:'', environment:'', category:'', opsStatus:'' });
  const [presetCounts, setPresetCounts] = useState({ all:null, active:null, sponsored:null, vendor:null, prod:null });

  useEffect(() => {
    if (!showRailsManager) return;
    let cancelled = false;
    async function fetchCounts(){
      const headers = { 'Accept':'application/json' };
      try { const t = localStorage.getItem('token'); if(t) headers.Authorization = `Bearer ${t}`; } catch(_){ }
      async function getTotal(params){
        const res = await fetch(`/api/admin/rails?${new URLSearchParams(params)}`, { headers });
        if(!res.ok) return null;
        const json = await res.json();
        return Number(json.total|| (Array.isArray(json.rails)? json.rails.length : 0));
      }
      try {
        const [all, active, sponsored, vendor, prod] = await Promise.all([
          getTotal({ page:1, pageSize:1 }),
          getTotal({ opsStatus:'Active', page:1, pageSize:1 }),
          getTotal({ tactic:'Sponsored', page:1, pageSize:1 }),
          getTotal({ owner:'Vendor', page:1, pageSize:1 }),
          getTotal({ environment:'Prod', page:1, pageSize:1 }),
        ]);
        if(!cancelled) setPresetCounts({ all, active, sponsored, vendor, prod });
      } catch(_){ /* ignore counters failure */ }
    }
    fetchCounts();
    return () => { cancelled = true; };
  }, [showRailsManager]);

  // no inline metrics style helpers needed

  useEffect(() => {
    // Deep link support: /admin/marketing?view=rails&metrics=1
    const view = searchParams.get('view');
    const metrics = searchParams.get('metrics');
    if (view === 'rails') setShowRailsManager(true);
    if (metrics === '1') setShowRailsMetrics(true);
  }, [searchParams]);

  return (
    <div style={{ padding: 20, display: 'grid', gap: 16 }}>
      <h2 style={{ margin: 0 }}>Marketing Manager</h2>
      <p style={{ marginTop: 6, color: '#64748b' }}>Manage the header experiences: Micro-banner, Hero banners, and Promo Codes.</p>

  {/* Live Preview: Micro-banner as it appears under the navbar */}
      <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <strong>Micro‑banner (Live Preview)</strong>
          <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: 12 }}>
            Source: {MICRO_BANNER_KEY}
          </span>
        </div>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #eef2f7', display: 'flex', gap: 14, alignItems: 'center', background: '#fbfdff' }}>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, color: '#334155' }}>
            <input type="checkbox" checked={previewAllowDismiss} onChange={(e)=>setPreviewAllowDismiss(e.target.checked)} />
            Allow dismiss in preview
          </label>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, color: '#334155' }}>
            <input type="checkbox" checked={previewAllowNavigate} onChange={(e)=>setPreviewAllowNavigate(e.target.checked)} />
            Allow navigation in preview
          </label>
        </div>
        <div>
          <MicroBanner alwaysShow previewMode previewAllowDismiss={previewAllowDismiss} previewAllowNavigate={previewAllowNavigate} />
        </div>
      </section>

      {/* Hubs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        <article style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, background: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>Micro‑banners</h3>
          <p style={{ margin: '8px 0', color: '#64748b' }}>Create and schedule site‑wide message strips. Variants: trust/info/promo/warning.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setShowMicroManager((v)=>!v)}>{showMicroManager ? 'Hide Manager' : 'Manage here'}</button>
          </div>
        </article>
        <article style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, background: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>Hero banners</h3>
          <p style={{ margin: '8px 0', color: '#64748b' }}>Full‑bleed slides under the micro‑banner. Control slides, order, targets, and schedule here.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setShowHeroManager((v)=>!v)}>{showHeroManager ? 'Hide Manager' : 'Manage here'}</button>
          </div>
        </article>
        <article style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, background: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>Rails Registry</h3>
          <p style={{ margin: '8px 0', color: '#64748b' }}>Operator-facing list with filters, bulk updates, and edit drawer. Uses backend registry.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setShowRailsManager((v)=>!v)}>{showRailsManager ? 'Hide Manager' : 'Open Manager'}</button>
          </div>
        </article>
        <article style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, background: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>Rails Metrics</h3>
          <p style={{ margin: '8px 0', color: '#64748b' }}>Track rail impressions, CTR, ATC rate, revenue and RPM. Auto‑refresh is enabled for Today.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setShowRailsMetrics((v)=>!v)}>{showRailsMetrics ? 'Hide Metrics' : 'View metrics here'}</button>
            {showRailsMetrics && (
              <div style={{ display:'inline-flex', gap:6, alignItems:'center', marginLeft: 6 }}>
                <span style={{ fontSize:12, color:'#64748b' }}>Range:</span>
                <button aria-pressed={windowDays===1} onClick={()=>setWindowDays(1)} style={btn(windowDays===1)}>Today</button>
                <button aria-pressed={windowDays===7} onClick={()=>setWindowDays(7)} style={btn(windowDays===7)}>7d</button>
                <button aria-pressed={windowDays===28} onClick={()=>setWindowDays(28)} style={btn(windowDays===28)}>28d</button>
              </div>
            )}
          </div>
        </article>
        <article style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, background: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>Promo Codes</h3>
          <p style={{ margin: '8px 0', color: '#64748b' }}>Create discount codes and track usage. Pair with micro‑banners for campaigns.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => navigate(ROUTES.adminPromoCodes)}>Open Manager</button>
          </div>
        </article>
      </div>

      {showMicroManager && (
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, background: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>Micro‑banners Manager</h3>
          <AdminMicroBanner />
        </section>
      )}

      {showHeroManager && (
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, background: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>Hero Banners Manager</h3>
          <AdminHeroBanners />
        </section>
      )}
      {showRailsManager && (
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, background: '#fff', display:'grid', gap:14 }}>
          <h3 style={{ marginTop: 0 }}>Rails Manager</h3>
          {/* Preset bar controlling metrics filters */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontSize:12, color:'#64748b' }}>Saved views:</span>
            <button style={presetBtn(metricsFilters.opsStatus==='Active' && !metricsFilters.tactic)} onClick={()=>setMetricsFilters({ tactic:'', owner:'', placementKey:'', environment:'', category:'', opsStatus:'Active' })}>Active{fmtCount(presetCounts.active)}</button>
            <button style={presetBtn(metricsFilters.tactic==='Sponsored')} onClick={()=>setMetricsFilters(f=>({ ...f, tactic:'Sponsored' }))}>Sponsored{fmtCount(presetCounts.sponsored)}</button>
            <button style={presetBtn(metricsFilters.owner==='Vendor')} onClick={()=>setMetricsFilters(f=>({ ...f, owner:'Vendor' }))}>Vendor-owned{fmtCount(presetCounts.vendor)}</button>
            <button style={presetBtn(metricsFilters.environment==='Prod')} onClick={()=>setMetricsFilters(f=>({ ...f, environment:'Prod' }))}>Prod{fmtCount(presetCounts.prod)}</button>
            <button style={presetBtn(!Object.values(metricsFilters).some(Boolean))} onClick={()=>setMetricsFilters({ tactic:'', owner:'', placementKey:'', environment:'', category:'', opsStatus:'' })}>All{fmtCount(presetCounts.all)}</button>
          </div>
          <AdminRailsRegistry />
        </section>
      )}

      {showRailsMetrics && (
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, background: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>Rails Metrics</h3>
          <AdminRailsMetricsPanel windowDays={windowDays} baselineDays={baselineDays} externalFilters={metricsFilters} hideFilterControls />
        </section>
      )}
    </div>
  );
}

function btn(active){
  return {
    padding: '6px 10px',
    borderRadius: 6,
    border: active? '1px solid #0ea5e9' : '1px solid #e5e7eb',
    background: active? '#e0f2fe' : '#fff',
    color: active? '#0c4a6e' : '#0f172a',
    fontSize: 12,
    cursor: 'pointer'
  };
}

function fmtCount(n){
  return typeof n === 'number' ? ` (${n})` : '';
}

// Preset buttons share the same style as generic small buttons
function presetBtn(active){
  return btn(active);
}
