import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import VendorCard from '../components/VendorCard'; // ✅ Integrated import
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
  const [vendors, setVendors] = useState([]);
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

    const fetchFavorites = () => {
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

    const fetchVendors = async () => {
      try {
        const res = await axios.get('/api/vendor/public');
        setVendors(res.data);
      } catch (err) {
        console.error('Failed to fetch vendors', err);
      }
    };

    fetchProducts();
    fetchFavorites();
    fetchRecent();
    fetchVendors();
  }, []);

  useEffect(() => {
    let result = products;

    if (filters.category) result = result.filter(p => p.category?.toLowerCase() === filters.category.toLowerCase());
    if (filters.gender) result = result.filter(p => p.gender?.toLowerCase() === filters.gender.toLowerCase());
    if (filters.ageGroup) result = result.filter(p => p.ageGroup === filters.ageGroup);
    if (filters.priceMin) result = result.filter(p => p.price >= parseFloat(filters.priceMin));
    if (filters.priceMax) result = result.filter(p => p.price <= parseFloat(filters.priceMax));
    if (filters.vendor) result = result.filter(p => p.vendor?.toLowerCase() === filters.vendor.toLowerCase());
    if (filters.ratingMin) result = result.filter(p => p.rating >= parseFloat(filters.ratingMin));
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(search));
    }
    if (filters.promotedOnly) result = result.filter(p => p.promotion?.isPromoted);

    if (filters.sortBy === 'priceAsc') result = [...result].sort((a, b) => a.price - b.price);
    if (filters.sortBy === 'priceDesc') result = [...result].sort((a, b) => b.price - a.price);
    if (filters.sortBy === 'promotedFirst') result = [...result].sort((a, b) => (b.promotion?.isPromoted === true) - (a.promotion?.isPromoted === true));

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

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

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

  // --- Pagination Enhancement ---
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className="shop-page">
      {/* Filters, Promoted, Product List, Pagination ... */}
      {/* ... (same as your existing JSX structure above) */}

      {/* Example Filter Section */}
      <div className="filters">
        {/* ...other filters... */}
        {/* Replace input with select for vendor */}
        <select name="vendor" value={filters.vendor} onChange={handleFilterChange}>
          <option value="">All Vendors</option>
          {vendors.map((v) => (
            <option key={v._id} value={v.name}>
              {v.name}
            </option>
          ))}
        </select>
        {/* ...other filters... */}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button
          className="pagination-btn"
          disabled={currentPage === 1}
          aria-label="Previous Page"
          onClick={() => {
            setCurrentPage(prev => prev - 1);
            scrollToTop();
          }}
        >
          ← Prev
        </button>

        {/* Page Numbers */}
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i + 1}
            className={`pagination-btn${currentPage === i + 1 ? ' active' : ''}`}
            aria-label={`Go to page ${i + 1}`}
            onClick={() => {
              setCurrentPage(i + 1);
              scrollToTop();
            }}
            disabled={currentPage === i + 1}
          >
            {i + 1}
          </button>
        ))}

        <span className="current-page">
          Page {currentPage} of {totalPages}
        </span>

        <button
          className="pagination-btn"
          disabled={currentPage === totalPages || totalPages === 0}
          aria-label="Next Page"
          onClick={() => {
            setCurrentPage(prev => prev + 1);
            scrollToTop();
          }}
        >
          Next →
        </button>
      </div>

      {/* Loading State */}
      {loading && <div className="loading">Loading...</div>}

      {/* No Results State */}
      {!loading && filtered.length === 0 && (
        <div className="no-results">No products found.</div>
      )}

      {/* Sidebar */}
      <div className="sidebar">
        <h3>You May Like</h3>
        <div className="recent-products">
          {recent.length > 0 ? recent.map(item => (
            <div key={item._id} className="recent-item">
              <Link to={`/product/${item._id}`}>
                <img src={item.image} alt={item.name} />
                <p>{item.name}</p>
              </Link>
            </div>
          )) : (
            <p>We'll recommend products soon!</p>
          )}
        </div>
      </div>

      {/* ✅ Shop by Vendor Section (moved from HomePage) */}
      <div className="shop-vendor">
        <h2>🛍️ Shop by Vendor</h2>
        <div className="products-grid">
          {vendors.length === 0 ? (
            <p>No vendors found.</p>
          ) : (
            vendors.map(vendor => (
              <VendorCard key={vendor._id} vendor={vendor} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ShopPage;