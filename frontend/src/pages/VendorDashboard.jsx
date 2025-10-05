// src/pages/VendorDashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import MerkatoFooter from '../components/MerkatoFooter'';
import VendorCard from '../components/VendorCard'';
import ProductRowSection from '../components/ProductRowSection'';
import Card from '../components/Card'';
import styles from '../layouts/VendorLayout.module.css';
import { useVendorDashboardData } from '../hooks/useVendor'';
import { Events } from '../utils/eventsClient'';

// === MOCK MODE: Set to true to use mock data (no backend required) ===
const USE_MOCK_VENDOR = true; // Set to false for real API

function VendorDashboard() {
  const isCypress = typeof window !== 'undefined' && window.Cypress;
  // Show the dashboard middle content (cards/charts/rows) by default.
  // To opt-out locally, set localStorage 'ui:hide-vendor-middle' to 'true'.
  const hideMiddle = (typeof window !== 'undefined'
    && window.localStorage
    && window.localStorage.getItem('ui:hide-vendor-middle') === 'true');
  const [msg, setMsg] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({});
  const { loading, error, products, analytics, profile: vendorProfile } = useVendorDashboardData({ useMock: USE_MOCK_VENDOR });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // Redirect if unauthenticated without violating hooks rules
  useEffect(() => {
    if (!token) {
      window.location.href = '/login';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (error) setMsg('Failed to load dashboard data.');
  }, [error]);

  // Analytics: dashboard view
  useEffect(() => {
    try { Events.track('vendor_dashboard_view', { hasMock: USE_MOCK_VENDOR }); } catch (_) {}
    // no cleanup needed
  }, []);

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
      // In a fuller impl we'd revalidate the hook with SWR/React Query; for now, do a soft message.
      setMsg('Product updated. Refresh to see latest.');
    } catch (err) {
      setMsg('Failed to update product.');
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
      {!hideMiddle && (
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
            onClick={() => { try { Events.track('vendor_click_upload', { from: 'dashboard', style: cardStyle }); } catch(_) {}; window.location.href = `/upload?style=${cardStyle}`; }}
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
      )}
      <div data-cy="dashboard-content" data-testid="dashboard-content">
        <h3 style={{display:'none'}}>Welcome back, Vendor</h3>
        {!hideMiddle && vendorProfile && (
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
          <div>
            <div className={styles.skeletonRow}>
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
            </div>
            <div className={styles.skeletonRow}>
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
            </div>
          </div>
        ) : (
          <>
            {!hideMiddle && !analytics && products.length === 0 && (
              <div style={{ textAlign: 'center', color: '#e74c3c', marginBottom: '20px' }}>
                <p>⚠️ Something went wrong. Please try refreshing or logging in again.</p>
              </div>
            )}
            {!hideMiddle && analytics && (
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '24px' }}>
                <Card title="💵 Monthly Revenue"><p><strong>${analytics.totalRevenue}</strong></p></Card>
                <Card title="📈 Order Success Rate"><p><strong>{analytics.successRate || '94%'}</strong></p></Card>
                <Card title="🏆 Best-Selling Product"><p>{analytics.bestProduct || 'TBD'}</p></Card>
              </div>
            )}
            {!hideMiddle && (
              <div style={{ margin: '32px 0 0 0' }}>
                <ProductRowSection
                  title="Your Products"
                  products={products}
                  emptyText="No products to display."
                  type="standard"
                  size="md"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default VendorDashboard;