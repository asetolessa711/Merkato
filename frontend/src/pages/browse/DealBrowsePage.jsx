import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import useBrowseQuery from '../../hooks/useBrowseQuery'';
import ProductCard from '../../components/ProductCard'';
import { matchesCategory } from '../../utils/taxonomy'';
import { LinkBuilder } from '../../config/routes'';
import FilterSheet from '../../components/browse/FilterSheet'';
import { Events } from '../../utils/eventsClient'';
import SeoHead from '../../components/SeoHead'';
import { Flags } from '../../utils/featureFlags'';

const titleFromDeal = (t='') => {
  const k = t.toLowerCase();
  if (k === 'under-25') return 'Under $25';
  if (k === 'clearance') return 'Clearance';
  const percent = k.match(/^percent-off-(\d{1,2})$/);
  if (percent) return `${percent[1]}% Off or More`;
  return 'Deals';
};

export default function DealBrowsePage() {
  const { dealType } = useParams();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const q = useBrowseQuery();
  const location = useLocation();
  const sortBtnRef = useRef(null);
  const filterBtnRef = useRef(null);
  const liveRef = useRef(null);
  const loadItemsRef = useRef(null);

  useEffect(() => {
    let cancel = false;
    const run = async () => {
      setLoadError(false);
      const attempt = async () => {
        try {
          setLoading(true);
          const res = await axios.get('/api/products');
          if (!cancel) setItems(Array.isArray(res.data) ? res.data : []);
          return true;
        } catch (_) {
          return false;
        } finally {
          if (!cancel) setLoading(false);
        }
      };
      const ok1 = await attempt();
      if (ok1) return;
      await new Promise(r=>setTimeout(r, 300));
      const ok2 = await attempt();
      if (!ok2 && !cancel) setLoadError(true);
    };
    loadItemsRef.current = run;
    run();
    return () => { cancel = true; };
  }, [dealType, location.search]);

  const filtered = useMemo(() => {
    let out = items;
    // If category query provided, pre-filter
    if (q.category) out = out.filter(p => matchesCategory(p.category, q.category));

    const k = (dealType || '').toLowerCase();
    if (k === 'under-25') out = out.filter(p => Number(p.price) <= 25);
    else if (k === 'clearance') out = out.filter(p => (p.discount || 0) > 0 || p.promotion?.isPromoted);
    else if (k.startsWith('percent-off-')) {
      const n = Number(k.replace('percent-off-', ''));
      out = out.filter(p => Number(p.discount || 0) >= (isNaN(n) ? 0 : n));
    }

    // keyword
    if (q.q) {
      const kw = q.q.toLowerCase();
      out = out.filter(p => (p.name || '').toLowerCase().includes(kw));
    }

    // brand multi-select CSV
    if (q.brandList && q.brandList.length) {
      const set = new Set(q.brandList.map((s)=> s.toLowerCase()));
      out = out.filter(p => set.has(String(p.brand || '').toLowerCase()));
    }
    // rating, stock, price range
    if (q.rating) out = out.filter(p => Number(p.rating || 0) >= Number(q.rating || 0));
    if (q.in_stock) out = out.filter(p => Number(p.countInStock || p.stock || 0) > 0);
    if (q.price_min) out = out.filter(p => Number(p.price) >= Number(q.price_min));
    if (q.price_max) out = out.filter(p => Number(p.price) <= Number(q.price_max));

    // sort
    const sort = q.sort;
    if (sort === 'price_asc') out = [...out].sort((a,b)=>a.price-b.price);
    if (sort === 'price_desc') out = [...out].sort((a,b)=>b.price-a.price);
    if (sort === 'rating') out = [...out].sort((a,b)=> (b.rating||0)-(a.rating||0));
    if (sort === 'newest') out = [...out].sort((a,b)=> new Date(b.createdAt||0)-new Date(a.createdAt||0));

    return out;
  }, [items, dealType, q.category, q.q, q.brand, q.rating, q.in_stock, q.price_min, q.price_max, q.sort]);

  const pageSize = 24;
  const page = Math.max(1, Number(q.page||1));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page-1)*pageSize, page*pageSize);
  const [loadedCount, setLoadedCount] = useState(pageSize);
  useEffect(() => { setLoadedCount(pageSize); }, [dealType, q.category, q.sort, q.brand, q.rating, q.price_min, q.price_max, q.in_stock]);
  const loadMoreItems = useMemo(() => filtered.slice(0, loadedCount), [filtered, loadedCount]);
  useEffect(() => {
    if (!Flags.BROWSE_LOAD_MORE) return;
    if (!liveRef.current) return;
    liveRef.current.textContent = `Loaded ${Math.min(loadedCount, filtered.length)} items`;
  }, [loadedCount, filtered.length]);

  // facets
  const brandFacets = useMemo(() => {
    const map = new Map();
    filtered.forEach(p=>{
      if(p.brand){
        const label = String(p.brand);
        const value = label.toLowerCase();
        map.set(value, { label, value, count: (map.get(value)?.count || 0) + 1 });
      }
    });
    return Array.from(map.values()).sort((a,b)=> a.label.localeCompare(b.label));
  }, [filtered]);

  const title = titleFromDeal(dealType);
  const canonicalUrl = useMemo(() => {
    const basePath = LinkBuilder.toDeal(dealType, { sort: q.sort || 'best', category: q.category || '' });
    const url = new URL(basePath, window.location.origin);
    if (q.brand) url.searchParams.set('brand', q.brand);
    if (q.rating) url.searchParams.set('rating', q.rating);
    if (q.price_min) url.searchParams.set('price_min', q.price_min);
    if (q.price_max) url.searchParams.set('price_max', q.price_max);
    if (q.in_stock) url.searchParams.set('in_stock', '1');
    return url.toString();
  }, [dealType, q.sort, q.category, q.brand, q.rating, q.price_min, q.price_max, q.in_stock]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const onApplyMobile = (form) => {
    const csv = Array.isArray(form.brandList) ? form.brandList.join(',') : '';
    const next = {
      brand: csv,
      rating: form.rating,
      price_min: form.price_min,
      price_max: form.price_max,
      in_stock: form.in_stock ? 1 : '',
      page: 1
    };
    q.setMany(next);
    setMobileOpen(false);
  };

  // Debounce helpers for desktop price inputs
  const debounceRef = useRef();
  const setManyDebounced = (patch) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => q.setMany({ ...patch, page: 1 }), 350);
  };

  // Analytics: list impressions (handles Load More mode)
  useEffect(() => {
    try {
      const itemsToShow = Flags.BROWSE_LOAD_MORE ? loadMoreItems : pageItems;
      const list = itemsToShow.map((p, idx) => ({
        sku: String(p.sku || p._id || p.id || p.name),
        pos: Flags.BROWSE_LOAD_MORE ? (idx + 1) : ((page-1)*pageSize + idx + 1),
        price: Number(p.price) || 0,
      }));
      if (process.env.NODE_ENV !== 'production') {
        const renderedCount = itemsToShow.length;
        const positionsCount = list.length;
        if (renderedCount !== positionsCount) {
          // eslint-disable-next-line no-console
          console.warn('[browse] impression mismatch', { renderedCount, positionsCount, route: 'deals' });
        }
      }
      Events.track('list:impression', {
        route: 'deals',
        dealType,
        page,
        sort: q.sort,
        filters: {
          category: q.category,
          brand: q.brand,
          rating: q.rating,
          price_min: q.price_min,
          price_max: q.price_max,
          in_stock: q.in_stock,
        },
        items: list,
      });
    } catch(_){}
  }, [pageItems, loadMoreItems, loadedCount, page, pageSize, q.sort, q.brand, q.rating, q.price_min, q.price_max, q.in_stock, q.category, dealType]);

  // Analytics: list:view on state change
  useEffect(() => {
    try {
      Events.track('list:view', {
        route: 'deals',
        dealType,
        page,
        sort: q.sort,
        filters: {
          category: q.category,
          brand: q.brand,
          rating: q.rating,
          price_min: q.price_min,
          price_max: q.price_max,
          in_stock: q.in_stock,
        },
      });
    } catch(_){}
  }, [page, q.sort, q.brand, q.rating, q.price_min, q.price_max, q.in_stock, q.category, dealType]);

  // Analytics: list click tracking (handles Load More mode)
  useEffect(() => {
    const posMap = new Map();
    const itemsToShow = Flags.BROWSE_LOAD_MORE ? loadMoreItems : pageItems;
    itemsToShow.forEach((p, idx) => {
      const sku = String(p.sku || p._id || p.id || p.name);
      const pos = Flags.BROWSE_LOAD_MORE ? (idx + 1) : ((page-1)*pageSize + idx + 1);
      posMap.set(sku, pos);
    });
    const onClick = (e) => {
      try {
        const { sku } = e.detail || {};
        if (!sku) return;
        const pos = posMap.get(String(sku));
        Events.track('list:click', {
          route: 'deals',
          dealType,
          page,
          sort: q.sort,
          pos: pos || null,
          sku: String(sku),
        });
      } catch(_){}
    };
    window.addEventListener('ui:card_click', onClick);
    return () => window.removeEventListener('ui:card_click', onClick);
  }, [pageItems, loadMoreItems, loadedCount, page, pageSize, q.sort, dealType]);

  return (
    <main className="homepage-outer" role="main" style={{ padding: '12px 0' }}>
      <SeoHead
        title={`${title} • Deals • Merkato`}
        canonical={canonicalUrl}
      />
      <h1 style={{ position:'absolute', width:1, height:1, overflow:'hidden', clip:'rect(1px,1px,1px,1px)'}}>Deals</h1>
      {/* Sticky sub-header */}
      <div className="u-container" style={{ position:'sticky', top:64, zIndex:10, background:'var(--band-bg, #fff)', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
          <div>
            <h2 style={{ margin:'0 0 2px' }}>{title}</h2>
            <div style={{ color:'#64748b', fontSize:13 }}>{filtered.length} results</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label htmlFor="sort" style={{ marginRight:4 }}>Sort</label>
            <select id="sort" ref={sortBtnRef} value={q.sort} onChange={(e)=> { q.setMany({ sort: e.target.value, page:1 }, true); try{ window.scrollTo({ top:0, behavior:'smooth' }); } catch(_){} }}>
              <option value="best">Best match</option>
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
              <option value="newest">Newest</option>
              <option value="rating">Rating</option>
            </select>
            <button className="btn" ref={filterBtnRef} onClick={()=> setMobileOpen(true)} aria-label="Open filters">Filter</button>
          </div>
        </div>
      </div>

      <div className="u-container" style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:16 }}>
        {/* Facets */}
        <aside aria-label="Filters" style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:8, padding:12 }}>
          <div style={{ fontWeight:700, marginBottom:8 }}>Filters</div>
          <div style={{ marginBottom:12 }}>
            <label style={{ display:'block', fontWeight:600, marginBottom:6 }}>Category</label>
            <input
              type="text"
              placeholder="e.g., electronics"
              value={q.category}
              onChange={(e)=> q.setMany({ category: e.target.value, page: 1 })}
            />
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ display:'block', fontWeight:600, marginBottom:6 }}>Brand</label>
            <div style={{ display:'grid', gap:6 }}>
              {brandFacets.map((b) => {
                const val = b.value;
                const active = new Set(q.brandList);
                const checked = active.has(val);
                return (
                  <label key={b.value} style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'space-between' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = new Set(q.brandList);
                        if (e.target.checked) next.add(val); else next.delete(val);
                        const csv = Array.from(next).join(',');
                        q.setMany({ brand: csv, page: 1 });
                      }}
                    />
                    <span style={{ flex:1 }}>{b.label}</span>
                    <span aria-hidden style={{ color:'#64748b', fontSize:12 }}>{b.count}</span>
                  </label>
                );
              })}
            </div>
            {q.brandList?.length ? (
              <button style={{ marginTop:8 }} onClick={()=> q.setMany({ brand: '', page:1 })}>Clear brands</button>
            ) : null}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            <div>
              <label>Min</label>
              <input type="number" value={q.price_min} onChange={(e)=> setManyDebounced({ price_min: e.target.value })} />
            </div>
            <div>
              <label>Max</label>
              <input type="number" value={q.price_max} onChange={(e)=> setManyDebounced({ price_max: e.target.value })} />
            </div>
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input type="checkbox" checked={q.in_stock} onChange={(e)=> q.setMany({ in_stock: e.target.checked ? 1 : '' , page:1 })} />
            In stock only
          </label>
          {(q.category || q.brandList?.length || q.rating || q.price_min || q.price_max || q.in_stock) ? (
            <div style={{ marginTop:12 }}>
              <button onClick={()=> q.setMany({ category:'', brand:'', rating:'', price_min:'', price_max:'', in_stock:'', page:1 })}>Clear all</button>
            </div>
          ) : null}
        </aside>

        {/* Main */}
        <section>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div>
              <nav aria-label="Breadcrumbs" style={{ fontSize:12, color:'#64748b' }}>
                <Link to="/">Home</Link>
                <span> › </span>
                <span>Deals</span>
                <span> › </span>
                <span>{title}</span>
              </nav>
              <h2 style={{ margin:'6px 0 0' }}>{title}</h2>
              <div style={{ color:'#64748b', fontSize:13 }}>{filtered.length} results</div>
            </div>
            <div>
              <label htmlFor="sort" style={{ marginRight:8 }}>Sort</label>
              <select id="sort" value={q.sort} onChange={(e)=> q.setMany({ sort: e.target.value, page:1 }, true)}>
                <option value="best">Best match</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
                <option value="newest">Newest</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:16 }}>
            {loading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} aria-hidden className="skeleton" style={{ background:'#f3f4f6', height: 320, borderRadius:8 }} />
              ))
            ) : (Flags.BROWSE_LOAD_MORE ? loadMoreItems : pageItems).length ? (
              (Flags.BROWSE_LOAD_MORE ? loadMoreItems : pageItems).map((p, idx) => (
                <ProductCard
                  key={p._id || p.id}
                  product={p}
                  size="md"
                  listCtx={{ route: 'deals', dealType, category: q.category || '', page, sort: q.sort }}
                  position={Flags.BROWSE_LOAD_MORE ? (idx + 1) : ((page-1)*pageSize + idx + 1)}
                />
              ))
            ) : (
              <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'24px 0' }}>
                <div style={{ fontWeight:600, marginBottom:8 }}>No results</div>
                <button onClick={()=> q.setMany({ category:'', brand:'', rating:'', price_min:'', price_max:'', in_stock:'', page:1 })}>Clear filters</button>
              </div>
            )}
          </div>
          {loadError && (
            <div role="alert" style={{ marginTop:12, padding:12, border:'1px solid #fca5a5', background:'#fef2f2', color:'#991b1b', borderRadius:6 }}>
              <span>Couldn’t load items. </span>
              <button onClick={() => { setLoadError(false); loadItemsRef.current && loadItemsRef.current(); }}>Retry</button>
            </div>
          )}
          {Flags.BROWSE_LOAD_MORE ? (
            <div style={{ display:'flex', justifyContent:'center', margin:'16px 0' }}>
              <button
                onClick={() => setLoadedCount((n) => Math.min(filtered.length, n + pageSize))}
                disabled={loadedCount >= filtered.length}
              >
                {loadedCount >= filtered.length ? 'All items loaded' : 'Load more'}
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', gap:8, alignItems:'center', justifyContent:'center', margin:'16px 0' }}>
              <button disabled={page<=1} onClick={()=> { q.setMany({ page: Math.max(1, page-1) }); try{ window.scrollTo({ top:0, behavior:'smooth' }); } catch(_){} }}>← Prev</button>
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, idx) => {
                const n = idx + 1;
                return (
                  <button key={n} disabled={n===page} onClick={()=> { q.setMany({ page: n }); try{ window.scrollTo({ top:0, behavior:'smooth' }); } catch(_){} }}>{n}</button>
                );
              })}
              <span style={{ color:'#64748b' }}>Page {page} of {totalPages}</span>
              <button disabled={page>=totalPages} onClick={()=> { q.setMany({ page: Math.min(totalPages, page+1) }); try{ window.scrollTo({ top:0, behavior:'smooth' }); } catch(_){} }}>Next →</button>
            </div>
          )}
          {/* SEO: ItemList JSON-LD for current page */}
          <script type="application/ld+json" suppressHydrationWarning>
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              itemListElement: (Flags.BROWSE_LOAD_MORE ? loadMoreItems : pageItems).map((p, idx) => ({
                '@type': 'ListItem',
                position: (Flags.BROWSE_LOAD_MORE ? idx + 1 : (page-1)*pageSize + idx + 1),
                url: LinkBuilder.toPdp(p._id || p.id) || `/product/${p._id || p.id}`,
                name: p.name,
              })),
            })}
          </script>
        </section>
      </div>

      {/* aria-live region for Load More announcements */}
      <div aria-live="polite" aria-atomic="true" style={{ position:'absolute', width:1, height:1, overflow:'hidden', clip:'rect(1px,1px,1px,1px)' }} ref={liveRef} />

      <FilterSheet
        open={mobileOpen}
        onClose={()=> { setMobileOpen(false); try { (filterBtnRef.current || sortBtnRef.current)?.focus(); } catch(_){} }}
        onApply={(form)=> { onApplyMobile(form); try { (sortBtnRef.current || filterBtnRef.current)?.focus(); } catch(_){} }}
        initial={{ brandList: q.brandList, rating: q.rating, price_min: q.price_min, price_max: q.price_max, in_stock: q.in_stock, category: q.category }}
        brandFacets={brandFacets}
      />

      {/* SEO: BreadcrumbList JSON-LD */}
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
            { '@type': 'ListItem', position: 2, name: 'Deals', item: '/deals' },
            { '@type': 'ListItem', position: 3, name: title, item: LinkBuilder.toDeal(dealType, { sort: q.sort || 'best', category: q.category || '' }) },
          ],
        })}
      </script>
    </main>
  );
}
