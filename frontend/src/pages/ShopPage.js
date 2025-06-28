import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import './ShopPage.css';

function ShopPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialCategory = params.get('category') || '';
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [recent, setRecent] = useState([]);
  const [filters, setFilters] = useState({
    category: initialCategory,
    gender: '',
    ageGroup: '',
    priceMin: '',
    priceMax: '',
    vendor: '',
    ratingMin: '',
    search: '',
    sortBy: '',
    promotedOnly: false
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState('');

  const currency = 'USD';
  const rates = { USD: 1, ETB: 56.5, EUR: 0.91 };

  const getDisplayPrice = (p) => {
    const productCurrency = p.currency || 'USD';
    if (productCurrency === currency) return `${currency} ${p.price.toFixed(2)}`;
    const baseToUSD = 1 / (rates[productCurrency] || 1);
    const converted = p.price * baseToUSD * (rates[currency] || 1);
    return `${currency} ${converted.toFixed(2)}`;
  };

  const handleAddToCart = (product) => {
  const savedCart = JSON.parse(localStorage.getItem('merkato-cart') || '{}');
  const currentItems = Array.isArray(savedCart.items) ? savedCart.items : [];

  const productId = typeof product._id === 'object' ? product._id.toString() : product._id;
  const existingIndex = currentItems.findIndex(item => item._id === productId);

  if (existingIndex !== -1) {
    currentItems[existingIndex].quantity += 1;
  } else {
    currentItems.push({ ...product, _id: productId, quantity: 1 });
  }

  localStorage.setItem('merkato-cart', JSON.stringify({
    items: currentItems,
    timestamp: Date.now()
  }));

  alert('✅ Added to cart!');
};


  // ...rest of your logic (useEffects, handlers) remains unchanged...

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/products');
        setProducts(res.data);
        setFiltered(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const fetchFavorites = async () => {
      const stored = JSON.parse(localStorage.getItem('favorites') || '[]');
      setFavorites(stored);
    };

    const fetchRecent = async () => {
      try {
        const res = await axios.get('/api/recent');
        setRecent(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchProducts();
    fetchFavorites();
    fetchRecent();
  }, []);
  useEffect(() => {
    let result = products;

    if (filters.category) {
      result = result.filter(p => p.category?.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.gender) {
      result = result.filter(p => p.gender?.toLowerCase() === filters.gender.toLowerCase());
    }
    if (filters.ageGroup) {
      result = result.filter(p => p.ageGroup === filters.ageGroup);
    }
    if (filters.priceMin) {
      result = result.filter(p => p.price >= parseFloat(filters.priceMin));
    }
    if (filters.priceMax) {
      result = result.filter(p => p.price <= parseFloat(filters.priceMax));
    }
    if (filters.vendor) {
      result = result.filter(p => p.vendor?.toLowerCase() === filters.vendor.toLowerCase());
    }
    if (filters.ratingMin) {
      result = result.filter(p => p.rating >= parseFloat(filters.ratingMin));
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(search));
    }
    if (filters.promotedOnly) {
      result = result.filter(p => p.promotion?.isPromoted);
    }

    if (filters.sortBy === 'priceAsc') {
      result = [...result].sort((a, b) => a.price - b.price);
    }
    if (filters.sortBy === 'priceDesc') {
      result = [...result].sort((a, b) => b.price - a.price);
    }
    if (filters.sortBy === 'promotedFirst') {
      result = [...result].sort((a, b) => (b.promotion?.isPromoted === true) - (a.promotion?.isPromoted === true));
    }

    setFiltered(result);
  }, [products, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
    scrollToTop();
  };

  const handleClearFilters = () => {
    setFilters({
      category: '',
      gender: '',
      ageGroup: '',
      priceMin: '',
      priceMax: '',
      vendor: '',
      ratingMin: '',
      search: '',
      sortBy: '',
      promotedOnly: false
    });
    setCurrentPage(1);
    scrollToTop();
  };

  const handleCategorySelect = (category) => {
    setFilters(prev => ({ ...prev, category }));
    setCurrentPage(1);
    scrollToTop();
  };

  const handleResetCategory = () => {
    setFilters(prev => ({ ...prev, category: '' }));
    setHoveredCategory('');
    setCurrentPage(1);
    scrollToTop();
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleFavoriteToggle = (productId) => {
    let updatedFavorites = [...favorites];
    if (favorites.includes(productId)) {
      updatedFavorites = updatedFavorites.filter(id => id !== productId);
    } else {
      updatedFavorites.push(productId);
    }
    setFavorites(updatedFavorites);
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
  };

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const promoted = products.filter(p => p.promotion?.isPromoted);

  return (
    <div className="shop-page">

      {/* Smart Filters Panel */}
      <div className="filters-panel">
        <button className="filters-toggle" onClick={() => setFiltersOpen(!filtersOpen)}>
          {filtersOpen ? "Hide Smart Filters ▲" : "Show Smart Filters ▼"}
        </button>

        {filtersOpen && (
          <div className="filters">
            <h2>Smart Filters</h2>
            <input type="text" placeholder="Search products..." name="search" value={filters.search} onChange={handleFilterChange} />
            <select name="category" value={filters.category} onChange={handleFilterChange}>
              <option value="">All Categories</option>
              <option value="Clothing">Clothing</option>
              <option value="Accessories">Accessories</option>
              <option value="Toys">Toys</option>
              <option value="Books">Books</option>
            </select>
            <select name="gender" value={filters.gender} onChange={handleFilterChange}>
              <option value="">Any Gender</option>
              <option value="Boys">Boys</option>
              <option value="Girls">Girls</option>
              <option value="Unisex">Unisex</option>
            </select>
            <select name="ageGroup" value={filters.ageGroup} onChange={handleFilterChange}>
              <option value="">All Ages</option>
              <option value="0-2">0-2 years</option>
              <option value="3-5">3-5 years</option>
              <option value="6-8">6-8 years</option>
              <option value="9-12">9-12 years</option>
            </select>
            <input type="number" placeholder="Min Price" name="priceMin" value={filters.priceMin} onChange={handleFilterChange} />
            <input type="number" placeholder="Max Price" name="priceMax" value={filters.priceMax} onChange={handleFilterChange} />
            <input type="text" placeholder="Vendor" name="vendor" value={filters.vendor} onChange={handleFilterChange} />
            <input type="number" placeholder="Min Rating" name="ratingMin" value={filters.ratingMin} onChange={handleFilterChange} step="0.1" />
            <select name="sortBy" value={filters.sortBy} onChange={handleFilterChange}>
              <option value="">Sort By</option>
              <option value="priceAsc">Price: Low to High</option>
              <option value="priceDesc">Price: High to Low</option>
              <option value="promotedFirst">Promoted First</option>
            </select>
            <label>
              <input type="checkbox" checked={filters.promotedOnly} onChange={e => setFilters(prev => ({ ...prev, promotedOnly: e.target.checked }))} />
              Show only promoted
            </label>
            <button onClick={handleClearFilters}>Clear Filters</button>
          </div>
        )}
      </div>

      {/* Category Banners */}
      <div className="category-banners">
        <h2>Featured Categories</h2>
        <div className="banner-list">
          {['Clothing', 'Accessories', 'Toys', 'Books'].map(cat => (
            <div
              key={cat}
              className={`banner-item ${filters.category === cat ? 'active' : ''}`}
              onMouseEnter={() => setHoveredCategory(cat)}
              onMouseLeave={() => setHoveredCategory('')}
              onClick={() => handleCategorySelect(cat)}
            >
              <img src={`/images/${cat.toLowerCase()}.jpg`} alt={cat} />
              <span>{cat}</span>
            </div>
          ))}
          <div className={`banner-item ${filters.category === '' ? 'active' : ''}`} onClick={handleResetCategory}>
            <img src="/images/show-all.jpg" alt="Show All" />
            <span>Show All</span>
          </div>
        </div>
      </div>

      {/* Promoted Section */}
      {promoted.length > 0 && (
        <div className="promoted-section">
          <h2>🔥 Promoted Products</h2>
          <div className="products-grid">
            {promoted.map(product => (
              <div key={product._id} className="product-card">
                <Link to={`/product/${product._id}`} className="product-link">
                  {product.promotion?.badgeText && <div className="badge badge-promoted">{product.promotion.badgeText}</div>}
                  <img src={product.image} alt={product.name} />
                  <h3>{product.name}</h3>
                  <p>{getDisplayPrice(product)}</p>
                </Link>
                <div className="product-actions">
                  <button onClick={() => handleAddToCart(product)}>🛒 Add to Cart</button>
                  <button onClick={() => handleFavoriteToggle(product._id)}>
                    {favorites.includes(product._id) ? 'Saved' : 'Save to Favorites'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Preview */}
      <div className="hover-preview">
        <h2>{hoveredCategory ? `Explore ${hoveredCategory}` : 'New Arrivals'}</h2>
        <div className="products-grid">
          {paginated.map(product => (
            <div key={product._id} className="product-card">
              <Link to={`/product/${product._id}`} className="product-link">
                {product.promotion?.isPromoted && product.promotion.badgeText && (
                  <div className="badge badge-promoted">{product.promotion.badgeText}</div>
                )}
                <img src={product.image} alt={product.name} />
                <h3>{product.name}</h3>
                <p>{getDisplayPrice(product)}</p>
                <div className="rating-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={`${product._id}-star-${i}`}>
                      {i < Math.round(product.rating || 0) ? '⭐' : '☆'}
                    </span>
                  ))}
                </div>
              </Link>
              <div className="product-actions">
                <button onClick={() => handleAddToCart(product)}>🛒 Add to Cart</button>
                <button onClick={() => handleFavoriteToggle(product._id)}>
                  {favorites.includes(product._id) ? 'Saved' : 'Save to Favorites'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button disabled={currentPage === 1} onClick={() => { setCurrentPage(prev => prev - 1); scrollToTop(); }}>Previous</button>
        <span className="current-page">Page {currentPage}</span>
        <button disabled={currentPage * itemsPerPage >= filtered.length} onClick={() => { setCurrentPage(prev => prev + 1); scrollToTop(); }}>Next</button>
      </div>

      {/* Sidebar */}
      <div className="sidebar">
        <h3>You May Like</h3>
        <div className="recent-products">
          {recent.length > 0 ? (
            recent.map(item => (
              <div key={item._id} className="recent-item">
                <Link to={`/product/${item._id}`}>
                  <img src={item.image} alt={item.name} />
                  <p>{item.name}</p>
                </Link>
              </div>
            ))
          ) : (
            <p>We'll recommend products soon!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShopPage;