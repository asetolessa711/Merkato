import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/routes';
import axios from 'axios';
import './HomePage.css';
import ProductCard from '../components/ProductCard'; // ✅ Already imported
import HeroBar from '../components/HeroBar/HeroBar.jsx';
import '../components/HeroBar/HeroBar.css';

const categories = [
  "Today's Deals", "Flash Deals", "Trending", "Season's Favorites", "Top Vendors",
  "Fashion", "Beauty", "Electronics", "Home & Living", "Toys & Games",
  "Sports", "Gadgets", "Accessories", "More"
];


function HomePage() {
  const navigate = useNavigate();
  const isCypress = typeof window !== 'undefined' && window.Cypress;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory] = useState(categories[0]);
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

  // Hero CTA handlers
  const goShop = () => navigate(ROUTES.shop);
  const goCategories = () => navigate(`${ROUTES.shop}?view=categories`);

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

  const filteredProducts = products
    .filter(p => selectedCategory === "Today's Deals" || p.category === selectedCategory)
    .slice(0, 10);

  const flashDeals = products
    .filter(p => p.promotion?.isPromoted || p.discount > 0)
    .slice(0, 6);

  // (search handler removed; route-level search box handles navigation)

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
        height={294}
        slides={[
          {
            id: 'kitchen',
            title: 'Shop Local. Save Big.',
            subtitle: 'Daily deals across top categories.',
            bg: 'var(--hero-amber)',
            image: '/images/hero-kitchen.jpg',
            imageAlt: 'Kitchen and dining deals',
            ctas: [
              { label: 'Shop Now', href: '/shop', variant: 'primary' },
              { label: 'Explore Categories', href: '/shop?view=categories', variant: 'ghost' }
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
              { label: 'Browse Tech', href: '/shop?category=Electronics', variant: 'primary' },
              { label: 'All Categories', href: '/shop?view=categories', variant: 'ghost' }
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
              { label: 'Shop Home & Living', href: '/shop?category=Home%20%26%20Living', variant: 'primary', ariaLabel: 'Browse Living' },
              { label: 'Popular Picks', href: '/shop?sort=popular', variant: 'ghost' }
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
              { label: 'Shop Beauty', href: '/shop?category=Beauty', variant: 'primary', ariaLabel: 'Browse Beauty' },
              { label: 'Best Sellers', href: '/shop?sort=top', variant: 'ghost' }
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
              { label: 'Shop Sports', href: '/shop?category=Sports', variant: 'primary', ariaLabel: 'Browse Sports' },
              { label: 'New Arrivals', href: '/shop?sort=new', variant: 'ghost' }
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
              { label: 'Shop Fashion', href: '/shop?category=Fashion', variant: 'primary', ariaLabel: 'Browse Fashion' },
              { label: 'Trending Now', href: '/shop?sort=trending', variant: 'ghost' }
            ],
          },
        ]}
      />
      {/* Promotional Video (if available) */}
      {promoVideoUrl && (
        <div style={{ margin: '2rem auto', maxWidth: 600 }}>
          <video controls width="100%" src={promoVideoUrl} />
        </div>
      )}
      {/* Main Content Scrollable (vertical) */}
      <div className="homepage-main-scrollable">
        {/* Flash Deals Row (Horizontal Scroll) */}
        {selectedCategory === "Flash Deals" && (
          <section className="flash-deals">
            <div className="section-header">
              <h2>🔥 Flash Deals</h2>
              <Link to={`${ROUTES.shop}?sort=deals`} className="view-all-link">View All</Link>
            </div>
            <div className="products-row-scroll">
              {flashDeals.length > 0 ? (
                flashDeals.map(product => (
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
            </div>
          </section>
        )}
        {/* General Category Products Row (Horizontal Scroll) */}
        {selectedCategory !== "Flash Deals" && (loading || filteredProducts.length > 0) && (
          <section className="best-sellers">
            <div className="section-header">
              <h2>Featured Products</h2>
            </div>
            <div className="products-row-scroll">
              {loading && (
                <p style={{ padding: '8px 0', color: '#666' }}>Loading featured products…</p>
              )}
              {!loading && filteredProducts.map(product => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    type="standard"
                    size="md"
                    colorOptions={product.colors || []}
                    onAddToCart={handleAddToCart}
                  />
                ))}
            </div>
          </section>
        )}


        {/* 10 Demo Rows for Scroll Test */}
        {!isCypress && [...Array(10)].map((_, rowIdx) => (
          <section className="best-sellers" key={`demo-row-${rowIdx}`}>
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
    </div>
  );
}

export default HomePage;
