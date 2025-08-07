import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import MerkatoFooter from '../components/MerkatoFooter';
import { useMessage } from '../context/MessageContext';

function VendorAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('weekly');
  const [chartType, setChartType] = useState('bar');
  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const { showMessage } = useMessage();

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get('/api/orders/vendor/analytics', { headers });
        setAnalytics(res.data);
      } catch (err) {
        showMessage('Failed to load vendor analytics', 'error');
      }
    };
    fetchAnalytics();
  }, [showMessage]);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const res = await axios.get(`/api/orders/vendor/sales?range=${timeRange}`, { headers });
        setChartData(res.data);
      } catch (err) {
        showMessage('Failed to load chart data', 'error');
        setChartData([]);
      }
    };
    fetchChartData();
  }, [timeRange, showMessage]);

  useEffect(() => {
    const fetchTopMetrics = async () => {
      try {
        const [productsRes, customersRes] = await Promise.all([
          axios.get('/api/vendor/top-products', { headers }),
          axios.get('/api/vendor/top-customers', { headers })
        ]);
        setTopProducts(productsRes.data);
        setTopCustomers(customersRes.data);
      } catch (err) {
        showMessage('Failed to load top metrics', 'error');
      }
    };
    fetchTopMetrics();
  }, [showMessage]);

  const exportCSV = () => {
    if (!chartData.length) {
      showMessage('No chart data to export.', 'error');
      return;
    }
    const header = Object.keys(chartData[0]).join(',');
    const csvContent = [header, ...chartData.map(row => Object.values(row).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sales_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessage('CSV exported!', 'success');
  };

  return (
    <div style={{ 
      padding: '30px 20px', 
      maxWidth: 1000, 
      margin: '0 auto', 
      fontFamily: 'Poppins, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: '2rem', color: '#00B894', marginBottom: 30 }}>📊 Vendor Dashboard</h2>

        {/* msg removed, global message used instead */}

        {!analytics ? (
          <p>Loading your business insights...</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 20
          }}>
            <Card title="💰 Total Revenue" value={`$${analytics.totalRevenue}`} />
            <Card title="📦 Items Sold" value={analytics.totalItemsSold} />
            <Card title="📬 Orders" value={analytics.orderCount} />
            <Card title="👥 Unique Customers" value={analytics.uniqueCustomers} />
          </div>
        )}

        <div style={{
          background: '#fff',
          padding: 20,
          borderRadius: 10,
          marginTop: 30,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ color: '#27ae60' }}>📊 Sales Analytics</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #ccc'
              }}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
              <select value={chartType} onChange={(e) => setChartType(e.target.value)} style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #ccc'
              }}>
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
              </select>
              <button onClick={exportCSV} style={{ 
                padding: '6px 10px', 
                backgroundColor: '#00B894', 
                color: 'white', 
                border: 'none', 
                borderRadius: 6, 
                fontWeight: 'bold' 
              }}>
                📥 Export CSV
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'bar' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#00B894" name="Revenue ($)" />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line dataKey="revenue" stroke="#0984e3" strokeWidth={2} name="Revenue ($)" />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', marginTop: 30 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h4 style={{ color: '#2c3e50' }}>📦 Most Sold Products</h4>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {topProducts.map((p, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  {i + 1}. {p.name} – {p.quantity} sold
                </li>
              ))}
            </ul>
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h4 style={{ color: '#2c3e50' }}>👤 Top Customers</h4>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {topCustomers.map((c, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  {i + 1}. {c.name} ({c.email}) – ${c.total.toFixed(2)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <MerkatoFooter />
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={{
      background: '#fff',
      padding: 20,
      borderRadius: 10,
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      textAlign: 'center'
    }}>
      <h4 style={{ fontWeight: 'bold', color: '#2c3e50' }}>{title}</h4>
      <p style={{ fontSize: '1.8rem', color: '#0984e3', marginTop: 10 }}>{value}</p>
    </div>
  );
}

export default VendorAnalytics;