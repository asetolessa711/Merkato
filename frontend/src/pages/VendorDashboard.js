// src/pages/VendorDashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from '../layouts/VendorLayout.module.css';
import './VendorDashboard.clean.css';

// === MOCK MODE: Set to true to use mock data (no backend required) ===
const USE_MOCK_VENDOR = true; // Set to false for real API

function VendorDashboard() {
  const isCypress = typeof window !== 'undefined' && window.Cypress;
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // Redirect unauthenticated users without breaking hook rules
  useEffect(() => {
    if (!token) {
      window.location.href = '/login';
    }
  }, [token]);

  useEffect(() => {
    if (!token) return; // skip data work until redirect or auth established
    if (USE_MOCK_VENDOR) {
      setTimeout(() => {
        setAnalytics({ totalRevenue: 1200, successRate: '97%', bestProduct: 'Demo Product 1' });
        setRecentOrders([
          { _id: 'o1', date: '2025-09-11', total: 89.5, status: 'shipped' },
          { _id: 'o2', date: '2025-09-10', total: 149.0, status: 'paid' },
          { _id: 'o3', date: '2025-09-10', total: 39.99, status: 'pending' },
        ]);
        setLoading(false);
      }, 300);
      return;
    }
    fetchData().finally(() => setLoading(false));
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, ordersRes] = await Promise.all([
        axios.get('/api/vendor/revenue', { headers }),
        axios.get('/api/vendor/orders?limit=5', { headers }),
      ]);
      setAnalytics(analyticsRes.data);
      setRecentOrders(Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.orders || []).slice(0, 5));
    } catch (err) {
      // Keep dashboard minimal even on failure
      setRecentOrders([]);
    }
  };

  // Minimal quick actions
  const goToUpload = () => (window.location.href = '/vendor/upload');
  const goToOrders = () => (window.location.href = '/vendor/orders');
  if (!token) {
    return null; // interim blank while redirecting
  }

  return (
    <div className={styles.contentArea}>
      <h1 className="vd-title" data-testid="vendor-dashboard-title">Vendor Dashboard</h1>
      <div className="vd-actions">
        <button className="vd-btn" onClick={goToUpload}>+ Add Product</button>
        <button className="vd-btn ghost" onClick={goToOrders}>View Orders</button>
      </div>
      {loading ? (
        <p className="vd-muted">Loading…</p>
      ) : (
        <div className="vd-grid">
          <section className="vd-card" aria-labelledby="kpi-title">
            <h2 id="kpi-title" className="vd-section">Key metrics</h2>
            <div className="vd-kpis">
              <div className="vd-kpi"><div className="vd-kpi-label">Monthly Revenue</div><div className="vd-kpi-value">${analytics?.totalRevenue ?? 0}</div></div>
              <div className="vd-kpi"><div className="vd-kpi-label">Order Success</div><div className="vd-kpi-value">{analytics?.successRate ?? '—'}</div></div>
              <div className="vd-kpi"><div className="vd-kpi-label">Top Product</div><div className="vd-kpi-value">{analytics?.bestProduct ?? '—'}</div></div>
            </div>
          </section>

          <section className="vd-card" aria-labelledby="recent-title">
            <h2 id="recent-title" className="vd-section">Recent orders</h2>
            {recentOrders.length === 0 ? (
              <p className="vd-muted">No recent orders.</p>
            ) : (
              <div className="vd-table-wrap">
                <table className="vd-table">
                  <thead>
                    <tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {recentOrders.slice(0,5).map(o => (
                      <tr key={o._id}><td>#{o._id?.slice(-6)}</td><td>{o.date?.slice(0,10)}</td><td>${Number(o.total||0).toFixed(2)}</td><td className={`status ${o.status}`}>{o.status}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default VendorDashboard;