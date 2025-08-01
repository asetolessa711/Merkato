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
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);

  useEffect(() => {
    const loadProducts = async () => {
      const all = await axios.get('/api/products');
      setProducts(all.data);
    };
    loadProducts();
  }, []);

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

  return (
    <>
      {/* === Fixed Category Bar === */}
      <div className="category-bar-fixed">
        <div className="category-bar-outer">
          <button className="scroll-btn left" onClick={() => {
            document.querySelector('.category-bar').scrollBy({ left: -200, behavior: 'smooth' });
          }}>&lt;</button>
          <div className="category-bar" tabIndex={0}>
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-btn${selectedCategory === cat ? ' active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <button className="scroll-btn right" onClick={() => {
            document.querySelector('.category-bar').scrollBy({ left: 200, behavior: 'smooth' });
          }}>&gt;</button>
        </div>
      </div>

      <div className="home-page">

        {/* === Flash Deals Section (Modified) === */}
        {selectedCategory === "Flash Deals" && (
          <section className="flash-deals">
            <div className="section-header">
              <h2>🔥 Flash Deals</h2>
              <Link to="/shop?sort=deals" className="view-all-link">View All</Link>
            </div>
            <div className="products-grid">
              {flashDeals.length > 0 ? (
                flashDeals.map(product => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    type="deal"
                    size="md"
                    colorOptions={product.colors || []} // ✅ ADDED
                  />
                ))
              ) : (
                <p>No flash deals right now — check back later!</p>
              )}
            </div>
          </section>
        )}

        {/* === General Category Products (Modified) === */}
        {selectedCategory !== "Flash Deals" && (
          <div className="products-grid">
            {filteredProducts.map(product => (
              <ProductCard
                key={product._id}
                product={product}
                type="standard"
                size="md"
                colorOptions={product.colors || []} // ✅ ADDED
              />
            ))}
          </div>
        )}

        {/* === Static Sections (Unchanged) === */}
        {/* [snip: how-it-works, trust-signals, help-section, app-download, footer] */}

      </div>
    </>
  );
}

export default HomePage;
