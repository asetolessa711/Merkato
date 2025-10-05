import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ENV } from '../../config/env'';

/**
 * AdminRailsMetricsPanel
 * Fetches backend aggregated metrics (per-rail + baselines) and displays a concise table.
 * Endpoint: /api/admin/rails/metrics
 * Requires admin or global_admin token (assumes token stored in localStorage as 'token').
 */
export default function AdminRailsMetricsPanel({ windowDays=7, baselineDays=28, autoRefreshDefault=true, minIntervalSec=60, maxIntervalSec=120, externalFilters=null, hideFilterControls=false }) {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(!!autoRefreshDefault);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filters, setFilters] = useState({ tactic:'', owner:'', placementKey:'', environment:'', category:'', opsStatus:'' });
  const timerRef = useRef(null);

  const refreshMs = useMemo(() => {
    // Pick a jittered interval between min and max seconds to avoid thundering herds
    const minMs = Math.max(10, (minIntervalSec||60) * 1000);
    const maxMs = Math.max(minMs, (maxIntervalSec||120) * 1000);
    const span = maxMs - minMs;
    const jitter = span > 0 ? Math.floor(Math.random() * span) : 0;
    return minMs + jitter;
  }, [minIntervalSec, maxIntervalSec, windowDays, baselineDays]);

  useEffect(() => {
    if (externalFilters) setFilters(prev => ({ ...prev, ...externalFilters }));
  }, [externalFilters]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
  const params = new URLSearchParams({ window: String(windowDays), baseline: String(baselineDays) });
  Object.entries(filters).forEach(([k,v])=>{ if(v) params.set(k,String(v)); });
        const headers = { 'Accept':'application/json' };
        try { const t = localStorage.getItem('token'); if(t) headers.Authorization = `Bearer ${t}`; } catch(_){ }
        const [res, sum] = await Promise.all([
          fetch(`/api/admin/rails/metrics?${params}`, { headers }),
          fetch(`/api/admin/rails/metrics/summary?window=${encodeURIComponent(String(windowDays))}`, { headers })
        ]);
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if(sum.ok){ try { const sj = await sum.json(); if(!cancelled) setSummary(sj); } catch(_){}
        } else {
          setSummary(null);
        }
        if(!cancelled){ setData(json); setLastUpdated(new Date()); }
      } catch(e){ if(!cancelled) setError(e); }
      finally { if(!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [windowDays, baselineDays, filters]);

  // Auto-refresh lifecycle (only when viewing Today)
  const isTodayByProp = Number(windowDays) === 1;
  useEffect(() => {
    if(!autoRefresh || !isTodayByProp) {
      if(timerRef.current){ clearTimeout(timerRef.current); timerRef.current = null; }
      return;
    }
    let cancelled = false;
    function schedule() {
      if(cancelled) return;
      if(timerRef.current){ clearTimeout(timerRef.current); }
      timerRef.current = setTimeout(async () => {
        if(cancelled) return;
        try {
          const params = new URLSearchParams({ window: String(windowDays), baseline: String(baselineDays) });
          Object.entries(filters).forEach(([k,v])=>{ if(v) params.set(k,String(v)); });
          const headers = { 'Accept':'application/json' };
          try { const t = localStorage.getItem('token'); if(t) headers.Authorization = `Bearer ${t}`; } catch(_){ }
          const [res, sum] = await Promise.all([
            fetch(`/api/admin/rails/metrics?${params}`, { headers }),
            fetch(`/api/admin/rails/metrics/summary?window=${encodeURIComponent(String(windowDays))}`, { headers })
          ]);
          if(res.ok){ const json = await res.json(); setData(json); setLastUpdated(new Date()); }
          if(sum.ok){ try { const sj = await sum.json(); setSummary(sj); } catch(_){ } }
        } catch(_e) { /* keep last data, no-op */ }
        finally { schedule(); }
      }, refreshMs);
    }
    schedule();
    return () => { cancelled = true; if(timerRef.current){ clearTimeout(timerRef.current); timerRef.current = null; } };
  }, [autoRefresh, refreshMs, windowDays, baselineDays, isTodayByProp, filters]);

  if(loading) return (
    <div style={{ fontFamily:'sans-serif', fontSize:14 }}>
      <div style={{ marginBottom:8, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <strong>Rails Performance</strong>
        <span style={{ fontSize:12, color:'#64748b' }}>(loading…)</span>
      </div>
      <SkeletonTable rows={10} />
    </div>
  );
  if(error) return <div style={{ color:'red' }}>Failed to load rails metrics: {String(error.message||error)}</div>;
  if(!data) return null;

  const { baseline, rails = [] } = data;
  // De-duplicate any repeated rails by railId
  const seen = new Set();
  const railsUnique = rails.filter(r => { if(!r || !r.railId) return false; if(seen.has(r.railId)) return false; seen.add(r.railId); return true; });
  const siteSupp = summary?.site?.suppression || {};
  const isToday = Number(data.windowDays) === 1 || Number(windowDays) === 1;

  return (
    <div style={{ fontFamily:'sans-serif', fontSize:14 }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
        <h2 style={{ margin:'8px 0', display:'flex', alignItems:'center', gap:8 }}>
          Rails Performance — Overview ({data.windowDays}d)
          <a
            href={ENV.GUIDE_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Open Rails Metrics Admin Guide"
            title="Open Rails Metrics Admin Guide"
            style={{ fontSize:12, fontWeight:400, color:'#0ea5e9', textDecoration:'none' }}
          >
            Help
          </a>
          <a
            href="/docs/MERKATO_RAILS_REGISTRY_AND_TACTICS.md"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Open Rails Registry & Tactics Guide"
            title="Open Rails Registry & Tactics Guide"
            style={{ fontSize:12, fontWeight:400, color:'#0ea5e9', textDecoration:'none' }}
          >
            Registry
          </a>
        </h2>
        <div style={{ display:'inline-flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          {/* Minimal Saved Views / Filters */}
          {!hideFilterControls && (
          <div style={{ display:'inline-flex', gap:6, alignItems:'center' }}>
            <select aria-label="Filter tactic" value={filters.tactic} onChange={(e)=>setFilters(f=>({...f, tactic:e.target.value}))} style={sel}>
              <option value="">All tactics</option>
              {['Curated','DealsHub','CategoryPromo','BrandSpotlight','CrossSell','Collection','Sponsored'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select aria-label="Filter owner" value={filters.owner} onChange={(e)=>setFilters(f=>({...f, owner:e.target.value}))} style={sel}>
              <option value="">All owners</option>
              {['Marketing','System+Marketing','Vendor'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select aria-label="Filter placement" value={filters.placementKey} onChange={(e)=>setFilters(f=>({...f, placementKey:e.target.value}))} style={sel}>
              <option value="">All placements</option>
              {['Hero','Mid','CategoryTop','DealsPage','PDP','Cart','CollectionPage','SearchResults'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select aria-label="Filter env" value={filters.environment} onChange={(e)=>setFilters(f=>({...f, environment:e.target.value}))} style={sel}>
              <option value="">All env</option>
              {['Prod','Staging','Dev'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select aria-label="Filter ops status" value={filters.opsStatus} onChange={(e)=>setFilters(f=>({...f, opsStatus:e.target.value}))} style={sel}>
              <option value="">All statuses</option>
              {['Active','Paused','Archived'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          )}
          {isToday ? (
            <label style={{ display:'inline-flex', gap:6, alignItems:'center', fontSize:12, color:'#334155' }}>
              <input type="checkbox" checked={autoRefresh} onChange={(e)=>setAutoRefresh(e.target.checked)} />
              Auto‑refresh
            </label>
          ) : (
            <span style={{ fontSize:12, color:'#64748b' }}>Auto‑refresh only for Today</span>
          )}
          <span style={{ fontSize:12, color:'#64748b' }} title={lastUpdated ? lastUpdated.toISOString() : ''}>
            Last updated: {lastUpdated ? timeAgo(lastUpdated) : '—'}
          </span>
        </div>
      </div>
      {/* Default table: 7 core KPIs */}
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Rail</th>
              <th style={th}>Imp</th>
              <th style={th}>Clk</th>
              <th style={th}>CTR%</th>
              <th style={th}>ATC</th>
              <th style={th}>ATC Rate%</th>
              <th style={th}>Rev</th>
              <th style={th}>RPM</th>
            </tr>
          </thead>
          <tbody>
            {railsUnique.map(r => {
              const m = r.metrics || {}; const del = r.deltas || {}; const ctrPct = (m.ctr*100)||0; const atcPct = (m.atcRate*100)||0;
              return (
                <tr key={r.railId} style={{ borderTop:'1px solid #eee' }}>
                  <td style={td}>
                    <div style={{ display:'flex', flexDirection:'column' }}>
                      <strong>{r.displayName || r.title || r.railId}</strong>
                      <span style={{ fontSize:11, color:'#64748b' }}>
                        {r.tactic || '—'} · {r.placementKey || r.placement?.slot || '—'} · {r.environment || 'Prod'} · {r.owner || 'Marketing'}
                      </span>
                      {!!(r.badges&&r.badges.length) && (
                        <span style={{ fontSize:10, color:'#0f766e' }}>{r.badges.join(' ')}</span>
                      )}
                    </div>
                  </td>
                  <td style={tdNum}>{m.imp}</td>
                  <td style={tdNum}>{m.clk}</td>
                  <td style={tdNum}>{ctrPct.toFixed(2)}</td>
                  <td style={tdNum}>{m.atc}</td>
                  <td style={tdNum}>{atcPct.toFixed(2)}</td>
                  <td style={tdNum}>{m.rev?.toFixed?.(2) || '0.00'}</td>
                  <td style={tdNum}>{m.rpm?.toFixed?.(2) || '0.00'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Advanced: Trends & Baselines */}
      <details style={{ marginTop:12 }}>
        <summary style={{ cursor:'pointer', fontWeight:600 }}>Trends & baselines (Advanced)</summary>
        <div style={{ marginTop:8, display:'flex', gap:16, flexWrap:'wrap' }}>
          <div>Global CTR p50: {(baseline?.ctr?.p50*100).toFixed(2)}%</div>
          <div>Global ATC p50: {(baseline?.atc?.p50*100).toFixed(2)}%</div>
          <div>Global RPM p80: {baseline?.rpm?.p80?.toFixed(2)}</div>
          <div style={{ fontSize:12, color:'#64748b' }}>Window: {data.windowDays}d · Baseline: {data.baselineDays}d</div>
        </div>
        <div style={{ overflowX:'auto', marginTop:8 }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Rail</th>
                <th style={th}>CTR Δpp</th>
                <th style={th}>ATC Δpp</th>
              </tr>
            </thead>
            <tbody>
              {railsUnique.map(r => {
                const del = r.deltas || {};
                return (
                  <tr key={r.railId} style={{ borderTop:'1px solid #eee' }}>
                    <td style={td}>{r.title || r.railId}</td>
                    <td style={tdNum}>{del.ctrDeltaPp?.toFixed?.(2)}</td>
                    <td style={tdNum}>{del.atcDeltaPp?.toFixed?.(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      {/* Advanced: Diagnostics */}
      <details style={{ marginTop:12 }}>
        <summary style={{ cursor:'pointer', fontWeight:600 }}>Diagnostics (Advanced)</summary>
        {summary && (
          <div style={{ marginTop:8 }} title="Site suppression totals in range">
            Suppression — sponsored: {siteSupp.sponsored||0}, capacityTrim: {siteSupp.capacityTrim||0}, perRail: {siteSupp.capacityRail||0}, siteCap: {siteSupp.siteSponsored||0}
          </div>
        )}
        <div style={{ overflowX:'auto', marginTop:8 }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Rail</th>
                <th style={th}>Sess</th>
                <th style={th}>Rec</th>
                <th style={th}>Reasons</th>
              </tr>
            </thead>
            <tbody>
              {railsUnique.map(r => {
                const m = r.metrics || {};
                return (
                  <tr key={r.railId} style={{ borderTop:'1px solid #eee' }}>
                    <td style={td}>{r.title || r.railId}</td>
                    <td style={tdNum}>{m.sessions}</td>
                    <td style={td}>{r.recommendation}</td>
                    <td style={td}>{(r.reasons||[]).join(',')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

const th = { textAlign:'left', padding:'4px 6px', background:'#fafafa', fontWeight:600, fontSize:12 };
const td = { padding:'4px 6px', fontSize:12 };
const tdNum = { ...td, textAlign:'right', fontVariantNumeric:'tabular-nums' };
const sel = { fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', background:'#fff' };

function SkeletonTable({ rows=10 }){
  const shades = ['#f1f5f9','#e2e8f0'];
  const Row = (_, idx) => (
    <tr key={idx} style={{ borderTop:'1px solid #eee' }}>
      {Array.from({ length: 8 }).map((__, j) => (
        <td key={j} style={j===0?td:tdNum}>
          <div style={{ height: 12, borderRadius: 3, background: shades[(idx+j)%2] }} />
        </td>
      ))}
    </tr>
  );
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            {['Rail','Imp','Clk','CTR%','ATC','ATC Rate%','Rev','RPM'].map((h,i)=> (
              <th key={i} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map(Row)}
        </tbody>
      </table>
    </div>
  );
}

function timeAgo(date){
  const now = Date.now();
  const diff = Math.max(0, now - (date?.getTime?.() || now));
  const s = Math.floor(diff/1000);
  if(s < 60) return `${s}s ago`;
  const m = Math.floor(s/60);
  if(m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  return `${h}h ago`;
}
