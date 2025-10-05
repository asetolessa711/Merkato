// AdminAnalytics.js – Analytics + charts
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

function AdminAnalytics() {
  const [stats, setStats] = useState({ users: 0, vendors: 0, products: 0, orders: 0, revenue: 0, averageRating: 0 });
  const [dailyRevenue, setDailyRevenue] = useState([]);
  const [labels, setLabels] = useState([]);
  const [timeframe, setTimeframe] = useState('30');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const [usersRes, productsRes, ordersRes, reviewsRes] = await Promise.all([
          axios.get('/api/admin/users', config),
          axios.get('/api/products', config),
          axios.get('/api/orders', config),
          axios.get('/api/reviews', config)
        ]);

        const users = usersRes.data;
        const products = productsRes.data;
        const orders = ordersRes.data;
        const reviews = reviewsRes.data;

        const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
        const totalRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = reviews.length ? (totalRatings / reviews.length).toFixed(2) : 0;

        const customerCount = users.filter(u => u.role === 'customer').length;
        const vendorCount = users.filter(u => u.role === 'vendor').length;

        setStats({
          users: customerCount,
          vendors: vendorCount,
          products: products.length,
          orders: orders.length,
          revenue: totalRevenue,
          averageRating: avgRating
        });

        const days = parseInt(timeframe);
        const today = new Date();
        const labelsArray = [...Array(days)].map((_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - (days - 1 - i));
          return d.toISOString().split('T')[0];
        });

        const revenueMap = Object.fromEntries(labelsArray.map(label => [label, 0]));

        orders.forEach(o => {
          const date = new Date(o.createdAt).toISOString().split('T')[0];
          if (revenueMap[date]) revenueMap[date] += o.total;
        });

        setLabels(labelsArray);
        setDailyRevenue(labelsArray.map(d => revenueMap[d]));
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      }
    };
    fetchData();
  }, [timeframe]);

  return (
    <div style={{ padding: 30, fontFamily: 'Poppins, sans-serif' }}>
      <h2 style={{ marginBottom: 20 }}>Admin Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        <Card title="Total Customers" value={stats.users} />
        <Card title="Total Vendors" value={stats.vendors} />
        <Card title="Total Products" value={stats.products} />
        <Card title="Total Orders" value={stats.orders} />
        <Card title="Total Revenue" value={`$${stats.revenue.toFixed(2)}`} />
        <Card title="Avg Rating" value={`${stats.averageRating} / 5`} />
      </div>

      <div style={{ marginTop: 50 }}>
        <h3>Revenue Over Time</h3>
        <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} style={{ marginBottom: 20, padding: 6 }}>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>

        <Line
          data={{
            labels,
            datasets: [
              {
                label: 'Revenue ($)',
                data: dailyRevenue,
                fill: false,
                borderColor: '#00B894',
                tension: 0.3
              }
            ]
          }}
          options={{ responsive: true, plugins: { legend: { display: true } } }}
        />
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
      <h4 style={{ marginBottom: 10, fontWeight: 500 }}>{title}</h4>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00B894' }}>{value}</div>
    </div>
  );
}

export default AdminAnalytics;