import React, { useEffect, useState } from 'react';
import AdminVideoUpload from '../components/AdminVideoUpload';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [flags, setFlags] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [countryData, setCountryData] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);

  const token = localStorage.getItem('token');
  // For demo: store/retrieve promo video URL in localStorage
  const [promoVideoUrl, setPromoVideoUrl] = useState(localStorage.getItem('promoVideoUrl') || '');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const role = JSON.parse(atob(token.split('.')[1])).role;

        if (role === 'country_admin') {
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

    fetchData();
  }, [token]);

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalRevenue = parseFloat(revenue?.totalRevenue || 0);
  const profit = (totalRevenue - totalExpenses).toFixed(2);

  const Card = ({ title, children }) => (
    <div style={{
      background: 'white',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h3>{title}</h3>
      {children}
    </div>
  );

  const chartData = [
    { name: 'Revenue', value: parseFloat(countryData?.totalRevenue || revenue?.totalRevenue || 0) },
    { name: 'Expenses', value: totalExpenses },
    { name: 'Profit', value: parseFloat(profit) }
  ];

  // Fallback UI if error or no data
  if (error) {
    return (
      <div style={{ padding: '40px' }}>
        <p>Welcome to your admin panel.</p>
        <p style={{ color: 'red' }}>{msg}</p>
      </div>
    );
  }

  return (
    <>
      {msg && <p>{msg}</p>}

      {/* Admin Video Upload Section */}
      <AdminVideoUpload
        adminToken={token}
        onUpload={url => {
          setPromoVideoUrl(url);
          localStorage.setItem('promoVideoUrl', url);
        }}
      />
      {promoVideoUrl && (
        <div style={{ margin: '1rem 0' }}>
          <h4>Current Promotional Video</h4>
          <video controls width="400" src={promoVideoUrl} />
        </div>
      )}

      <Card title="Financial Overview">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {countryData ? (
        <Card title="Country Admin Summary">
          <ul>
            <li><strong>Users:</strong> {countryData.totalUsers}</li>
            <li><strong>Vendors:</strong> {countryData.totalVendors}</li>
            <li><strong>Products:</strong> {countryData.totalProducts}</li>
            <li><strong>Revenue:</strong> ${parseFloat(countryData.totalRevenue).toFixed(2)}</li>
          </ul>
        </Card>
      ) : (
        <>
          <Card title="Flagged Products (AI Escalation)">
            {flags.length === 0 ? <p>No issues found.</p> : (
              <ul>
                {flags.map((f, i) => (
                  <li key={i}>{f.name} – Reason: {f.reason}</li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Flagged Reviews">
            {reviews.length === 0 ? <p>No reviews flagged.</p> : (
              <ul>
                {reviews.map((r, i) => (
                  <li key={i}>
                    {r.product?.name || 'Product'} – "{r.comment}" ({r.status}) by {r.user?.name || 'User'}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="All Users">
            <ul>
              {users.map(u => (
                <li key={u._id}>
                  {u.name} ({u.role}) – {u.email} {u.country && `– ${u.country}`}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="All Products">
            <ul>
              {products.map(p => (
                <li key={p._id}>
                  {p.name} – ${p.price} – {p.category} by {p.vendor?.name || 'Vendor'}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}

export default AdminDashboard;