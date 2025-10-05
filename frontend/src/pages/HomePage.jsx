import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LinkBuilder } from '../config/routes'';
import axios from 'axios';
import './HomePage.css';
// Removed legacy ProductCard rows from HomePage
import HeroBar from '../components/HeroBar/HeroBar'';
import { resolveHeroSlides } from '../utils/heroBanners'';
import '../components/HeroBar/HeroBar.css';
import RailsZone from '../components/RailsZone'';
import ShelfMosaic from '../components/ShelfMosaic'';
import ShelfCarousel from '../components/ShelfCarousel'';
import PromoLinkCard from '../components/PromoLinkCard/PromoLinkCard'';

// Legacy categories removed with old product rows


function HomePage() {
  const navigate = useNavigate();
  const isCypress = typeof window !== 'undefined' && window.Cypress;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Get promo video URL from localStorage (set by admin upload)
  const promoVideoUrl = localStorage.getItem('promoVideoUrl') || '';

  useEffect(() => {
    let cancelled = false;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const fetchWithRetry = async (retries = 2, baseDelayMs = 800) => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const res = await axios.get('/api/products', { timeout: 8000 });
          return res.data;
        } catch (e) {
          // Only retry on network/timeout/5xx
          const status = e?.response?.status;
          const isRetryable = !status || (status >= 500 && status < 600);
          if (attempt < retries && isRetryable) {
            const backoff = baseDelayMs * Math.pow(2, attempt);
            // eslint-disable-next-line no-await-in-loop
            await sleep(backoff);
            continue;
          }
          throw e;
        }
      }
    };

    const loadProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchWithRetry();
        if (!cancelled) setProducts(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          console.error('Failed to load products:', e?.message || e);
          setError('We’re having trouble loading products right now. Please try again shortly.');
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hero CTA handlers (kept for reference if used by HeroBar callbacks)
  const goShop = () => navigate('/discover');
  const goCategories = () => navigate(LinkBuilder.toCategory('electronics', { sort: 'best' }) || '/discover');

  // Cart interactions are handled on product pages; no inline add-to-cart rows on Home

  // No legacy filtered rows on Home; data still used for the compact carousel below

  // (search handler removed; route-level search box handles navigation)

  // Legacy demo rows removed

  return (
    <main className="homepage-outer" role="main">
      {/* A11y: Provide an H1 for the page (visually hidden but accessible) */}
      <h1
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(1px,1px,1px,1px)',
          whiteSpace: 'nowrap'
        }}
      >
        Home
      </h1>
      {error && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            margin: '12px auto',
            maxWidth: 1200,
            background: '#FFF4E5',
            color: '#663C00',
            border: '1px solid #FFD8A8',
            borderRadius: 8,
            padding: '10px 14px'
          }}
          data-testid="products-error-banner"
        >
          {error}
        </div>
      )}
      {/* HeroBar: full-bleed, infinite, arrows, dots, swipe, auto-advance */}
      <HeroBar
        autoMs={6000}
        center
        showDots={false}
        slides={(function(){
          try {
            const fromAdmin = resolveHeroSlides({ currentPath: '/' });
            if (Array.isArray(fromAdmin) && fromAdmin.length) return fromAdmin;
          } catch (_) {}
          return [
          {
            id: 'kitchen',
            title: 'Shop Local. Save Big.',
            subtitle: 'Daily deals across top categories.',
            bg: 'var(--hero-amber)',
            image: '/images/hero-kitchen.jpg',
            imageAlt: 'Kitchen and dining deals',
            ctas: [
                { label: 'Shop Now', href: '/discover', variant: 'primary' },
                { label: 'Explore Categories', href: '/discover', variant: 'ghost' }
            ],
          },
          {
            id: 'tech',
            title: 'Upgrade Your Tech',
            subtitle: 'Phones, laptops, and gadgets at smart prices.',
            bg: 'linear-gradient(90deg, var(--hero-mint), #E0F2FE)',
            image: '/images/hero-tech.jpg',
            imageAlt: 'Electronics and gadgets',
            ctas: [
                { label: 'Browse Tech', href: LinkBuilder.toCategory('electronics', { sort: 'best' }), variant: 'primary' },
                { label: 'All Categories', href: '/discover', variant: 'ghost' }
            ],
          },
          {
            id: 'home',
            title: 'Make Home Cozy',
            subtitle: 'Furniture, decor, and essentials for every room.',
            bg: 'linear-gradient(90deg, var(--hero-sky), var(--hero-lilac))',
            image: '/images/hero-home.jpg',
            imageAlt: 'Home and living ideas',
            ctas: [
                { label: 'Shop Home & Living', href: LinkBuilder.toCategory('home', { sort: 'best' }), variant: 'primary', ariaLabel: 'Browse Living' },
                { label: 'Popular Picks', href: '/discover', variant: 'ghost' }
            ],
          },
          // New bright slides
          {
            id: 'beauty',
            title: 'Glow Everyday',
            subtitle: 'Top skincare and beauty picks under one roof.',
            bg: 'linear-gradient(90deg, var(--hero-rose), #FFE4E6)',
            image: '/images/hero-beauty.jpg',
            imageAlt: 'Skincare and beauty products',
            ctas: [
                { label: 'Shop Beauty', href: LinkBuilder.toCategory('beauty', { sort: 'best' }), variant: 'primary', ariaLabel: 'Browse Beauty' },
                { label: 'Best Sellers', href: '/discover', variant: 'ghost' }
            ],
          },
          {
            id: 'sports',
            title: 'Move In Style',
            subtitle: 'Activewear and gear for every workout.',
            bg: 'linear-gradient(90deg, var(--hero-mint), #D1FAE5)',
            image: '/images/hero-sport.jpg',
            imageAlt: 'Sportswear and gear',
            ctas: [
                { label: 'Shop Sports', href: LinkBuilder.toCategory('sports', { sort: 'best' }), variant: 'primary', ariaLabel: 'Browse Sports' },
                { label: 'New Arrivals', href: '/discover', variant: 'ghost' }
            ],
          },
          {
            id: 'fashion',
            title: 'Fresh Fits Daily',
            subtitle: 'Trendy looks and timeless essentials.',
            bg: 'linear-gradient(90deg, var(--hero-amber), #FEF3C7)',
            image: '/images/hero-fashion.jpg',
            imageAlt: 'Fashion outfits',
            ctas: [
                { label: 'Shop Fashion', href: LinkBuilder.toCategory('fashion', { sort: 'best' }), variant: 'primary', ariaLabel: 'Browse Fashion' },
                { label: 'Trending Now', href: '/discover', variant: 'ghost' }
            ],
          },
          ];
        })()}
      />
      {/* Amazon-like shelf band: 4 big modules per row (aligns with hero container) */}
      <div className="shelf-band-bleed">
  <section className="u-container home-row">
        <div className="shelf-grid">
          <ShelfMosaic
            inline
            compact
            title="Refresh your space"
            tiles={[
              { image: '/images/shelf/dining.jpg', title: 'Dining', href: LinkBuilder.toCategory('home', { sort: 'best' }) },
              { image: '/images/shelf/home.jpg', title: 'Living', href: LinkBuilder.toCategory('home', { sort: 'best' }) },
              { image: '/images/shelf/kitchen.jpg', title: 'Kitchen', href: LinkBuilder.toCategory('home', { sort: 'best' }) },
              { image: '/images/shelf/beauty.jpg', title: 'Health & Beauty', href: LinkBuilder.toCategory('beauty', { sort: 'best' }) },
            ]}
            link={{ label: 'See more', href: '/discover' }}
          />
          {/* Room for 3 more inline mosaics to emulate Amazon's 4-up band */}
          <ShelfMosaic inline compact title="Level up your PC" variant="3x3"
            tiles={[
              { image: '/images/shelf/laptops.jpg', title: 'Laptops', href: LinkBuilder.toCategory('electronics', { sort: 'best' }) },
              { image: '/images/shelf/desktops.jpg', title: 'PCs', href: LinkBuilder.toCategory('electronics', { sort: 'best' }) },
              { image: '/images/shelf/accessories.jpg', title: 'Accessories', href: LinkBuilder.toCategory('electronics', { sort: 'best' }) },
              { image: '/images/shelf/monitors.jpg', title: 'Monitors', href: LinkBuilder.toCategory('electronics', { sort: 'best' }) },
              { image: '/images/shelf/drives.jpg', title: 'Hard Drives', href: LinkBuilder.toCategory('electronics', { sort: 'best' }) },
              { image: '/images/shelf/headsets.jpg', title: 'Headsets', href: LinkBuilder.toCategory('electronics', { sort: 'best' }) },
            ]}
            link={{ label: 'See all tech', href: LinkBuilder.toCategory('electronics', { sort: 'best' }) }}
          />
          <ShelfMosaic inline compact title="Deals on top categories"
            tiles={[
              { image: '/images/shelf/books.jpg', title: 'Books', href: LinkBuilder.toCategory('entertainment', { sort: 'best' }) },
              { image: '/images/shelf/fashion.jpg', title: 'Fashion', href: LinkBuilder.toCategory('fashion', { sort: 'best' }) },
              { image: '/images/shelf/beauty.jpg', title: 'Beauty', href: LinkBuilder.toCategory('beauty', { sort: 'best' }) },
              { image: '/images/shelf/home.jpg', title: 'Home', href: LinkBuilder.toCategory('home', { sort: 'best' }) },
            ]}
            link={{ label: 'See all deals', href: LinkBuilder.toDeal('under-25') }}
          />
          <ShelfMosaic inline compact title="Level up your beauty routine"
            tiles={[
              { image: '/images/shelf/makeup.jpg', title: 'Makeup', href: LinkBuilder.toCategory('beauty', { sort: 'best' }) },
              { image: '/images/shelf/brushes.jpg', title: 'Brushes', href: LinkBuilder.toCategory('beauty', { sort: 'best' }) },
              { image: '/images/shelf/sponges.jpg', title: 'Sponges', href: LinkBuilder.toCategory('beauty', { sort: 'best' }) },
              { image: '/images/shelf/mirrors.jpg', title: 'Mirrors', href: LinkBuilder.toCategory('beauty', { sort: 'best' }) },
            ]}
            link={{ label: 'Shop beauty', href: LinkBuilder.toCategory('beauty', { sort: 'best' }) }}
          />
        </div>
      </section>
      </div>

      {/* Link cards relocated to /discover to avoid duplication on Home */}

      {/* Slim carousel shelf for compact items (still aligned with container) */}
      <ShelfCarousel
        title="Books & accessories under $25"
        seeAllHref={LinkBuilder.toDeal('under-25')}
        items={(function(){
          // Map a subset of products into compact items; fallback demo if none
          const subset = (Array.isArray(products) ? products : []).slice(0, 12);
          const mapped = subset.map(p => ({
            id: p._id || p.id || p.sku || p.name,
            title: p.name,
            image: (Array.isArray(p.images) && p.images[0]) || p.image || '/images/default-product.png',
            href: LinkBuilder.toPdp(p._id || p.id || p.sku || p.name),
            price: p.price,
            currency: p.currency || 'USD',
          }));
          if (mapped.length) return mapped;
          return Array.from({ length: 9 }).map((_, i) => ({ id: `demo-${i}`, title: `Pocket Item ${i+1}`, image: '/images/default-product.svg', href: '#' }));
        })()}
      />

      {/* Third variant: duplicate Row 2 (slim carousel) with different title/data */}
      <ShelfCarousel
        title="Best Sellers in Books"
        seeAllHref={LinkBuilder.toCategory('books', { sort: 'best' })}
        items={(function(){
          const subset = (Array.isArray(products) ? products : []).slice(0, 12);
          const mapped = subset.map(p => ({
            id: p._id || p.id || p.sku || p.name,
            title: p.name,
            image: (Array.isArray(p.images) && p.images[0]) || p.image || '/images/default-product.png',
            href: LinkBuilder.toPdp(p._id || p.id || p.sku || p.name),
            price: p.price,
            currency: p.currency || 'USD',
          }));
          if (mapped.length) return mapped;
          return Array.from({ length: 9 }).map((_, i) => ({ id: `best-${i}`, title: `Best seller ${i+1}`, image: '/images/default-product.svg', href: '#' }));
        })()}
      />

      {/* Embedded full-featured HeroBar (replacing former MiniHeroBar position) */}
      <HeroBar
        embedded
        autoMs={6000}
        center
        showDots={true}
        height={280}
        slides={(function(){
          try {
            const fromAdmin = resolveHeroSlides({ currentPath: '/' });
            if (Array.isArray(fromAdmin) && fromAdmin.length) return fromAdmin;
          } catch (_) {}
          return [
            {
              id: 'kitchen-mini',
              title: 'Shop Local. Save Big.',
              subtitle: 'Daily deals across top categories.',
              bg: 'var(--hero-amber)',
              image: '/images/hero-kitchen.jpg',
              imageAlt: 'Kitchen and dining deals',
              ctas: [
                  { label: 'Shop Now', href: '/discover', variant: 'primary' },
                  { label: 'Explore Categories', href: '/discover', variant: 'ghost' }
              ],
            },
            {
              id: 'tech-mini',
              title: 'Upgrade Your Tech',
              subtitle: 'Phones, laptops, and gadgets at smart prices.',
              bg: 'linear-gradient(90deg, var(--hero-mint), #E0F2FE)',
              image: '/images/hero-tech.jpg',
              imageAlt: 'Electronics and gadgets',
              ctas: [
                  { label: 'Browse Tech', href: LinkBuilder.toCategory('electronics', { sort: 'best' }), variant: 'primary' },
                  { label: 'All Categories', href: '/discover', variant: 'ghost' }
              ],
            },
            {
              id: 'home-mini',
              title: 'Make Home Cozy',
              subtitle: 'Furniture, decor, and essentials for every room.',
              bg: 'linear-gradient(90deg, var(--hero-sky), var(--hero-lilac))',
              image: '/images/hero-home.jpg',
              imageAlt: 'Home and living ideas',
              ctas: [
                  { label: 'Shop Home & Living', href: LinkBuilder.toCategory('home', { sort: 'best' }), variant: 'primary', ariaLabel: 'Browse Living' },
                  { label: 'Popular Picks', href: '/discover', variant: 'ghost' }
              ],
            },
          ];
        })()}
      />


      {/* 4th row: duplicate of first carousel (same config/data) */}
      <ShelfCarousel
        title="Books & accessories under $25"
        seeAllHref={LinkBuilder.toDeal('under-25')}
        items={(function(){
          // Reuse the same mapping logic as Row 2 for visual parity
          const subset = (Array.isArray(products) ? products : []).slice(0, 12);
          const mapped = subset.map(p => ({
            id: p._id || p.id || p.sku || p.name,
            title: p.name,
            image: (Array.isArray(p.images) && p.images[0]) || p.image || '/images/default-product.png',
            href: LinkBuilder.toPdp(p._id || p.id || p.sku || p.name),
            price: p.price,
            currency: p.currency || 'USD',
          }));
          if (mapped.length) return mapped;
          return Array.from({ length: 9 }).map((_, i) => ({ id: `dup-${i}`, title: `Pocket Item ${i+1}`, image: '/images/default-product.svg', href: '#' }));
        })()}
      />

      {/* Removed the previous 'New arrivals under $50' mosaic row as requested */}

      {/* Curated Rails Slot: below_hero */}
      <RailsZone page="home" slot="below_hero" productsBySku={(function(){
        // Build a quick lookup by SKU/id for rails rendering
        const map = {};
        products.forEach(p => {
          const sku = p.sku || p._id || p.id || p.name; if (sku) map[sku] = p; });
        return map;
      })()} />
      {/* Promotional Video (if available) */}
      {promoVideoUrl && (
        <div style={{ margin: '2rem auto', maxWidth: 600 }}>
          <video controls width="100%" src={promoVideoUrl} />
        </div>
      )}
      {/* Main content rows removed; Home now focuses on hero, mosaic shelves, and the slim carousel */}
      {/* Footer is provided by layout; avoid duplicate footer here */}
    </main>
  );
}

export default HomePage;
