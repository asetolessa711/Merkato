// src/components/ProductList.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';

function ProductList({ lang = 'en', currency = 'USD', rates = { USD: 1, ETB: 144, EUR: 0.91 } }) {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState(lang);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    fetchProducts();
    fetchFavorites();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchFavorites = async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/favorites', { headers });
      const favoriteIds = res.data.map((p) => p._id);
      setFavorites(favoriteIds);
    } catch (err) {
      console.error('Failed to load favorites');
    }
  };

  const getDisplayPrice = (product) => {
    const base = product.currency || 'USD';
    if (base === currency) return product.price;
    const usdValue = product.price / (rates[base] || 1);
    return usdValue * (rates[currency] || 1);
  };

  useEffect(() => {
    const applyFilters = () => {
      const filteredList = products.filter((item) =>
        (!search || item.name.toLowerCase().includes(search.toLowerCase())) &&
        (!category || item.category === category) &&
        (!language || item.language === language)
      );
      setFiltered(filteredList);
    };

    applyFilters();
  }, [products, search, category, language]);

  const categoryList = [...new Set(products.map((p) => p.category).filter(Boolean))];

  return (
    <div style={{ padding: '20px' }}>
      <h2>Explore Products</h2>

      {/* 🔍 Filters */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '8px' }}
        />

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categoryList.map((cat, i) => (
            <option key={i} value={cat}>{cat}</option>
          ))}
        </select>

        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="en">English</option>
          <option value="am">Amharic</option>
          <option value="or">Oromiffa</option>
          <option value="it">Italian</option>
        </select>
      </div>

      {/* 🛍️ Product Cards Grid */}
      {filtered.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <div className="products-grid">
          {filtered.map((product) => (
            <ProductCard
              key={product._id}
              product={{
                ...product,
                price: parseFloat(getDisplayPrice(product).toFixed(2)),
                isFavorite: favorites.includes(product._id)
              }}
              type={product.promotion?.isPromoted || product.discount > 0 ? 'deal' : 'standard'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductList;
