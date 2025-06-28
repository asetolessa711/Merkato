
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [recent, setRecent] = useState([]);
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => {
    const loadRecommendations = async () => {
      const all = await axios.get('/api/products');
      setProducts(all.data);
      const stored = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      const viewed = all.data.filter(p => stored.includes(p._id));
      setRecent(viewed);
    };

    const fetchVendors = async () => {
      try {
        const res = await axios.get('/api/vendor/public');
        setVendors(res.data);
      } catch (err) {
        console.error('Failed to fetch vendors', err);
      }
    };

    loadRecommendations();
    fetchVendors();
  }, []);

  const handleCategoryClick = (category) => {
    navigate(`/shop?category=${encodeURIComponent(category)}`);
  };

  const flashDeals = products.filter(p => p.promotion?.isPromoted || p.discount > 0).slice(0, 4);
  const bestSellers = products.slice(0, 4);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="logo">
          <span style={{ color: '#00B894' }}>M</span>
          <span style={{ color: '#3498DB' }}>e</span>
          <span style={{ color: '#E67E22' }}>r</span>
          <span style={{ color: '#9B59B6' }}>k</span>
          <span style={{ color: '#E74C3C' }}>a</span>
          <span style={{ color: '#3498DB' }}>t</span>
          <span style={{ color: '#00B894' }}>o</span>
        </div>
        <h1>Shop Smart. Sell Bold.</h1>
        <p>Power your hustle with Merkato — your trusted online marketplace.</p>
        <div className="cta-row" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '30px' }}>
          <Link to="/shop" className="btn-primary">Explore Products</Link>
          <Link to="/register" className="btn-secondary">Register</Link>
          <button onClick={() => setCategoryOpen(!categoryOpen)} className="btn-secondary">
            {categoryOpen ? "Close Categories" : "Shop by Category"}
          </button>
        </div>
      </section>

      {/* Categories Dropdown */}
      {categoryOpen && (
        <section className="categories">
          <div className="category-list">
            {['Fashion', 'Tech', 'Home', 'Beauty', 'Sports', 'Kids'].map(category => (
              <div
                key={category}
                className="category-item"
                onClick={() => handleCategoryClick(category)}
                style={{ cursor: 'pointer' }}
              >
                {category}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Flash Deals Section */}
      <section className="flash-deals">
        <h2>🔥 Flash Deals</h2>
        <div className="products-grid">
          {flashDeals.length > 0 ? flashDeals.map(product => (
            <div key={product._id} className="product-card">
              <img src={product.image} alt={product.name} />
              <h4>{product.name}</h4>
              <p className="price-red">${product.price.toFixed(2)}</p>
              <Link to={`/product/${product._id}`} className="btn-small">Shop Now</Link>
            </div>
          )) : <p>No flash deals right now — check back later!</p>}
        </div>
      </section>

      {/* Best Sellers */}
      <section className="best-sellers">
        <h2>🏆 Best Sellers</h2>
        <div className="products-grid">
          {bestSellers.map(product => (
            <div key={product._id} className="product-card">
              <img src={product.image} alt={product.name} />
              <h4>{product.name}</h4>
              <p className="price-green">${product.price.toFixed(2)}</p>
              <Link to={`/product/${product._id}`} className="btn-small">Shop Now</Link>
            </div>
          ))}
        </div>
      </section>

      {/* Shop by Vendor */}
      <section className="shop-vendor">
        <h2>🛍️ Shop by Vendor</h2>
        <div className="products-grid">
          {vendors.length === 0 ? <p>No vendors found.</p> : (
            vendors.map(vendor => (
              <div key={vendor._id} className="vendor-card">
                <h4>{vendor.name}</h4>
                <p>{vendor.email}</p>
                <Link to={`/vendor/${vendor._id}`} className="btn-secondary">Visit Store</Link>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Help Section */}
      <section className="help-section">
        <h3>Need Help?</h3>
        <p>Contact our 24/7 support team for assistance.</p>
        <button onClick={() => navigate('/support')} className="btn-primary">Contact Support</button>
      </section>

      {/* App Download Section */}
      <section className="app-download">
        <h3>Download the Merkato App</h3>
        <p>Shop smarter with our mobile app. Available on iOS and Android.</p>
        <button className="btn-secondary">Download Now</button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© {new Date().getFullYear()} Merkato. All rights reserved.</p>
        <div className="footer-links">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/faq">FAQ</Link>
        </div>
        <div className="footer-social">
          <a href="https://facebook.com">Facebook</a>
          <a href="https://twitter.com">Twitter</a>
          <a href="https://instagram.com">Instagram</a>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
