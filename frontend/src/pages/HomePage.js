import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HomePage.css';
import ProductCard from '../components/ProductCard'; // ✅ Already imported

const categories = [
  "Today's Deals", "Flash Deals", "Trending", "Season's Favorites", "Top Vendors",
  "Fashion", "Beauty", "Electronics", "Home & Living", "Toys & Games",
  "Sports", "Gadgets", "Accessories", "More"
];


function HomePage() {
  const navigate = useNavigate();
  const isCypress = typeof window !== 'undefined' && window.Cypress;
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  // Get promo video URL from localStorage (set by admin upload)
  const [promoVideoUrl, setPromoVideoUrl] = useState(localStorage.getItem('promoVideoUrl') || '');

  useEffect(() => {
    const loadProducts = async () => {
      const all = await axios.get('/api/products');
      setProducts(all.data);
    };
    loadProducts();
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

  const filteredProducts = products
    .filter(p => selectedCategory === "Today's Deals" || p.category === selectedCategory)
    .slice(0, 10);

  const flashDeals = products
    .filter(p => p.promotion?.isPromoted || p.discount > 0)
    .slice(0, 6);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/shop?search=${encodeURIComponent(search.trim())}`);
    }
  };

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
              <Link to="/shop?sort=deals" className="view-all-link">View All</Link>
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
        {selectedCategory !== "Flash Deals" && filteredProducts.length > 0 && (
          <section className="best-sellers">
            <div className="section-header">
              <h2>Featured Products</h2>
            </div>
            <div className="products-row-scroll">
              {filteredProducts.map(product => (
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
