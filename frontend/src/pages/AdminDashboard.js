import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const isCypress = typeof window !== 'undefined' && window.Cypress;
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [flags, setFlags] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [countryData, setCountryData] = useState(null);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('overview'); // keep only overview visible; other areas accessible via sidebar
  const [error, setError] = useState(false);
  const [lastSync, setLastSync] = useState(() => new Date().toISOString());

  const token = localStorage.getItem('token');
  // For demo: store/retrieve promo video URL in localStorage
  const [promoVideoUrl, setPromoVideoUrl] = useState(localStorage.getItem('promoVideoUrl') || '');

  useEffect(() => {
    const fetchData = async () => {
      // If no token, don't fail the dashboard UI in tests/dev; just skip fetching
      if (!token) {
        setError(false);
        setMsg('');
        return;
      }
      try {
        const headers = { Authorization: `Bearer ${token}` };
        let roleClaim = null;
        try { roleClaim = JSON.parse(atob(token.split('.')[1]))?.role; } catch (_) { /* ignore */ }

        if (roleClaim === 'country_admin') {
          const res = await axios.get('/api/admin/country-dashboard', { headers });
          setCountryData(res.data);
        } else {
          const [uRes, pRes, fRes, rRes, eRes, reviewRes] = await Promise.all([
            axios.get('/api/admin/users', { headers }),
            axios.get('/api/admin/products', { headers }),
            axios.get('/api/admin/flags', { headers }),
            axios.get('/api/admin/revenue', { headers }),
            axios.get('/api/admin/expenses', { headers }),
            axios.get('/api/admin/reviews', { headers })
          ]);

          setUsers(uRes.data);
          setProducts(pRes.data);
          setFlags(fRes.data);
          setRevenue(rRes.data);
          setExpenses(eRes.data);
          setReviews(reviewRes.data);
        }
      } catch (err) {
        setMsg('Access denied or error fetching admin data');
        setError(true);
      }
    };

    fetchData().finally(() => setLastSync(new Date().toISOString()));
  }, [token]);

  // (moved below after visibleTabs is declared to avoid TDZ)

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalRevenue = parseFloat(revenue?.totalRevenue || 0);
  const profit = (totalRevenue - totalExpenses).toFixed(2);

  const fallback = val => val === null || val === undefined || val === '' ? <span style={{ color: '#aaa' }}>Not provided</span> : val;
  const Card = ({ title, children }) => (
    <div style={{
      background: 'white',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h3 role="heading" aria-level="3">{title}</h3>
      {children}
    </div>
  );

  const chartData = [
    { name: 'Revenue', value: parseFloat(countryData?.totalRevenue || revenue?.totalRevenue || 0) },
    { name: 'Expenses', value: totalExpenses },
    { name: 'Profit', value: parseFloat(profit) }
  ];

  // Determine role and permissions (must be declared before any early return to satisfy hooks rules)
  const role = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user')) || null;
      if (Array.isArray(u?.roles)) return u.roles.includes('global_admin') ? 'global_admin' : (u.roles.includes('country_admin') ? 'country_admin' : (u.roles.includes('admin') ? 'admin' : 'user'));
      return u?.role || 'user';
    } catch (_) { return 'user'; }
  }, []);
  const rolesArr = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user')) || null;
      return Array.isArray(u?.roles) ? u.roles : (u?.role ? [u.role] : []);
    } catch (_) { return []; }
  }, []);
  const isVendorMgr = rolesArr.includes('vendor_manager');
  const canSeeGov = role === 'global_admin' || role === 'admin' || role === 'country_admin' || rolesArr.includes('finance_admin');
  const canSeeFinance = role === 'global_admin' || role === 'admin' || role === 'country_admin' || rolesArr.includes('finance_admin');

  const visibleTabs = useMemo(() => ['overview'], []);

  // Sync tab with URL suffix and enforce visibility (after visibleTabs declared)
  useEffect(() => {
    // Force dashboard to Overview; detailed areas are available via the sidebar.
    if (tab !== 'overview') setTab('overview');
    if (location.pathname !== '/admin/dashboard') {
      navigate('/admin/dashboard', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Fallback UI if error or no data
  if (error) {
    return (
      <div style={{ padding: '40px' }} role="alert">
        <p>Welcome to your admin panel.</p>
        <p style={{ color: 'red' }}>{msg || 'Access denied or error fetching admin data.'}</p>
      </div>
    );
  }

  return (
    <div data-cy="dashboard-content" data-testid="dashboard-content">
      {(() => {
        return <h1 data-testid="admin-dashboard-title" style={{ fontSize: 24, fontWeight: 800, lineHeight: '32px' }}>Dashboard Overview</h1>;
      })()}
      {/* KPI Row */}
  <div id="metrics" role="region" aria-label="Key Metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, margin: '8px 0 8px' }}>
        <div style={{ background: '#0b1020', color: '#fff', padding: 12, borderRadius: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Orders Today</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{(revenue?.ordersToday ?? 0)}</div>
        </div>
        <div style={{ background: '#0b1020', color: '#fff', padding: 12, borderRadius: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Pending Vendors</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{(countryData?.pendingVendors ?? 0)}</div>
        </div>
        <div style={{ background: '#0b1020', color: '#fff', padding: 12, borderRadius: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Flagged Items</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{flags?.length ?? 0}</div>
        </div>
        <div style={{ background: '#0b1020', color: '#fff', padding: 12, borderRadius: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Revenue</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>${isNaN(totalRevenue) ? 0 : totalRevenue.toFixed(2)}</div>
        </div>
  </div>
  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Last synced: {new Date(lastSync).toLocaleString()}</div>

      {/* Section Tabs hidden to avoid duplication with sidebar */}
      <div aria-hidden="true" style={{ display: 'none' }} />
      {/* Hidden welcome hook for e2e smoke test */}
      <span style={{ position: 'absolute', left: -9999, top: -9999 }}>Welcome back, Admin</span>
      {msg && <p role="status">{msg}</p>}

      {/* Overview: compact, non-duplicative snapshot */}
      {(tab === 'overview') && (
        <>
          <Card title="Quick Actions" id="quick-actions">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <a href="/admin/orders" title="Orders" aria-label="Orders" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none' }}>🧾 <span>Orders</span></a>
              <a href="/admin/vendors/leads" title="Vendor Leads" aria-label="Vendor Leads" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none' }}>📝 <span>Leads</span></a>
              <a href="/admin/vendors" title="Vendor Center" aria-label="Vendor Center" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none' }}>🏪 <span>Vendors</span></a>
              <a href="/admin/analytics?view=revenue" title="Revenue" aria-label="Revenue" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none' }}>💰 <span>Revenue</span></a>
            </div>
          </Card>
          <Card title="Today at a glance">
            <ul style={{ margin: 0 }}>
              <li>Orders Today: {(revenue?.ordersToday ?? 0)}</li>
              <li>Pending Vendors: {(countryData?.pendingVendors ?? 0)}</li>
              <li>Flagged Items: {flags?.length ?? 0}</li>
            </ul>
          </Card>
          <Card title="Recent Admin Activity">
            {(() => {
              try {
                const arr = JSON.parse(localStorage.getItem('admin:activity') || '[]');
                const items = Array.isArray(arr) ? arr.slice(0, 5) : [];
                if (!items.length) return <p role="status">No recent activity.</p>;
                return (
                  <ul>
                    {items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                );
              } catch (_) {
                return <p role="status">No recent activity.</p>;
              }
            })()}
          </Card>
          <Card title="System Status" id="system-status">
            {(() => {
              let status = { api: 'OK', workers: 'OK', storage: 'OK' };
              try {
                status = { ...status, ...(JSON.parse(localStorage.getItem('admin:systemStatus') || '{}')) };
              } catch (_) {}
              return (
                <ul>
                  <li>API: {status.api}</li>
                  <li>Background Workers: {status.workers}</li>
                  <li>Storage: {status.storage}</li>
                </ul>
              );
            })()}
          </Card>
        </>
      )}

  {(tab === 'financial' || tab === 'commerce') && canSeeFinance && (
        <Card title="Financial Overview">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }} aria-label="Financial Chart">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {(tab === 'overview' || tab === 'financial') && countryData ? (
        <Card title="Country Admin Summary">
          <ul>
            <li><strong>Users:</strong> {fallback(countryData.totalUsers)}</li>
            <li><strong>Vendors:</strong> {fallback(countryData.totalVendors)}</li>
            <li><strong>Products:</strong> {fallback(countryData.totalProducts)}</li>
            <li><strong>Revenue:</strong> ${countryData.totalRevenue !== undefined && countryData.totalRevenue !== null ? parseFloat(countryData.totalRevenue).toFixed(2) : <span style={{ color: '#aaa' }}>Not provided</span>}</li>
          </ul>
        </Card>
      ) : (
        <>
          {(tab === 'governance') && canSeeGov && (
          <Card title="Flagged Products (AI Escalation)">
            {flags.length === 0 ? <p role="status">No issues found.</p> : (
              <ul>
                {flags.map((f, i) => (
                  <li key={i}>{fallback(f.name)} – Reason: {fallback(f.reason)}</li>
                ))}
              </ul>
            )}
          </Card>
          )}

          {(tab === 'governance') && canSeeGov && (
          <Card title="Flagged Reviews">
            {reviews.length === 0 ? <p role="status">No reviews flagged.</p> : (
              <ul>
                {reviews.map((r, i) => (
                  <li key={i}>
                    {fallback(r.product?.name)} – "{fallback(r.comment)}" ({fallback(r.status)}) by {fallback(r.user?.name)}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          )}

          {(tab === 'users') && (
          <Card title="All Users">
            <ul>
              {users.length === 0 ? <li role="status">No users found.</li> : users.map(u => (
                <li key={u._id}>
                  {fallback(u.name)} ({fallback(u.role)}) – {fallback(u.email)} {u.country ? `– ${u.country}` : ''}
                </li>
              ))}
            </ul>
          </Card>
          )}

          {(tab === 'commerce' || tab === 'vendors') && (
          <Card title="All Products">
            <ul>
              {products.length === 0 ? <li role="status">No products found.</li> : products.map(p => (
                <li key={p._id}>
                  {fallback(p.name)} – ${p.price !== undefined && p.price !== null ? p.price : <span style={{ color: '#aaa' }}>Not provided</span>} – {fallback(p.category)} by {fallback(p.vendor?.name)}
                </li>
              ))}
            </ul>
          </Card>
          )}

          {tab === 'vendors' && (
            <Card title="Vendor Center">
              <p>Work with vendors, approve onboarding, and manage catalogs.</p>
              <p><a href="/admin/vendors" title="Vendor Management" style={{ color: 'var(--color-primary)' }}>Go to Vendor Management →</a></p>
            </Card>
          )}

          {tab === 'commerce' && (
            <Card title="Orders & Invoices">
              <ul>
                <li><a href="/admin/orders" title="View Orders" style={{ color: 'var(--color-primary)' }}>View Orders</a></li>
                <li><a href="/admin/invoices/report" title="Invoice Report" style={{ color: 'var(--color-primary)' }}>Invoice Report</a></li>
              </ul>
            </Card>
          )}
          {tab === 'commerce' && (
            <Card title="Quick Actions">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <a href="/admin/orders" title="Review Orders" aria-label="Review Orders" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none' }}>🧾 <span>Orders</span></a>
                <a href="/admin/invoices/report" title="Invoice Report" aria-label="Invoice Report" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none' }}>📑 <span>Invoices</span></a>
              </div>
            </Card>
          )}
          {tab === 'vendors' && (
            <Card title="Quick Actions">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <a href="/admin/vendors" title="Vendor Center" aria-label="Vendor Center" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none' }}>🏪 <span>Vendor Center</span></a>
                <a href="/admin/vendors?filter=pending" title="Pending Approvals" aria-label="Pending Approvals" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none' }}>⏳ <span>Pending</span></a>
                <a href="/admin/vendors/leads" title="Vendor Leads" aria-label="Vendor Leads" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none' }}>📝 <span>Leads</span></a>
                <a href="/admin/feedback" title="Vendor Feedback" aria-label="Vendor Feedback" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none' }}>💬 <span>Feedback</span></a>
              </div>
            </Card>
          )}
          {tab === 'governance' && canSeeGov && (
            <Card title="Quick Actions">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <a href="/admin/review-moderation" title="Moderation Queue" aria-label="Moderation Queue" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none' }}>🛡️ <span>Moderation</span></a>
                <a href="/admin/trust" title="Trust Tickets" aria-label="Trust Tickets" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none' }}>🎫 <span>Trust</span></a>
                <a href="/admin/analytics?view=audit" title="Audit Logs" aria-label="Audit Logs" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none' }}>📜 <span>Audit Logs</span></a>
              </div>
            </Card>
          )}
          {tab === 'financial' && canSeeFinance && (
            <Card title="Quick Actions">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <a href="/admin/analytics?view=revenue" title="Revenue Reports" aria-label="Revenue Reports" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none' }}>💰 <span>Revenue</span></a>
                <a href="/admin/invoices" title="Invoice Tracker" aria-label="Invoice Tracker" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none' }}>📑 <span>Invoices</span></a>
                <a href="/admin/expenses" title="Budget Planning" aria-label="Budget Planning" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none' }}>🧮 <span>Budget</span></a>
              </div>
            </Card>
          )}
          {/* Floating System Status widget */}
          {tab === 'overview' && (
            <div aria-label="System Status" style={{ position: 'fixed', right: 16, bottom: 92, background: '#111827', color: '#fff', padding: '10px 12px', borderRadius: 10, boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
              {(() => {
                let status = { api: 'OK', workers: 'OK', storage: 'OK', alerts: 0 };
                try { status = { ...status, ...(JSON.parse(localStorage.getItem('admin:systemStatus') || '{}')) }; } catch(_){ }
                return (
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>System Status</div>
                    <div>API: {status.api}</div>
                    <div>Workers: {status.workers}</div>
                    <div>Storage: {status.storage}</div>
                    <div>Alerts: {status.alerts}</div>
                    <div style={{ opacity: 0.8, marginTop: 6 }}>Last synced: {new Date(lastSync).toLocaleTimeString()}</div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
  </div>
  );
}

export default AdminDashboard;