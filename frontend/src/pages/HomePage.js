import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/routes';
import apiClient from '../utils/apiClient';
import './HomePage.css';
import ProductCard from '../components/ProductCard'; // ✅ Already imported
import Hero from '../components/Hero';

const categories = [
  "Today's Deals", "Flash Deals", "Trending", "Season's Favorites", "Top Vendors",
  "Fashion", "Beauty", "Electronics", "Home & Living", "Toys & Games",
  "Sports", "Gadgets", "Accessories", "More"
];


function HomePage() {
  const navigate = useNavigate();
  const isCypress = typeof window !== 'undefined' && window.Cypress;
  const [products, setProducts] = useState([]);
  const [_, setWarmHue] = useState(48); // base warm hue (gold-ish)
  // Search state not currently used (handled by Navbar)
  const [selectedCategory] = useState(categories[0]);
  // Get promo video URL from localStorage (set by admin upload)
  const [promoVideoUrl] = useState(localStorage.getItem('promoVideoUrl') || '');
  const track = (event, meta) => {
    try {
      const key = 'merkato-analytics';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      const next = [{ t: Date.now(), e: event, ...meta }].concat(Array.isArray(arr) ? arr : []).slice(0, 200);
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('analytics:click', { detail: { event, ...meta } }));
    } catch (_) {}
  };

  // Utility: adaptive horizontal scroll (80% of visible width)
  const scrollByAmount = (el, dir = 1) => {
    if (!el) return;
    const amount = Math.max(320, Math.floor((el.clientWidth || 600) * 0.8));
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  // Refs for rows to avoid repeated DOM queries
  const dealsRef = useRef(null);
  const featuredRef = useRef(null);
  const minimalRef = useRef(null);
  const richRef = useRef(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const all = await apiClient.get('/products');
        const list = Array.isArray(all?.data) ? all.data : (Array.isArray(all?.data?.products) ? all.data.products : []);
        setProducts(list);
      } catch (_) {
        setProducts([]);
      }
    };
    loadProducts();
  }, []);

  // Warm background shifts with scroll (Amazon-like energy)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      const hue = 40 + Math.min(20, Math.floor(y / 80));
      setWarmHue(hue);
      try {
        document.documentElement.style.setProperty('--hero-warm', `hsl(${hue} 100% 90%)`);
      } catch (_) {}
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleAddToCart = (product) => {
    try {
      const saved = JSON.parse(localStorage.getItem('merkato-cart') || '{}');
      const items = Array.isArray(saved.items) ? saved.items : [];
      const id = typeof product._id === 'object' ? product._id.toString() : product._id;
      const idx = items.findIndex(i => i._id === id);
      if (idx !== -1) items[idx].quantity += 1; else items.push({ ...product, _id: id, quantity: 1 });
      localStorage.setItem('merkato-cart', JSON.stringify({ items, timestamp: Date.now() }));
      localStorage.setItem('cart', JSON.stringify(items));
    } catch (_) {}
  };

  const rowTitles = (() => {
    // Admin/Vendor configurable via localStorage or future API
    try {
      const cfg = JSON.parse(localStorage.getItem('homepage-row-titles') || 'null');
      if (cfg && typeof cfg === 'object') return cfg;
    } catch (_) {}
    return {
      deals: 'Flash Deals',
      featured: 'Featured Products',
      picks: 'Popular Picks',
      minimal: 'Just For You'
    };
  })();

  const filteredProducts = (Array.isArray(products) ? products : [])
    .filter(p => selectedCategory === "Today's Deals" || p?.category === selectedCategory)
    .slice(0, 10);

  // Enforce first rows: Deals (6-10) → Featured (6-10) → Just For You (6-10)
  const flashDeals = (Array.isArray(products) ? products : [])
    .filter(p => p?.promotion?.isPromoted || (Number(p?.discount) > 0))
    .slice(0, 10);

  // Recently viewed (localStorage: merkato-recently-viewed = [ids])
  const recentlyViewed = (() => {
    try {
  const ids = JSON.parse(localStorage.getItem('merkato-recently-viewed') || '[]');
      if (!Array.isArray(ids) || ids.length === 0) return [];
      const set = new Set(ids);
  const found = (Array.isArray(products) ? products : []).filter(p => set.has(p._id)).slice(0, 10);
      return found;
    } catch (_) { return []; }
  })();

  // Search bar is handled in Navbar; keep state for future enhancements.

  // Demo review cards (8+ for horizontal scroll)
  const reviewDemoProducts = Array.from({ length: 8 }).map((_, i) => ({
    _id: `demo${i+1}`,
    name: `Demo Product ${i+1}`,
    image: '/images/default-product.png',
    price: 10 + i * 5.5,
    discount: i % 2 === 0 ? 10 : 0,
    theme: 'mint',
    promotion: i % 3 === 0 ? { isPromoted: true, badgeText: 'Top Rated' } : {},
    vendor: { name: `vendor${i+1}` },
    stock: i % 4 === 0 ? 0 : 10 + i,
    description: `Demo product #${i+1} for scroll test.`
  }));

  return (
    <div className="homepage-outer">

      {/* Hero Section: Amazon-like full-width rotating banners */}
  <div style={{ marginTop: 0 }}>
        <Hero
      offsetTop={0}
          fullBleed
          containerWidth={1680}
          slides={[
            {
              title: 'Kitchen essentials',
              subtitle: 'Trending looks, smart basics, and everyday steals.',
              ctaText: 'Shop Fashion',
              onCtaClick: () => navigate(`${ROUTES.shop}?cat=fashion&priceMax=50`),
              secondaryCtaText: 'New Arrivals',
              onSecondaryCtaClick: () => navigate(`${ROUTES.shop}?cat=fashion&sort=new`),
              imageSrc: '/images/hero-kitchen.jpg',
              imageAlt: 'Kitchen essentials collage',
              variant: 'banner',
              bg: '#e7b8ff',
            },
            {
              title: 'Tech for every budget',
              subtitle: 'Headphones, smartwatches, and gadgets you will love.',
              ctaText: 'Explore Electronics',
              onCtaClick: () => navigate(`${ROUTES.shop}?cat=electronics`),
              secondaryCtaText: 'Best Sellers',
              onSecondaryCtaClick: () => navigate(`${ROUTES.shop}?cat=electronics&sort=top`),
              imageSrc: '/images/hero-tech.jpg',
              imageAlt: 'Electronics collage',
              variant: 'banner',
              bg: '#cfe7ff',
            },
            {
              title: 'Home refresh for less',
              subtitle: 'Cozy decor, kitchen helpers, and storage solutions.',
              ctaText: 'Shop Home & Living',
              onCtaClick: () => navigate(`${ROUTES.shop}?cat=home%20%26%20living`),
              secondaryCtaText: 'Deal Hub',
              onSecondaryCtaClick: () => navigate(`${ROUTES.shop}?sort=deals`),
              imageSrc: '/images/hero-home.jpg',
              imageAlt: 'Home goods collage',
              variant: 'banner',
              bg: '#ffe3b3',
            },
          ]}
          autoPlayMs={6000}
          personalization={(function(){
            try {
              const u = JSON.parse(localStorage.getItem('user')||'null');
              if (u?.name) return `Deals tailored for you, ${u.name}`;
              if (u) return 'Deals tailored for you';
            } catch(_){}
            return undefined;
          })()}
        />
      </div>
  {/* trust strip removed; using MicroBanner trust ticker instead */}
      {/* Category chips under hero (scrollable on mobile) */}
  <nav aria-label="Browse by category" className="category-cards-row" style={{ marginTop: 12 }}>
        {['Fashion','Electronics','Home & Living','Beauty','Toys & Games','Sports','Gadgets','Accessories'].map((cat) => (
          <button
            key={`chip-${cat}`}
            className="category-card"
    onClick={() => { track('chip:click', { cat }); navigate(`/shop?category=${encodeURIComponent(cat.toLowerCase())}`); }}
            aria-label={`Shop ${cat}`}
          >
            {cat}
          </button>
        ))}
      </nav>
      {/* Promotional Video (if available) */}
      {promoVideoUrl && (
        <div style={{ margin: '2rem auto', maxWidth: 600 }}>
          <video controls width="100%" src={promoVideoUrl} />
        </div>
      )}
  {/* Main Content Scrollable (vertical) */}
      <div className="homepage-main-scrollable">
        {/* Flash Deals Row (Horizontal Scroll) */}
  {flashDeals.length > 0 && (
          <section className="flash-deals" style={{ contentVisibility: 'auto' }}>
            <div className="section-header">
              <h2>{rowTitles.deals}</h2>
              <Link to="/shop?sort=deals" className="view-all-link">View all</Link>
            </div>
            <div className="products-row-scroll row-scroller" id="row-deals" ref={dealsRef} style={{ position: 'relative', scrollSnapType: 'x mandatory', overflowX: 'auto' }} onKeyDown={(e) => { if (e.key === 'ArrowLeft') scrollByAmount(dealsRef.current, -1); if (e.key === 'ArrowRight') scrollByAmount(dealsRef.current, 1); }} tabIndex={0}>
                <button className="row-arrow" aria-label="Prev" onClick={() => scrollByAmount(dealsRef.current, -1)} style={{ position: 'sticky', left: 0, alignSelf: 'center', zIndex: 2, border: 'none', background: 'linear-gradient(90deg, rgba(253,253,253,0.95), rgba(253,253,253,0))', width: 36, height: 120, cursor: 'pointer', borderRadius: 8 }}>‹</button>
              {flashDeals.length > 0 ? (
                flashDeals.slice(0, 10).map(product => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    type="deal"
                    size="md"
                    colorOptions={product.colors || []}
                    onAddToCart={handleAddToCart}
                  />
                ))
              ) : (
                <p>No flash deals right now — check back later!</p>
              )}
              <button className="row-arrow" aria-label="Next" onClick={() => scrollByAmount(dealsRef.current, 1)} style={{ position: 'sticky', right: 0, marginLeft: 'auto', alignSelf: 'center', zIndex: 2, border: 'none', background: 'linear-gradient(270deg, rgba(253,253,253,0.95), rgba(253,253,253,0))', width: 36, height: 120, cursor: 'pointer', borderRadius: 8 }}>›</button>
            </div>
          </section>
        )}
        {/* General Category Products Row (Horizontal Scroll) */}
  {selectedCategory !== "Flash Deals" && filteredProducts.length > 0 && (
      <section className="best-sellers" style={{ contentVisibility: 'auto' }}>
            <div className="section-header">
              <h2>{rowTitles.featured}</h2>
              <Link to="/shop" className="view-all-link">View all</Link>
            </div>
            <div className="products-row-scroll row-scroller" id="row-featured" ref={featuredRef} style={{ position: 'relative', scrollSnapType: 'x mandatory', overflowX: 'auto' }} onKeyDown={(e) => { if (e.key === 'ArrowLeft') scrollByAmount(featuredRef.current, -1); if (e.key === 'ArrowRight') scrollByAmount(featuredRef.current, 1); }} tabIndex={0}>
                <button className="row-arrow" aria-label="Prev" onClick={() => scrollByAmount(featuredRef.current, -1)} style={{ position: 'sticky', left: 0, alignSelf: 'center', zIndex: 2, border: 'none', background: 'linear-gradient(90deg, rgba(253,253,253,0.95), rgba(253,253,253,0))', width: 36, height: 120, cursor: 'pointer', borderRadius: 8 }}>‹</button>
              {filteredProducts.slice(0, 10).map(product => (
                <ProductCard
                  key={product._id}
                  product={product}
                  type="standard"
                  size="md"
                  colorOptions={product.colors || []}
                  onAddToCart={handleAddToCart}
                />
              ))}
              <button className="row-arrow" aria-label="Next" onClick={() => scrollByAmount(featuredRef.current, 1)} style={{ position: 'sticky', right: 0, marginLeft: 'auto', alignSelf: 'center', zIndex: 2, border: 'none', background: 'linear-gradient(270deg, rgba(253,253,253,0.95), rgba(253,253,253,0))', width: 36, height: 120, cursor: 'pointer', borderRadius: 8 }}>›</button>
            </div>
          </section>
        )}

        {/* Amazon-like minimal cards row */}
        {filteredProducts.length > 0 && (
          <section className="best-sellers" style={{ contentVisibility: 'auto' }}>
            <div className="section-header">
              <h2>{rowTitles.minimal}</h2>
              <Link to="/shop" className="view-all-link">View all</Link>
            </div>
            <div className="products-row-scroll row-scroller" id="row-minimal" ref={minimalRef} style={{ position: 'relative', scrollSnapType: 'x mandatory', overflowX: 'auto' }} onKeyDown={(e) => { if (e.key === 'ArrowLeft') scrollByAmount(minimalRef.current, -1); if (e.key === 'ArrowRight') scrollByAmount(minimalRef.current, 1); }} tabIndex={0}>
                <button className="row-arrow" aria-label="Prev" onClick={() => scrollByAmount(minimalRef.current, -1)} style={{ position: 'sticky', left: 0, alignSelf: 'center', zIndex: 2, border: 'none', background: 'linear-gradient(90deg, rgba(253,253,253,0.95), rgba(253,253,253,0))', width: 36, height: 120, cursor: 'pointer', borderRadius: 8 }}>‹</button>
              {filteredProducts.slice(0, 10).map(product => (
                <ProductCard
                  key={product._id + '-min'}
                  product={product}
                  type="minimal"
                  size="md"
                  showVendor
                  showRating
                  onAddToCart={handleAddToCart}
                />
              ))}
              <button className="row-arrow" aria-label="Next" onClick={() => scrollByAmount(minimalRef.current, 1)} style={{ position: 'sticky', right: 0, marginLeft: 'auto', alignSelf: 'center', zIndex: 2, border: 'none', background: 'linear-gradient(270deg, rgba(253,253,253,0.95), rgba(253,253,253,0))', width: 36, height: 120, cursor: 'pointer', borderRadius: 8 }}>›</button>
            </div>
          </section>
        )}

        {/* Rich cards row with descriptions */}
        {filteredProducts.length > 0 && (
          <section className="best-sellers" style={{ contentVisibility: 'auto' }}>
            <div className="section-header">
              <h2>{rowTitles.picks}</h2>
              <Link to="/shop" className="view-all-link">View all</Link>
            </div>
            <div className="products-row-scroll row-scroller" id="row-rich" ref={richRef} style={{ position: 'relative', scrollSnapType: 'x mandatory', overflowX: 'auto' }} onKeyDown={(e) => { if (e.key === 'ArrowLeft') scrollByAmount(richRef.current, -1); if (e.key === 'ArrowRight') scrollByAmount(richRef.current, 1); }} tabIndex={0}>
                <button className="row-arrow" aria-label="Prev" onClick={() => scrollByAmount(richRef.current, -1)} style={{ position: 'sticky', left: 0, alignSelf: 'center', zIndex: 2, border: 'none', background: 'linear-gradient(90deg, rgba(253,253,253,0.95), rgba(253,253,253,0))', width: 36, height: 120, cursor: 'pointer', borderRadius: 8 }}>‹</button>
              {filteredProducts.slice(0, 10).map(product => (
                <ProductCard
                  key={product._id + '-rich'}
                  product={{ ...product, compareAt: Number(product.price) * 1.15 }}
                  type="rich"
                  size="md"
                  showVendor
                  showRating
                  onAddToCart={handleAddToCart}
                />
              ))}
              <button className="row-arrow" aria-label="Next" onClick={() => scrollByAmount(richRef.current, 1)} style={{ position: 'sticky', right: 0, marginLeft: 'auto', alignSelf: 'center', zIndex: 2, border: 'none', background: 'linear-gradient(270deg, rgba(253,253,253,0.95), rgba(253,253,253,0))', width: 36, height: 120, cursor: 'pointer', borderRadius: 8 }}>›</button>
            </div>
          </section>
        )}

        {/* Recently Viewed */}
  {recentlyViewed.length > 4 && (
          <section className="best-sellers">
            <div className="section-header">
              <h2>Recently Viewed</h2>
              <Link to="/shop" className="view-all-link">Continue Shopping</Link>
            </div>
            <div className="products-row-scroll row-scroller" style={{ position: 'relative', scrollSnapType: 'x mandatory', overflowX: 'auto' }} tabIndex={0}>
              {recentlyViewed.map(product => (
                <ProductCard
                  key={product._id + '-rv'}
                  product={product}
                  type="minimal"
                  size="md"
                  showRating
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </section>
        )}


        {/* 10 Demo Rows for Scroll Test */}
  {!isCypress && [...Array(4)].map((_, rowIdx) => (
          <section className="best-sellers" key={`demo-row-${rowIdx}`} style={{ contentVisibility: 'auto' }}>
            <div className="section-header">
              <h2>📝 Demo Row {rowIdx + 1}</h2>
            </div>
            <div className="products-row-scroll">
              {reviewDemoProducts.map(product => (
                <ProductCard
                  key={product._id + '-row' + rowIdx}
                  product={product}
                  type="standard"
                  size="md"
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </section>
        ))}

      </div>
      {/* Footer is provided by layout; avoid duplicate footer here */}

  {/* (footer trust strip removed) */}
    </div>
  );
}

export default HomePage;
