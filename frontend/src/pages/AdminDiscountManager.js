import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [flags, setFlags] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [countryData, setCountryData] = useState(null);
  const [msg, setMsg] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const role = JSON.parse(atob(token.split('.')[1])).role;

        if (role === 'country_admin') {
          const res = await axios.get('/api/admin/country-dashboard', { headers });
          setCountryData(res.data);
        } else {
          const [uRes, pRes, fRes, rRes, eRes] = await Promise.all([
            axios.get('/api/admin/users', { headers }),
            axios.get('/api/admin/products', { headers }),
            axios.get('/api/admin/flags', { headers }),
            axios.get('/api/admin/revenue', { headers }),
            axios.get('/api/admin/expenses', { headers })
          ]);

          setUsers(uRes.data);
          setProducts(pRes.data);
          setFlags(fRes.data);
          setRevenue(rRes.data);
          setExpenses(eRes.data);
        }
      } catch (err) {
        setMsg('Access denied or error fetching admin data');
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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <a href="/admin/flags" style={{
          backgroundColor: '#e74c3c',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 'bold'
        }}>
          🚩 View Flagged Products
        </a>

        <a href="/admin/discount" style={{
          backgroundColor: '#3498db',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 'bold'
        }}>
          🎁 Manage Discounts
        </a>
      </div>

      {/* Quick Stats KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <Card title="👤 Total Users">
          <h2 className="text-center text-2xl font-bold">{users.length}</h2>
        </Card>

        <Card title="🛍️ Total Vendors">
          <h2 className="text-center text-2xl font-bold">{users.filter(u => u.role === 'vendor').length}</h2>
        </Card>

        <Card title="🚩 Pending Flags">
          <h2 className="text-center text-2xl font-bold">{flags.length}</h2>
        </Card>

        <Card title="💰 Total Revenue">
          <h2 className="text-center text-2xl font-bold">${totalRevenue.toFixed(2)}</h2>
        </Card>
      </div>

      {/* Financial Overview Chart */}
      <Card title="📊 Financial Overview">
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

      {msg && <p>{msg}</p>}

      {countryData ? (
        <>
          <Card title="Country Admin Summary">
            <ul>
              <li><strong>Users:</strong> {countryData.totalUsers}</li>
              <li><strong>Vendors:</strong> {countryData.totalVendors}</li>
              <li><strong>Products:</strong> {countryData.totalProducts}</li>
              <li><strong>Revenue:</strong> ${parseFloat(countryData.totalRevenue).toFixed(2)}</li>
            </ul>
          </Card>
        </>
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
    </div>
  );
}

export default AdminDashboard;
