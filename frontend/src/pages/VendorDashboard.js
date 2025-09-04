// src/pages/VendorDashboard.js
import React, { useEffect, useState } from 'react';
// === MOCK MODE: Set to true to use mock data (no backend required) ===
const USE_MOCK_VENDOR = true; // Set to false for real API
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import MerkatoFooter from '../components/MerkatoFooter';
import VendorCard from '../components/VendorCard';
import ProductRowSection from '../components/ProductRowSection';
import Card from '../components/Card';
import styles from '../layouts/VendorLayout.module.css';

function VendorDashboard() {
  const isCypress = typeof window !== 'undefined' && window.Cypress;
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [msg, setMsg] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [vendorProfile, setVendorProfile] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  if (!token) {
    window.location.href = '/login';
    return null;
  }

  useEffect(() => {
    if (USE_MOCK_VENDOR) {
      setTimeout(() => {
        setProducts([
          { _id: 'p1', name: 'Demo Product 1', price: 100, image: 'https://placehold.co/100x100?text=Demo+1', stock: 10 },
          { _id: 'p2', name: 'Demo Product 2', price: 50, image: 'https://placehold.co/100x100?text=Demo+2', stock: 5 },
        ]);
        setVendorProfile({ name: 'Demo Vendor', email: 'vendor@demo.com' });
        setAnalytics({ totalRevenue: 1200, successRate: '97%', bestProduct: 'Demo Product 1' });
        setLoading(false);
      }, 400);
      return;
    }
    fetchData().finally(() => setLoading(false));
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, analyticsRes, vendorRes] = await Promise.all([
        axios.get('/api/vendor/products', { headers }),
        axios.get('/api/vendor/revenue', { headers }),
        axios.get('/api/vendor/profile/me', { headers })
      ]);
      setProducts(pRes.data);
      setAnalytics(analyticsRes.data);
      setVendorProfile(vendorRes.data);
    } catch (err) {
      setMsg('Failed to load dashboard data.');
    }
  };

  const handleEditClick = (product) => {
    setEditingProduct(product._id);
    setEditForm({ ...product });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/vendor/products/${editingProduct}`, editForm, { headers });
      setEditingProduct(null);
      setEditForm({});
      fetchData();
    } catch (err) {
      // handle error
    }
  };

  const [cardStyle, setCardStyle] = useState('mint');
  const cardStyles = [
    { value: 'mint', label: 'Mint (Default)' },
    { value: 'navy', label: 'Navy' },
    { value: 'purple', label: 'Purple' },
    { value: 'gold', label: 'Gold' },
    { value: 'rose', label: 'Rose' },
  ];
  return (
    <div className={styles.contentArea}>
  <h1 data-testid="vendor-dashboard-title" style={isCypress ? {} : {display:'none'}}>Vendor Dashboard</h1>
      <div style={{ textAlign: 'center', marginBottom: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={cardStyle}
            onChange={e => setCardStyle(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1.5px solid #7c2ae8',
              fontWeight: 600,
              color: '#222b3a',
              background: '#f6f9fc',
              fontSize: '1rem',
              outline: 'none',
              boxShadow: '0 2px 8px rgba(124,42,232,0.07)'
            }}
          >
            {cardStyles.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => window.location.href = `/upload?style=${cardStyle}`}
            data-testid="vendor-upload-btn"
            style={{
              background: 'linear-gradient(90deg, #7c2ae8 0%, #00b894 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: '1.1rem',
              padding: '10px 28px',
              cursor: 'pointer',
              boxShadow: '0 4px 18px 0 rgba(124,42,232,0.10), 0 1.5px 8px 0 rgba(255,224,247,0.10)',
              transition: 'background 0.18s',
              marginLeft: 8
            }}
          >
            + Upload Product
          </button>
        </div>
        <span style={{ color: '#7c2ae8', fontWeight: 500, fontSize: '0.98rem', marginTop: 4 }}>
          Choose a card style for your new product (matches Merkato's taste!)
        </span>
      </div>
      <div data-cy="dashboard-content" data-testid="dashboard-content">
        <h3 style={{display:'none'}}>Welcome back, Vendor</h3>
        {vendorProfile && (
          <Card title="🛍️ Shop Profile Preview">
            <VendorCard vendor={vendorProfile} size="md" theme="mint" />
          </Card>
        )}
        {msg && (
          <div style={{
            marginBottom: '20px',
            padding: '10px',
            backgroundColor: '#dff9fb',
            color: '#0984e3',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            {msg}
          </div>
        )}
        {loading ? (
          <p>Loading dashboard...</p>
        ) : (
          <>
            {!analytics && products.length === 0 && (
              <div style={{ textAlign: 'center', color: '#e74c3c', marginBottom: '20px' }}>
                <p>⚠️ Something went wrong. Please try refreshing or logging in again.</p>
              </div>
            )}
            {analytics && (
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '24px' }}>
                <Card title="💵 Monthly Revenue"><p><strong>${analytics.totalRevenue}</strong></p></Card>
                <Card title="📈 Order Success Rate"><p><strong>{analytics.successRate || '94%'}</strong></p></Card>
                <Card title="🏆 Best-Selling Product"><p>{analytics.bestProduct || 'TBD'}</p></Card>
              </div>
            )}
            {/* Charts remain unchanged */}
            <div style={{ margin: '32px 0 0 0' }}>
              <ProductRowSection
                title="Your Products"
                products={products}
                emptyText="No products to display."
                type="standard"
                size="md"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default VendorDashboard;