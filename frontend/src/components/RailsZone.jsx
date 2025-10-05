import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ProductCard from './ProductCard'';
import { resolveRails, recordRailImpression, recordRailClick, recordRailItemClick, recordRailAtc } from '../utils/railsStore'';
import { Flags } from '../utils/featureFlags'';
import client from '../utils/apiClient'';
import { RailsContext } from '../context/RailsContext'';

// Simple rendering container for one slot on a page.
// For MVP we only show at most one rail per slot (enforced by resolver capacity).
export default function RailsZone({ page, slot, productsBySku = {} }) {
  const [rails, setRails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(5); // desktop default: 5; tablet: 3; mobile: 2
  const [pageIndexByRail, setPageIndexByRail] = useState({});

  // Derive page size from viewport
  useEffect(() => {
    function computePageSize() {
      if (typeof window === 'undefined') return 5;
      const w = window.innerWidth || 1280;
      if (w < 640) return 2; // mobile
      if (w < 1024) return 3; // tablet
      return 5; // desktop
    }
    function onResize() {
      setPageSize(computePageSize());
    }
    setPageSize(computePageSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // When enabled, use backend selection; otherwise fall back to local resolver
      if (Flags.RAILS_REMOTE) {
        try {
          const surface = page === 'home' ? 'home' : page;
          const form = (typeof window !== 'undefined' && window.innerWidth < 768) ? 'mobile' : 'desktop';
          const res = await client.get('/api/rails/selection', { params: { surface, form } });
          const sel = res?.data?.selection || [];
          // Map backend selection shape to RailsZone expected shape
          const mapped = sel.map(s => ({
            id: s.railId,
            title: s.title || s.displayName || 'Rail',
            items: Array.isArray(s.items) ? s.items : [],
          }));
          if (!cancelled) {
            setRails(mapped);
            mapped.forEach(rr => recordRailImpression(rr.id));
            setLoading(false);
          }
          return;
        } catch (e) {
          // Silent fallback to local resolver on any error
        }
      }
      try {
        const r = resolveRails({ page, slot });
        if (!cancelled) {
          setRails(r);
          r.forEach(rr => recordRailImpression(rr.id));
          setLoading(false);
        }
      } catch (_) {}
    }
    load();
    return () => { cancelled = true; };
  }, [page, slot]);

  if (!rails.length) {
    // Optional: display skeletons to reduce perceived layout shift (behind flag to avoid test churn)
    if (Flags.RAILS_SKELETONS && loading) {
      return (
  <div className="rails-zone u-container" data-page={page} data-slot={slot} style={{ marginTop: 16 }}>
          <section className="rail">
            <div className="section-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ height:18, width:200, background:'#eee', borderRadius:6 }} />
              <div style={{ height:16, width:36, background:'#eee', borderRadius:4 }} />
            </div>
            <div className="products-row-scroll" style={{ display:'flex', gap:12, overflowX:'hidden', paddingBottom:4 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ minWidth:180, height:260, borderRadius:12, background:'#f2f2f2' }} />
              ))}
            </div>
          </section>
        </div>
      );
    }
    return null;
  }

  return (
  <div className="rails-zone u-container" data-page={page} data-slot={slot} style={{ marginTop: 8, overflowX:'hidden' }}>
      {rails.map(rail => {
        const items = Array.isArray(rail.items) ? rail.items : [];
        // Compute pages without hooks (avoid calling hooks in loops)
        const pages = (() => {
          const chunks = [];
          for (let i = 0; i < items.length; i += pageSize) {
            chunks.push(items.slice(i, i + pageSize));
          }
          return chunks;
        })();
        const pageCount = pages.length || 1;
        const pageIndex = Math.min(pageIndexByRail[rail.id] || 0, Math.max(0, pageCount - 1));
        const setPage = (idx) => setPageIndexByRail(p => ({ ...p, [rail.id]: Math.max(0, Math.min(idx, pageCount - 1)) }));
        const onKey = (e) => {
          if (e.key === 'ArrowRight') { setPage(pageIndex + 1); }
          if (e.key === 'ArrowLeft') { setPage(pageIndex - 1); }
        };
        const pageItems = pages[pageIndex] || [];
        const canPage = pageCount > 1;
        return (
          <section key={rail.id} className="rail" data-rail-id={rail.id}>
            <div className="section-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'2px solid #F9B233', padding:'0 0 6px', marginBottom:8 }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight:600, color:'#0F273D', margin:'0' }}>{rail.title}</h2>
              <button
                type="button"
                onClick={() => recordRailClick(rail.id)}
                aria-label={`Refresh ${rail.title} rail`}
                style={{ fontSize:12, background:'transparent', border:'1px solid #E5E7EB', borderRadius:4, padding:'2px 6px', cursor:'pointer', color:'#0F273D' }}
              >
                •••
              </button>
            </div>
            <div
              className="rail-carousel"
              role="region"
              aria-label={`${rail.title} carousel`}
              tabIndex={0}
              onKeyDown={onKey}
              style={{ position:'relative' }}
            >
              {canPage && (
                <button
                  type="button"
                  aria-label="Previous"
                  onClick={() => setPage(pageIndex - 1)}
                  disabled={pageIndex <= 0}
                  style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%)', zIndex:1, background:'#fff', border:'1px solid #ddd', borderRadius:20, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 2px rgba(0,0,0,0.08)' }}
                >
                  ‹
                </button>
              )}
              {canPage && (
                <button
                  type="button"
                  aria-label="Next"
                  onClick={() => setPage(pageIndex + 1)}
                  disabled={pageIndex >= pageCount - 1}
                  style={{ position:'absolute', right:0, top:'50%', transform:'translateY(-50%)', zIndex:1, background:'#fff', border:'1px solid #ddd', borderRadius:20, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 2px rgba(0,0,0,0.08)' }}
                >
                  ›
                </button>
              )}
              <div className="rail-page" style={{ display:'flex', gap:16, overflow:'hidden', padding:'4px 0', margin: 0, maxWidth:'100%', boxSizing:'border-box' }}>
                {pageItems && pageItems.length ? pageItems.map(item => {
              const p = productsBySku[item.sku];
              if (!p) return (
                <div key={item.sku} style={{ minWidth:200, border:'1px dashed #ccc', padding:10, borderRadius:8 }}>
                  <div style={{ fontSize:12, color:'#666' }}>Missing SKU</div>
                  <div style={{ fontWeight:600 }}>{item.sku}</div>
                  {item.reason === 'sponsored' && <span style={{ fontSize:10, background:'#FFEFD5', padding:'2px 4px', borderRadius:4, marginTop:4, display:'inline-block' }}>Sponsored</span>}
                </div>
              );
              const ctx = { railId: rail.id, sku: item.sku, page, slot, tactic: item.reason || 'organic' };
              return (
                <RailsContext.Provider key={p._id || p.id || p.sku} value={ctx}>
                  <div onClick={() => recordRailItemClick(rail.id, item.sku)} data-rail-id={rail.id} data-rail-sku={item.sku}>
                    <ProductCard
                      product={p}
                      size="sm"
                      type={p.discount>0?'deal':'standard'}
                      onAddToCart={() => {
                        try { recordRailAtc(rail.id, item.sku, p.price); } catch(_) {}
                      }}
                    />
                    {item.reason === 'sponsored' && <span style={{ fontSize:10, background:'#FFEFD5', padding:'2px 4px', borderRadius:4, marginTop:4, display:'inline-block' }}>Sponsored</span>}
                  </div>
                </RailsContext.Provider>
              );
                }) : (
              <div style={{ fontSize:12, color:'#666' }}>No items yet</div>
                )}
              </div>
              {canPage && (
                <div className="rail-dots" style={{ display:'flex', justifyContent:'center', gap:8, marginTop:8 }}>
                  {pages.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Go to page ${i+1}`}
                      onClick={() => setPage(i)}
                      style={{ width:8, height:8, borderRadius:'50%', border:'none', background: i===pageIndex ? '#0F273D' : '#c9d3dc', cursor:'pointer' }}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

RailsZone.propTypes = {
  page: PropTypes.string.isRequired,
  slot: PropTypes.string.isRequired,
  productsBySku: PropTypes.object, // map sku -> product object (from product fetch)
};
