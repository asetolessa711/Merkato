import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { syncCart } from '../utils/cartClient'';
import { toCents, convertCents, formatCurrency } from '../utils/currencyUtils'';
import SeoHead from '../components/SeoHead'';
import { LinkBuilder } from '../config/routes'';
import { Events } from '../utils/eventsClient'';

function ProductDetail({ currency = 'USD', rates = { USD: 1, ETB: 144, EUR: 0.91 } }) {
  const { id } = useParams();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: '', comment: '' });
  const [msg, setMsg] = useState('');
  const [recent, setRecent] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [allProducts, setAllProducts] = useState([]);
  const [cartAria, setCartAria] = useState('');
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  // Removed hover zoom and rotate; keeping simple arrows and lightbox only
  const [watchlisted, setWatchlisted] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pRes = await axios.get('/api/products');
        const list = Array.isArray(pRes.data) ? pRes.data : Array.isArray(pRes.data?.products) ? pRes.data.products : [];
    const prod = list.find(p => p._id === id) || list[0] || null;
    setProduct(prod);
    setAllProducts(list);
        const rRes = await axios.get(`/api/reviews/${id}`);
        const revs = Array.isArray(rRes.data) ? rRes.data : Array.isArray(rRes.data?.reviews) ? rRes.data.reviews : [];
        setReviews(revs);

        const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
        const updated = [id, ...viewed.filter(pid => pid !== id)].slice(0, 8);
        localStorage.setItem('recentlyViewed', JSON.stringify(updated));
        const matches = list.filter(p => updated.includes(p._id) && p._id !== id);
        setRecent(matches);
      } catch (err) {
        console.error('Failed to load product or reviews');
      }
    };
    fetchData();
  }, [id]);

  // Initialize gallery selection whenever product changes
  useEffect(() => {
    if (!product) return;
    setSelectedIndex(0);
    // init watchlist state by id
    try {
      const wl = JSON.parse(localStorage.getItem('merkato-watchlist') || '[]');
      setWatchlisted(Array.isArray(wl) && wl.includes(product._id));
    } catch { setWatchlisted(false); }
  }, [product]);

  // Build gallery per policy with preference for vendor-driven gallery derivatives.
  // Returns imageList (srcs) and dimsList (parallel sizes). realCount excludes placeholders.
  const { imageList, dimsList, realCount } = useMemo(() => {
    const allowPlaceholders = String(process.env.REACT_APP_ALLOW_GALLERY_PLACEHOLDERS) === 'true' || String(process.env.NODE_ENV) !== 'production';
    const lower = (s) => String(s || '').toLowerCase();

    // 1) Start from vendor-driven gallery if present
    const hasGallery = Array.isArray(product?.gallery) && product.gallery.length > 0;
    let base = [];
    if (hasGallery) {
      const approved = product.gallery.filter(g => (g?.moderation?.status || 'submitted') === 'approved' || String(process.env.NODE_ENV) !== 'production');
      // Prefer hero URL, then original; carry sizes when present
      base = approved.map(g => ({
        src: g.urlHero || g.urlOriginal || '',
        width: g.widthHero || g.widthOriginal || null,
        height: g.heightHero || g.heightOriginal || null,
        variantKey: g.variantKey || '',
      })).filter(it => !!it.src);
    }

    // 2) Fallback to legacy images/image fields
    if (!base.length) {
      const imgs = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
      const primary = product?.image ? [product.image] : [];
      base = [...imgs, ...primary].map(src => ({ src, width: null, height: null, variantKey: '' }));
    }

    // Deduplicate by src
    const seen = new Set();
    let deduped = [];
    for (const it of base) { if (it.src && !seen.has(it.src)) { seen.add(it.src); deduped.push(it); } }

    // 3) Variant-driven reordering by color: use gallery.variantKey when available, otherwise legacy maps
    const color = (product && typeof selectedColor === 'string' && selectedColor) ? String(selectedColor) : '';
    if (color) {
      const prioritized = [];
      const rest = [];
      const lc = lower(color);
      for (const it of deduped) {
        if (lower(it.variantKey) === lc) prioritized.push(it); else rest.push(it);
      }
      // Legacy maps
      if (!prioritized.length) {
        let variantImgs = [];
        const byColor = product?.imagesByColor || product?.colorImages || product?.images_by_color;
        if (byColor && (byColor[color] || byColor[lc])) {
          const arr = byColor[color] || byColor[lc];
          if (Array.isArray(arr)) variantImgs = arr.filter(Boolean);
        }
        if (!variantImgs.length && Array.isArray(product?.variants)) {
          const hit = product.variants.find(v => lower(v?.color || v?.name || v?.value) === lc);
          const arr = hit?.images || hit?.imageUrls || hit?.imgs;
          if (Array.isArray(arr)) variantImgs = arr.filter(Boolean);
        }
        if (variantImgs.length) {
          const vSeen = new Set(variantImgs);
          const front = deduped.filter(it => vSeen.has(it.src));
          const tail = deduped.filter(it => !vSeen.has(it.src));
          deduped = [...front, ...tail];
        } else {
          deduped = [...prioritized, ...rest];
        }
      } else {
        deduped = [...prioritized, ...rest];
      }
    }

    // 4) Placeholder policy
    let final = deduped.length ? deduped : [{ src: '/images/default-product.svg', width: null, height: null }];
    if (allowPlaceholders) {
      const placeholders = [
        '/images/default-angle-1.svg',
        '/images/default-angle-2.svg',
        '/images/default-angle-3.svg',
        '/images/default-angle-4.svg',
        '/images/default-angle-5.svg',
      ];
      let i = 0;
      while (final.length < 5 && i < placeholders.length) {
        final.push({ src: placeholders[i], width: 900, height: 900 });
        i += 1;
      }
    }

    const imageList = final.map(it => it.src);
    const dimsList = final.map(it => ({ width: Number(it.width) || 900, height: Number(it.height) || 900 }));
    // Count real images (exclude known placeholders)
    const realCount = final.filter(it => !/\/images\/default-angle-|\/images\/default-product\.svg$/.test(String(it.src))).length;
    return { imageList, dimsList, realCount };
  }, [product, selectedColor]);

  // Choose real hero for meta tags (exclude placeholders)
  const firstRealImage = useMemo(() => {
    // Prefer gallery hero
    if (Array.isArray(product?.gallery) && product.gallery.length) {
      const g = product.gallery.find(x => (x?.moderation?.status || 'submitted') === 'approved');
      const src = g?.urlHero || g?.urlOriginal || '';
      if (src) return src;
    }
    const candidates = Array.isArray(product?.images) && product.images.length
      ? product.images
      : (product?.image ? [product.image] : []);
    return candidates.find(Boolean) || null;
  }, [product]);

  const canonicalUrl = useMemo(() => {
    try {
      const origin = window.location.origin;
      if (!id) return origin + (window.location.pathname || '/');
      const pdpPath = LinkBuilder.toPdp(id);
      return pdpPath ? origin + pdpPath : origin + (window.location.pathname || '/');
    } catch (_) {
      return typeof location === 'object' && location?.pathname ? String(location.pathname) : '/';
    }
  }, [id]);
  const productJsonLd = useMemo(() => {
    if (!product) return null;
    const sku = String(product.sku || product._id || product.id || id);
    const name = product.name || '';
  const images = (Array.isArray(product.images) && product.images.length) ? product.images : (product.image ? [product.image] : []);
    const brandName = product.brand || 'Merkato';
    const price = Number(product.price || 0);
    const priceCurrency = product.currency || 'USD';
    const availability = (Number(product.countInStock || product.stock || 0) > 0)
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';
    const base = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      image: images,
      sku,
      brand: { '@type': 'Brand', name: brandName },
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency,
        price: price.toFixed(2),
        availability,
      },
    };
    try {
      const count = Array.isArray(reviews) ? reviews.length : 0;
      if (count > 0) {
        const total = reviews.reduce((n, r) => n + Number(r?.rating || 0), 0);
        const avg = total / count;
        base.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: Number(avg.toFixed(2)),
          reviewCount: count,
        };
      }
    } catch (_) { /* no-op */ }
    return base;
  }, [product, reviews, canonicalUrl, id]);
  useEffect(() => {
    if (!product) return;
    try {
      const fromList = location.state?.fromList;
      Events.track('product_view', {
        sku: String(product._id || product.id),
        price: Number(product.price) || 0,
        fromList: fromList || null,
      });
    } catch (_) {}
  }, [product, location.state]);

  const getDisplayPrice = (p) => {
    const productCurrency = p.currency || 'USD';
    const cents = toCents(p.price || 0);
    const conv = convertCents(cents, productCurrency, currency, rates);
    return formatCurrency(conv, currency);
  };

  const handleAddToCart = useCallback(async () => {
    // Require variant selections if options are defined
    if (Array.isArray(product?.sizes) && product.sizes.length && !selectedSize) {
      setMsg('Please select a size');
      return;
    }
    if (Array.isArray(product?.colors) && product.colors.length && !selectedColor) {
      setMsg('Please select a color');
      return;
    }
    const stored = localStorage.getItem('merkato-cart');
    const parsed = stored ? JSON.parse(stored) : { items: [], timestamp: 0 };
    const cart = parsed.items || [];

    const existing = cart.findIndex(item => item._id === product._id && (
      (item?.variant?.size || '') === (selectedSize || '') && (item?.variant?.color || '') === (selectedColor || '')
    ));
    if (existing !== -1) {
      cart[existing].quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1, variant: { size: selectedSize || '', color: selectedColor || '' } });
    }

    const now = Date.now();
    localStorage.setItem('merkato-cart', JSON.stringify({
      items: cart,
      timestamp: now
    }));
    // Mirror legacy key and update TTL metadata
    localStorage.setItem('cart', JSON.stringify(cart));
    const token = localStorage.getItem('token') || localStorage.getItem('merkato-token');
    const isAuthed = Boolean(token);
    localStorage.setItem('merkato-cart-ttl', JSON.stringify({ ts: now, maxAge: isAuthed ? 90 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 }));
    try { await syncCart(cart, token); } catch {}

    // Emit analytics event with PDP source
    try {
      const detail = { sku: String(product._id || product.id), price: Number(product.price) || 0, source: 'pdp', size: selectedSize || undefined, color: selectedColor || undefined };
      window.dispatchEvent(new CustomEvent('cart:add', { detail }));
    } catch {}

    // Analytics parity: emit cart:add with source=pdp
    try {
      const sku = String(product.sku || product._id || product.id || product.name);
      const price = Number(product.price) || 0;
      const detail = { sku, price, source: 'pdp' };
      window.dispatchEvent(new CustomEvent('cart:add', { detail }));
    } catch {}

    setCartAria('Product added to cart!');
  }, [product, selectedSize, selectedColor]);

  const handleBuyNow = useCallback(async () => {
    // Enforce selection via handleAddToCart; if it early-returns it will set msg
    const before = JSON.stringify(localStorage.getItem('merkato-cart'));
    await handleAddToCart();
    const after = JSON.stringify(localStorage.getItem('merkato-cart'));
    if (before === after) return; // no-op if not added due to missing selection
    try { Events.track('buy_now_click', { sku: String(product?._id || id) }); } catch {}
    navigate('/checkout', { state: { from: 'pdp', sku: String(product?._id || id) } });
  }, [handleAddToCart, navigate, product, id]);

  // Zoom/lightbox controls
  const openZoom = useCallback(() => { setZoomOpen(true); setZoomScale(1); }, []);
  const closeZoom = useCallback(() => setZoomOpen(false), []);
  const zoomIn = useCallback(() => setZoomScale((s) => Math.min(3, Number((s + 0.25).toFixed(2)))), []);
  const zoomOut = useCallback(() => setZoomScale((s) => Math.max(1, Number((s - 0.25).toFixed(2)))), []);
  const resetZoom = useCallback(() => setZoomScale(1), []);

  // Preload the next hero image for smoother clicks
  useEffect(() => {
    if (!imageList || imageList.length < 2) return;
    const next = Math.min(imageList.length - 1, selectedIndex + 1);
    if (next === selectedIndex) return;
    try {
      const head = document.head || document.getElementsByTagName('head')[0];
      if (!head) return;
      const href = imageList[next];
      // Deduplicate by href
      const existing = head.querySelector(`link[rel="preload"][as="image"][href="${href}"]`);
      if (existing) return;
      const link = document.createElement('link');
      link.setAttribute('rel', 'preload');
      link.setAttribute('as', 'image');
      link.setAttribute('href', href);
      head.appendChild(link);
    } catch (_) {}
  }, [imageList, selectedIndex]);

  // Share link (copy canonical) with aria-live announcement
  const copyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(String(canonicalUrl));
      setCartAria('Link copied to clipboard');
    } catch (_) {
      setCartAria('Copy failed');
    }
  }, [canonicalUrl]);

  // Spin/360 control cycles through imageList
  // (spin/rotate removed per UX)

  // Watchlist toggle persisted in localStorage
  const toggleWatchlist = useCallback(() => {
    try {
      const wl = JSON.parse(localStorage.getItem('merkato-watchlist') || '[]');
      const arr = Array.isArray(wl) ? wl : [];
      const idx = arr.indexOf(product._id);
      if (idx >= 0) { arr.splice(idx, 1); setWatchlisted(false); }
      else { arr.push(product._id); setWatchlisted(true); }
      localStorage.setItem('merkato-watchlist', JSON.stringify(arr));
      setCartAria(watchlisted ? 'Removed from watchlist' : 'Added to watchlist');
    } catch {}
  }, [product?._id, watchlisted]);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!token) return setMsg('Please log in to review.');
    try {
      await axios.post(`/api/reviews/${id}`, reviewForm, { headers });
      setMsg('Review submitted!');
      setReviewForm({ rating: '', comment: '' });
      const rRes = await axios.get(`/api/reviews/${id}`);
      setReviews(rRes.data);
    } catch (err) {
      setMsg('Failed to submit. You may have already reviewed.');
    }
  };

  // Remove on-page checkout in favor of Buy Now shortcut to dedicated flow

  const backToResultsHref = useMemo(() => {
    const ctx = location.state?.fromList;
    if (!ctx) return null;
    if (ctx.route === 'category') {
      const base = ctx.subcat
        ? LinkBuilder.toSubcategory(ctx.category, ctx.subcat, { sort: ctx.sort || 'best' })
        : LinkBuilder.toCategory(ctx.category, { sort: ctx.sort || 'best' });
      const url = new URL(base, window.location.origin);
      if (ctx.page) url.searchParams.set('page', ctx.page);
      return url.pathname + (url.search || '');
    }
    if (ctx.route === 'deals') {
      const base = LinkBuilder.toDeal(ctx.dealType || 'under-25', { category: ctx.category || '', sort: ctx.sort || 'best' });
      const url = new URL(base, window.location.origin);
      if (ctx.page) url.searchParams.set('page', ctx.page);
      return url.pathname + (url.search || '');
    }
    return '/';
  }, [location.state]);

  // Compute a simple rating summary from reviews
  const ratingSummary = useMemo(() => {
    const count = Array.isArray(reviews) ? reviews.length : 0;
    if (count === 0) return { avg: 0, count: 0 };
    const total = reviews.reduce((n, r) => n + Number(r?.rating || 0), 0);
    const avg = total / count;
    return { avg, count };
  }, [reviews]);

  // Availability helper for PDP
  const availability = useMemo(() => {
    const stock = Number(product?.stock ?? product?.countInStock ?? 0);
    if (stock <= 0) return { label: 'Out of stock', color: '#ef4444', status: 'oos' };
    if (stock <= 10) return { label: 'Almost gone', color: '#f59e0b', status: 'low' };
    return { label: 'In stock', color: '#10b981', status: 'in' };
  }, [product]);

  // Build breadcrumb links based on list context if available
  const breadcrumb = useMemo(() => {
    const items = [];
    items.push({ label: 'Home', href: '/' });
    const from = location.state?.fromList;
    if (from && from.route === 'category' && from.category) {
      if (from.subcat) {
        items.push({ label: String(from.category), href: LinkBuilder.toCategory(from.category, { sort: from.sort || 'best' }) });
        items.push({ label: String(from.subcat), href: LinkBuilder.toSubcategory(from.category, from.subcat, { sort: from.sort || 'best' }) });
      } else {
        items.push({ label: String(from.category), href: LinkBuilder.toCategory(from.category, { sort: from.sort || 'best' }) });
      }
    } else if (product?.category) {
      // Fallback: show category label without linking if we don't know the canonical slug
      items.push({ label: String(product.category), href: null });
    }
    if (product?.name) items.push({ label: String(product.name), href: null });
    return items;
  }, [location.state, product]);

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto', fontFamily: 'Poppins, sans-serif' }}>
      <SeoHead
        title={`${product?.name ? product.name + ' • ' : ''}Merkato`}
        canonical={canonicalUrl}
        ogImage={firstRealImage || undefined}
        twitterImage={firstRealImage || undefined}
      />
      {productJsonLd && (
        <script type="application/ld+json" suppressHydrationWarning>
          {JSON.stringify(productJsonLd)}
        </script>
      )}
      <div aria-live="polite" style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>{cartAria}</div>
      {/* Breadcrumbs */}
      {/* Breadcrumbs hidden per UX request */}
      {backToResultsHref && (
        <div style={{ marginBottom: 8 }}>
          <Link to={backToResultsHref}>← Back to results</Link>
        </div>
      )}
      {!product ? <p>Loading...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 560px) 1fr', gap: 24, alignItems: 'start' }}>
          {/* LEFT: Image-led gallery */}
          <div style={{ display: 'grid', gridTemplateColumns: realCount >= 2 ? '80px 1fr' : '1fr', gap: 12 }}>
            {/* Thumbs column (always visible) */}
            {realCount >= 2 && (
            <div
              role="listbox"
              aria-label="Product images"
              tabIndex={0}
              onKeyDown={(e) => {
                if (!imageList.length) return;
                if (['ArrowDown','ArrowRight'].includes(e.key)) { e.preventDefault(); setSelectedIndex((i) => Math.min(imageList.length - 1, i + 1)); }
                if (['ArrowUp','ArrowLeft'].includes(e.key)) { e.preventDefault(); setSelectedIndex((i) => Math.max(0, i - 1)); }
                if (e.key === 'Home') { e.preventDefault(); setSelectedIndex(0); }
                if (e.key === 'End') { e.preventDefault(); setSelectedIndex(imageList.length - 1); }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}
            >
              {imageList.map((src, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedIndex(i);
                    try {
                      const isPlaceholder = /\/images\/default-angle-|\/images\/default-product\.svg$/.test(String(src));
                      Events.track('pdp:thumb_click', { index: i, isPlaceholder, sku: String(product?._id || id) });
                    } catch {}
                  }}
                  role="option"
                  aria-selected={i === selectedIndex}
                  aria-label={`Select image ${i + 1} of ${imageList.length}`}
                  style={{
                    padding: 0,
                    border: i === selectedIndex ? '2px solid #00B894' : '1px solid #ddd',
                    borderRadius: 6,
                    background: 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <img src={src} alt={`Thumbnail ${i + 1}`} loading="lazy" width={72} height={72} style={{ height: 72, width: 72, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
                </button>
              ))}
            </div>
            )}
            {/* Hero */}
            <div aria-label={product?.name || 'Product image'} style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', maxHeight: 560, overflow: 'hidden' }}>
              <img
                src={imageList[selectedIndex]}
                alt={product?.name || 'Product'}
                width={dimsList[selectedIndex]?.width || 900}
                height={dimsList[selectedIndex]?.height || 900}
                decoding="async"
                fetchpriority="high"
                style={{ width: '100%', height: '100%', borderRadius: 10, objectFit: 'cover', display: 'block' }}
              />
              {/* Lightbox trigger removed from hero per UX; arrows retained */}
              {realCount >= 2 && (
                <>
                  <button aria-label="Previous image" onClick={() => {
                    setSelectedIndex((i) => {
                      const next = Math.max(0, i - 1);
                      try {
                        const src = imageList[next];
                        const isPlaceholder = /\/images\/default-angle-|\/images\/default-product\.svg$/.test(String(src));
                        Events.track('pdp:hero_change', { index: next, isPlaceholder, via: 'prev', sku: String(product?._id || id) });
                      } catch {}
                      return next;
                    });
                  }}
                    style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: '#fff', border: '1px solid #ddd', borderRadius: 999, padding: 8, cursor: 'pointer' }}>‹</button>
                  <button aria-label="Next image" onClick={() => {
                    setSelectedIndex((i) => {
                      const next = Math.min(imageList.length - 1, i + 1);
                      try {
                        const src = imageList[next];
                        const isPlaceholder = /\/images\/default-angle-|\/images\/default-product\.svg$/.test(String(src));
                        Events.track('pdp:hero_change', { index: next, isPlaceholder, via: 'next', sku: String(product?._id || id) });
                      } catch {}
                      return next;
                    });
                  }}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: '#fff', border: '1px solid #ddd', borderRadius: 999, padding: 8, cursor: 'pointer' }}>›</button>
                </>
              )}
            </div>
          </div>

          {/* RIGHT: Info + CTAs */}
          <div style={{ minWidth: 320 }}>
            {/* Move description near top: title + short description */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h1 style={{ margin: 0, fontSize: '1.25rem', lineHeight: 1.2, flex: 1 }}>{product.name}</h1>
              <button onClick={copyShareLink} aria-label="Copy link to product"
                style={{ border: '1px solid #ddd', background: '#fff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>
                Share
              </button>
            </div>
            {product?.description && (
              <p style={{ margin: '0 0 8px 0', color: '#444' }}>{String(product.description).slice(0, 280)}</p>
            )}
            {/* Rating summary next to title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              {ratingSummary.count > 0 ? (
                <>
                  <span aria-label={`Average rating ${ratingSummary.avg.toFixed(1)} out of 5`}>
                    {'★'.repeat(Math.round(ratingSummary.avg))}
                    {'☆'.repeat(Math.max(0, 5 - Math.round(ratingSummary.avg)))}
                  </span>
                  <Link to="#reviews" style={{ color: '#0984e3', textDecoration: 'none' }}>
                    {ratingSummary.avg.toFixed(1)} ({ratingSummary.count} reviews)
                  </Link>
                </>
              ) : (
                <span style={{ color: '#888' }}>No ratings yet</span>
              )}
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: availability.color, color: '#fff', fontSize: 12 }}>{availability.label}</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#00B894', margin: '0 0 10px 0' }}>{getDisplayPrice(product)}</p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <button data-testid="add-to-cart-btn" onClick={handleAddToCart} disabled={availability.status === 'oos'}
                style={{ backgroundColor: '#00B894', color: 'white', padding: '10px 14px', border: 'none', borderRadius: 6, opacity: availability.status === 'oos' ? 0.6 : 1 }}>
                🛒 Add to Cart
              </button>
              <button onClick={handleBuyNow} disabled={availability.status === 'oos'}
                style={{ backgroundColor: '#0984e3', color: 'white', padding: '10px 14px', border: 'none', borderRadius: 6, opacity: availability.status === 'oos' ? 0.6 : 1 }}>
                ⚡ Buy Now
              </button>
              <button onClick={toggleWatchlist}
                aria-pressed={watchlisted}
                style={{ background: watchlisted ? '#ffe4e6' : '#fff', color: watchlisted ? '#b91c1c' : '#333', border: '1px solid #ddd', padding: '10px 14px', borderRadius: 6 }}>
                {watchlisted ? '♥ In Watchlist' : '♡ Add to Watchlist'}
              </button>
            </div>

            {/* Size and Color selection (dropdowns) */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 10, fontSize: 14, marginBottom: 10 }}>
              <label htmlFor="pdp-size" style={{ color: '#666', alignSelf: 'center' }}>Size</label>
              <select id="pdp-size" value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', maxWidth: 260 }}>
                <option value="">Select</option>
                {(Array.isArray(product?.sizes) && product.sizes.length ? product.sizes : ['S','M','L','XL']).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <label htmlFor="pdp-color" style={{ color: '#666', alignSelf: 'center' }}>Color</label>
              <select id="pdp-color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', maxWidth: 260 }}>
                <option value="">Select</option>
                {(Array.isArray(product?.colors) && product.colors.length ? product.colors : ['Black','White','Blue']).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Key details / specs */}
            <div style={{ fontSize: 14, color: '#333', display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 6 }}>
              {product.brand && (<><div style={{ color: '#666' }}>Brand</div><div>{product.brand}</div></>)}
              {product.category && (<><div style={{ color: '#666' }}>Category</div><div>{product.category}</div></>)}
              {product.sku && (<><div style={{ color: '#666' }}>SKU</div><div>{String(product.sku)}</div></>)}
              <div style={{ color: '#666' }}>Stock</div><div>{Number(product.stock ?? product.countInStock ?? 0)}</div>
              {(product.vendor || product.vendorId || product.vendor_id) && (
                <>
                  <div style={{ color: '#666' }}>Seller</div>
                  <div>
                    {(() => {
                      const v = String(product.vendorSlug || product.vendorName || product.vendor || product.vendorId || product.vendor_id || '').toString();
                      const href = v ? LinkBuilder.toVendor(v) : null;
                      return href ? <Link to={href} style={{ color: '#0984e3', textDecoration: 'none' }}>{v}</Link> : <span>{v || '—'}</span>;
                    })()}
                  </div>
                </>
              )}
            </div>
            {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
          </div>
        </div>
      )}

      {/* Description moved above; keep specs below if needed */}

      {/* You May Like */}
      {recent.length > 0 && (
        <section style={{ marginTop: 50 }}>
          <h3>You May Like</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
            {recent.map(p => (
              <div key={p._id} style={{ background: '#fff', padding: 12, borderRadius: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <Link to={LinkBuilder.toPdp(p._id)} style={{ textDecoration: 'none', color: '#333' }}>
                  {(p.image || (Array.isArray(p.images) && p.images[0])) && (
                    <img src={(Array.isArray(p.images) && p.images[0]) || p.image} alt={p.name} style={{ height: 120, width: '100%', objectFit: 'cover', borderRadius: 6 }} />
                  )}
                  <h5 style={{ marginTop: 8 }}>{p.name}</h5>
                  <p style={{ fontWeight: 'bold', color: '#00B894' }}>{getDisplayPrice(p)}</p>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Similar items */}
      {(() => {
        const basePrice = Number(product?.price || 0);
        const cat = (product?.category || '').toLowerCase();
        const items = Array.isArray(allProducts) ? allProducts.filter(p => {
          if (!p || (p._id === product?._id)) return false;
          if ((p.category || '').toLowerCase() !== cat) return false;
          const stock = Number(p.stock || p.countInStock || 0);
          if (stock <= 0) return false;
          const px = Number(p.price || 0);
          if (!basePrice) return true;
          return px >= basePrice * 0.5 && px <= basePrice * 1.5;
        }).slice(0, 8) : [];
        if (!items.length) return null;
        return (
          <section style={{ marginTop: 36 }}>
            <h3>Explore similar items</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
              {items.map(p => (
                <div key={p._id} style={{ background: '#fff', padding: 12, borderRadius: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <Link to={LinkBuilder.toPdp(p._id)} style={{ textDecoration: 'none', color: '#333' }}>
                    {(p.image || (Array.isArray(p.images) && p.images[0])) && (
                      <img src={(Array.isArray(p.images) && p.images[0]) || p.image} alt={p.name} style={{ height: 120, width: '100%', objectFit: 'cover', borderRadius: 6 }} />
                    )}
                    <h5 style={{ marginTop: 8 }}>{p.name}</h5>
                    <p style={{ fontWeight: 'bold', color: '#00B894' }}>{getDisplayPrice(p)}</p>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Seller's other items */}
      {(() => {
        const v = product?.vendor || product?.vendorId || product?.vendor_id;
        const items = (v && Array.isArray(allProducts)) ? allProducts.filter(p => {
          if (!p || (p._id === product?._id)) return false;
          const stock = Number(p.stock || p.countInStock || 0);
          if (stock <= 0) return false;
          return String(p.vendor || p.vendorId || p.vendor_id) === String(v);
        }).slice(0, 8) : [];
        if (!items.length) return null;
        return (
          <section style={{ marginTop: 36 }}>
            <h3>More from this seller</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
              {items.map(p => (
                <div key={p._id} style={{ background: '#fff', padding: 12, borderRadius: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <Link to={LinkBuilder.toPdp(p._id)} style={{ textDecoration: 'none', color: '#333' }}>
                    {(p.image || (Array.isArray(p.images) && p.images[0])) && (
                      <img src={(Array.isArray(p.images) && p.images[0]) || p.image} alt={p.name} style={{ height: 120, width: '100%', objectFit: 'cover', borderRadius: 6 }} />
                    )}
                    <h5 style={{ marginTop: 8 }}>{p.name}</h5>
                    <p style={{ fontWeight: 'bold', color: '#00B894' }}>{getDisplayPrice(p)}</p>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      <hr style={{ margin: '40px 0' }} />

  <h3 id="reviews">Customer Reviews</h3>
      {reviews.length === 0 ? (
        <p>No reviews yet.</p>
      ) : (
        reviews.map((r) => (
          <div key={r._id} style={{ marginBottom: 10, padding: 10, background: '#f9f9f9', borderRadius: 6 }}>
            <strong>{r.user?.name || 'Anonymous'}:</strong><br />
            {'★'.repeat(r.rating)} ({r.rating}/5)
            <p>{r.comment}</p>
          </div>
        ))
      )}

      <h4>Write a Review</h4>
      <form onSubmit={submitReview}>
        <label>Rating (1–5)</label>
        <input
          type="number"
          name="rating"
          min="1"
          max="5"
          value={reviewForm.rating}
          onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}
          required
        />

        <label>Comment</label>
        <textarea
          name="comment"
          value={reviewForm.comment}
          onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
          required
          rows={3}
        />

        <button type="submit">Submit Review</button>
      </form>

      {/* Zoom/Lightbox Modal */}
      {zoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); closeZoom(); }
            if (['ArrowRight'].includes(e.key)) { e.preventDefault(); setSelectedIndex((i) => Math.min(imageList.length - 1, i + 1)); resetZoom(); }
            if (['ArrowLeft'].includes(e.key)) { e.preventDefault(); setSelectedIndex((i) => Math.max(0, i - 1)); resetZoom(); }
            if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); }
            if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomOut(); }
            if (e.key.toLowerCase() === 'r') { e.preventDefault(); resetZoom(); }
          }}
          tabIndex={-1}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeZoom(); }}
        >
          <button aria-label="Close" onClick={closeZoom} style={{ position: 'absolute', top: 16, right: 16, background: '#fff', border: '1px solid #ddd', borderRadius: 999, padding: '8px 10px', cursor: 'pointer' }}>✕</button>
          {realCount >= 2 && (
            <button aria-label="Previous image" onClick={() => {
              setSelectedIndex((i) => {
                const next = Math.max(0, i - 1);
                try {
                  const src = imageList[next];
                  const isPlaceholder = /\/images\/default-angle-|\/images\/default-product\.svg$/.test(String(src));
                  Events.track('pdp:hero_change', { index: next, isPlaceholder, via: 'modal-prev', sku: String(product?._id || id) });
                } catch {}
                return next;
              });
              resetZoom();
            }}
              style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', background: '#fff', border: '1px solid #ddd', borderRadius: 999, padding: 12, cursor: 'pointer' }}>‹</button>
          )}
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh' }}>
            <img
              src={imageList[selectedIndex]}
              alt={product?.name || 'Product'}
              style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center', maxWidth: '90vw', maxHeight: '85vh', display: 'block', borderRadius: 8 }}
            />
            <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
              <button onClick={zoomOut} aria-label="Zoom out" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>−</button>
              <button onClick={resetZoom} aria-label="Reset zoom" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>Reset</button>
              <button onClick={zoomIn} aria-label="Zoom in" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>+</button>
            </div>
          </div>
          {realCount >= 2 && (
            <button aria-label="Next image" onClick={() => {
              setSelectedIndex((i) => {
                const next = Math.min(imageList.length - 1, i + 1);
                try {
                  const src = imageList[next];
                  const isPlaceholder = /\/images\/default-angle-|\/images\/default-product\.svg$/.test(String(src));
                  Events.track('pdp:hero_change', { index: next, isPlaceholder, via: 'modal-next', sku: String(product?._id || id) });
                } catch {}
                return next;
              });
              resetZoom();
            }}
              style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', background: '#fff', border: '1px solid #ddd', borderRadius: 999, padding: 12, cursor: 'pointer' }}>›</button>
          )}
        </div>
      )}

    </div>
  );
}

export default ProductDetail;
