import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './FavoritesPage.css';

function FavoritesPage() {
  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const allProducts = await axios.get('/api/products');
        const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const favoriteProducts = allProducts.data.filter(product =>
          storedFavorites.includes(product._id)
        );
        setProducts(favoriteProducts);
        setFavorites(storedFavorites);
      } catch (err) {
        console.error('Error loading favorites:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  const handleFavoriteToggle = (productId) => {
    let updatedFavorites = [...favorites];
    if (favorites.includes(productId)) {
      updatedFavorites = updatedFavorites.filter(id => id !== productId);
    } else {
      updatedFavorites.push(productId);
    }
    setFavorites(updatedFavorites);
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    setProducts(prev =>
      prev.filter(product => updatedFavorites.includes(product._id))
    );
  };

  if (loading) {
    return (
      <div className="favorites-page">
        <div className="loading-spinner">
          <div className="spinner-circle"></div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="favorites-page">
        <div className="empty-favorites">
          <h2>No Favorites Yet</h2>
          <p>Start saving products to view them here.</p>
          <Link to="/shop" className="btn-primary">Explore Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <h1>Your Favorites</h1>
      <div className="favorites-grid">
        {products.map((product) => (
          <div key={product._id} className="favorite-card">
            <Link to={`/product/${product._id}`} className="favorite-link">
              {product.badge && (
                <div className={`badge badge-${product.badge.toLowerCase()}`}>
                  {product.badge}
                </div>
              )}
              <img src={product.image} alt={product.name} />
              <h3>{product.name}</h3>
              <p>${product.price.toFixed(2)}</p>
              <div className="rating-stars">
                {Array(5).fill().map((_, index) => (
                  <span key={`${product._id}-star-${index}`}>
                    {index < Math.round(product.rating || 0) ? '⭐' : '☆'}
                  </span>
                ))}
              </div>
              <button
                className="save-favorite-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFavoriteToggle(product._id);
                }}
              >
                {favorites.includes(product._id) ? 'Remove from Favorites' : 'Save to Favorites'}
              </button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FavoritesPage;
