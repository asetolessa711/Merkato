import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import MerkatoFooter from '../components/MerkatoFooter';

function VendorDashboard() {
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [msg, setMsg] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // ✅ Redirect if no token
  if (!token) {
    window.location.href = '/login';
    return null;
  }

  useEffect(() => {
    console.log('VendorDashboard mounted');
    fetchData().finally(() => setLoading(false));
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, analyticsRes] = await Promise.all([
        axios.get('/api/vendor/products', { headers }),
        axios.get('/api/vendor/revenue', { headers })
      ]);
      console.log('Products:', pRes.data);
      console.log('Analytics:', analyticsRes.data);
      setProducts(pRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err?.response?.data || err.message);
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
      alert('Update failed.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`/api/vendor/products/${id}`, { headers });
        fetchData();
      } catch (err) {
        alert('Delete failed.');
      }
    }
  };

  const Card = ({ title, children }) => (
    <div style={{
      background: 'white',
      padding: '16px',
      borderRadius: '10px',
      marginBottom: '24px',
      boxShadow: '0 1px 5px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ color: '#00B894', marginBottom: '12px' }}>{title}</h3>
      {children}
    </div>
  );

  return (
    <div style={{
      padding: '10px 20px',
      fontFamily: 'Poppins, sans-serif',
      color: '#333',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <h2 data-testid="vendor-dashboard-title">Vendor Dashboard</h2>
      </div>
      {/* Added dashboard-content for e2e testing */}
      <div data-cy="dashboard-content">
        <h1>Welcome back, Vendor</h1>
        {/* other content */}
        <div style={{ flex: 1 }}>
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
                  <Card title="💵 Monthly Revenue">
                    <p><strong>${analytics.totalRevenue}</strong></p>
                  </Card>
                  <Card title="📈 Order Success Rate">
                    <p><strong>{analytics.successRate || '94%'}</strong></p>
                  </Card>
                  <Card title="🏆 Best-Selling Product">
                    <p>{analytics.bestProduct || 'TBD'}</p>
                  </Card>
                </div>
              )}

              {products.length > 0 && (
                <>
                  <Card title="📦 Product Inventory (Stock)">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={products}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="stock" fill="#00B894" name="Stock" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="💵 Estimated Revenue per Product">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={products.map(p => ({
                        name: p.name,
                        revenue: p.price * p.stock
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="revenue" fill="#0984e3" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </>
              )}

              <Card title="🛍️ My Products">
                {products.length === 0 ? (
                  <p>No products uploaded yet.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {products.map((p) => (
                      <li key={p._id} style={{
                        marginBottom: '16px',
                        paddingBottom: '10px',
                        borderBottom: '1px solid #eee'
                      }}>
                        {editingProduct === p._id ? (
                          <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <input name="name" value={editForm.name} onChange={handleEditChange} required />
                            <input name="price" type="number" value={editForm.price} onChange={handleEditChange} required />
                            <input name="stock" type="number" value={editForm.stock} onChange={handleEditChange} required />
                            <select name="currency" value={editForm.currency} onChange={handleEditChange}>
                              <option value="USD">USD</option>
                              <option value="ETB">ETB</option>
                              <option value="EUR">EUR</option>
                            </select>
                            <div>
                              <button type="submit" style={{
                                backgroundColor: '#00B894',
                                color: 'white',
                                padding: '8px 14px',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold'
                              }}>Save</button>
                              <button type="button" onClick={() => setEditingProduct(null)} style={{
                                marginLeft: '10px',
                                backgroundColor: '#e74c3c',
                                color: 'white',
                                padding: '8px 14px',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold'
                              }}>Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <strong>{p.name}</strong> – {p.currency || 'USD'} {p.price} – Stock: {p.stock}
                            <div style={{ marginTop: '8px' }}>
                              <button onClick={() => handleEditClick(p)} style={{
                                backgroundColor: '#3498DB',
                                color: 'white',
                                padding: '6px 10px',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold'
                              }}>Edit</button>
                              <button onClick={() => handleDelete(p._id)} style={{
                                marginLeft: '8px',
                                backgroundColor: '#e74c3c',
                                color: 'white',
                                padding: '6px 10px',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold'
                              }}>Delete</button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
      <MerkatoFooter />
    </div>
  );
}

export default VendorDashboard;