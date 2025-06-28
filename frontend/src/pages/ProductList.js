import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function ProductList({ lang, currency, rates }) {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState(lang || 'en');

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchFavorites();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(res.data);
      setFiltered(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching products:', err);
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/favorites', { headers });
      const favoriteIds = res.data.map(p => p._id);
      setFavorites(favoriteIds);
    } catch (err) {
      console.error('Failed to load favorites');
    }
  };

  const toggleFavorite = async (productId) => {
    if (!token) return alert('Please log in to save products.');
    try {
      if (favorites.includes(productId)) {
        await axios.delete(`/api/favorites/${productId}`, { headers });
        setFavorites(favorites.filter(id => id !== productId));
      } else {
        await axios.post(`/api/favorites/${productId}`, {}, { headers });
        setFavorites([...favorites, productId]);
      }
    } catch (err) {
      console.error('Failed to toggle favorite');
    }
  };

  const fetchAverageRating = async (productId) => {
    try {
      const res = await axios.get(`/api/reviews/${productId}`);
      const ratings = res.data.map(r => r.rating);
      const average = ratings.reduce((sum, val) => sum + val, 0) / ratings.length;
      return {
        average: Number(average.toFixed(1)),
        count: ratings.length
      };
    } catch {
      return { average: 0, count: 0 };
    }
  };

  useEffect(() => {
    const loadRatings = async () => {
      const filteredList = products.filter((item) =>
        (!search || item.name.toLowerCase().includes(search.toLowerCase())) &&
        (!category || item.category === category) &&
        (!language || item.language === language)
      );

      const withRatings = await Promise.all(filteredList.map(async (item) => {
        const rating = await fetchAverageRating(item._id);
        return { ...item, rating };
      }));

      setFiltered(withRatings);
    };

    if (products.length > 0) loadRatings();
  }, [products, search, category, language]);

  const categoryList = [...new Set(products.map((p) => p.category).filter(Boolean))];

  const fallbackRates = { USD: 1, ETB: 144, EUR: 0.91 };

  const getDisplayPrice = (product) => {
    const productCurrency = product.currency || 'USD';
    if (productCurrency === currency) {
      return `${currency} ${product.price.toFixed(2)}`;
    }
    const baseToUSD = 1 / (rates[productCurrency] || 1);
    const converted = product.price * baseToUSD * (rates[currency] || 1);
    return `${currency} ${converted.toFixed(2)}`;
  };
  const handleSearch = (e) => {
    setSearch(e.target.value);
  };
  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
  };
  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };
  return (
    <div style={{ padding: 20 }}>
      <h2>Browse Products</h2>

      {/* Filter Controls */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={handleSearch}
          style={{ flex: 1, padding: 8 }}
        />

        <select value={category} onChange={handleCategoryChange}>
          <option value="">All Categories</option>
          {categoryList.map((cat, i) => (
            <option key={i} value={cat}>{cat}</option>
          ))}
        </select>

        <select value={language} onChange={handleLanguageChange}>
          <option value="en">English</option>
          <option value="am">Amharic</option>
          <option value="or">Oromiffa</option>
          <option value="it">Italian</option>
        </select>
      </div>

      {loading ? (
        <p>Loading products...</p>
      ) : filtered.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20
        }}>
          {filtered.map((item) => (
            <div key={item._id} style={{
              background: 'white',
              padding: 12,
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              position: 'relative'
            }}>
              <button
                onClick={() => toggleFavorite(item._id)}
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  color: favorites.includes(item._id) ? 'red' : '#ccc',
                  cursor: 'pointer'
                }}
                title={favorites.includes(item._id) ? 'Unsave' : 'Save'}
              >
                ♥
              </button>

              <Link to={`/product/${item._id}`}>
                <img
                  src={item.image}
                  alt={item.name}
                  style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 4 }}
                />
              </Link>

              <Link to={`/product/${item._id}`} style={{ textDecoration: 'none', color: '#000' }}>
                <h4 style={{ margin: '10px 0 5px' }}>{item.name}</h4>
              </Link>

              {item.rating && item.rating.count > 0 && (
                <p style={{ fontSize: '0.85em', color: '#ff9800' }}>
                  {'★'.repeat(Math.round(item.rating.average))} ({item.rating.count})
                </p>
              )}

              <p style={{ fontWeight: 'bold' }}>{getDisplayPrice(item)}</p>
              <p style={{ fontSize: '0.85em', color: '#666' }}>{item.category}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductList;
