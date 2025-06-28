import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, LineChart, Line 
} from 'recharts';
import MerkatoFooter from '../components/MerkatoFooter';

function VendorOrders() {
  const [orders, setOrders] = useState([]);  
  const [msg, setMsg] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [stats, setStats] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const currentVendorId = JSON.parse(localStorage.getItem('user'))?._id;

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get('/api/orders/vendor/my', { headers });
        setOrders(res.data.orders || res.data);
        if (res.data.stats) setStats(res.data.stats);
      } catch (err) {
        setMsg('Failed to load your orders');
      }
    };
    fetchOrders();
  }, [token]);

  const markAsShipped = async (orderId) => {
    if (window.confirm('Mark this order as Shipped?')) {
      try {
        await axios.put(`/api/orders/${orderId}/mark-shipped`, {}, { headers });
        window.location.reload();
      } catch (err) {
        alert('Failed to update order status');
      }
    }
  };

  const exportCSV = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('start', startDate.toISOString());
    if (endDate) params.append('end', endDate.toISOString());
    window.open(`/api/orders/vendor/my?export=csv&${params.toString()}`, '_blank');
  };

  const buyers = [...new Set(orders.map(o => o.buyer?.name).filter(Boolean))];
  const allProducts = [...new Set(orders.flatMap(o => 
    o.products.map(p => p.product?.name).filter(Boolean)
  ))];

  const isInDateRange = (orderDate) => {
    if (!startDate && !endDate) return true;
    const date = new Date(orderDate);
    return (!startDate || date >= startDate) && (!endDate || date <= endDate);
  };

  const filteredOrders = orders.filter(order => {
    const buyerMatch = !buyerFilter || order.buyer?.name === buyerFilter;
    const productMatch = !productFilter || order.products.some(p => p.product?.name === productFilter);
    const dateMatch = isInDateRange(order.createdAt);
    return buyerMatch && productMatch && dateMatch;
  });

  const productCountMap = {};
  const salesTrendMap = {};

  filteredOrders.forEach(order => {
    const dateKey = new Date(order.createdAt).toLocaleDateString();
    salesTrendMap[dateKey] = (salesTrendMap[dateKey] || 0) + order.total;
    
    order.products.forEach(p => {
      const name = p.product?.name;
      const vendorId = p.product?.vendor?._id || p.product?.vendor;
      if (name && vendorId === currentVendorId) {
        productCountMap[name] = (productCountMap[name] || 0) + p.quantity;
      }
    });
  });

  const productChartData = Object.entries(productCountMap)
    .map(([name, qty]) => ({ name, qty }));
  const salesTrendData = Object.entries(salesTrendMap)
    .map(([date, value]) => ({ date, value }));

  const renderShipping = (address) => {
    if (!address) return 'N/A';
    return `${address.fullName}, ${address.street}, ${address.city}, ${address.country}`;
  };

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Poppins, sans-serif', 
      color: '#333',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '20px', color: '#00B894' }}>
          Orders for My Products
        </h1>
        
        {msg && <p style={{ color: '#e74c3c' }}>{msg}</p>}

        {stats && (
          <p><strong>📊 Total Orders from {stats.country}:</strong> {stats.totalOrders}</p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <label><strong>Start Date:</strong></label><br />
            <DatePicker 
              selected={startDate} 
              onChange={(date) => setStartDate(date)} 
              placeholderText="Start Date" 
            />
          </div>
          <div>
            <label><strong>End Date:</strong></label><br />
            <DatePicker 
              selected={endDate} 
              onChange={(date) => setEndDate(date)} 
              placeholderText="End Date" 
            />
          </div>
          <div>
            <label><strong>Filter by Customer:</strong></label><br />
            <select value={buyerFilter} onChange={e => setBuyerFilter(e.target.value)}>
              <option value="">All</option>
              {buyers.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label><strong>Filter by Product:</strong></label><br />
            <select value={productFilter} onChange={e => setProductFilter(e.target.value)}>
              <option value="">All</option>
              {allProducts.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={exportCSV}
              style={{
                marginTop: 22,
                backgroundColor: '#2ecc71',
                color: 'white',
                padding: '10px 16px',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              📤 Export CSV
            </button>
          </div>
        </div>

        {productChartData.length > 0 && (
          <div style={{ marginBottom: 30 }}>
            <h3>📦 Top Selling Products</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="qty" fill="#00B894" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {salesTrendData.length > 0 && (
          <div style={{ marginBottom: 30 }}>
            <h3>📈 Sales Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#0984e3" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {filteredOrders.length === 0 ? (
          <p style={{ fontSize: '1.1rem' }}>No orders found that include your products.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredOrders.map(order => (
              <div key={order._id} style={{
                background: 'white',
                padding: '20px',
                borderRadius: '10px',
                boxShadow: '0 1px 5px rgba(0,0,0,0.08)'
              }}>
                <p><strong>Order ID:</strong> {order._id}</p>
                <p><strong>Status:</strong> {order.status}</p>
                <p><strong>Payment Method:</strong> {order.paymentMethod}</p>
                <p><strong>Total:</strong> {order.currency} {order.total.toFixed(2)}</p>

                {order.promoCode && (
                  <div style={{ marginTop: 8, marginBottom: 8, padding: 10, backgroundColor: '#eaf8e6', borderRadius: 6 }}>
                    <p><strong>🎁 Promo Code:</strong> {order.promoCode.code}</p>
                    <p><strong>Discount:</strong> -{order.currency} {order.discount?.toFixed(2)}</p>
                    <p><strong>Total After Discount:</strong> {order.currency} {order.totalAfterDiscount?.toFixed(2)}</p>
                  </div>
                )}

                <p><strong>Shipping Address:</strong> {renderShipping(order.shippingAddress)}</p>
                <p><strong>Customer:</strong> {order.buyer?.name} ({order.buyer?.email})</p>

                <hr style={{ margin: '15px 0' }} />

                <p><strong>Your Items in This Order:</strong></p>
                <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                  {order.products
                    .filter(p => {
                      const productVendorId = p.product?.vendor?._id || p.product?.vendor;
                      return productVendorId === currentVendorId;
                    })
                    .map((p, i) => (
                      <li key={i} style={{ marginBottom: '8px' }}>
                        📦 {p.product?.name} × {p.quantity}
                      </li>
                  ))}
                </ul>

                {order.status.toLowerCase() === 'pending' && (
                  <button
                    onClick={() => markAsShipped(order._id)}
                    style={{
                      marginTop: '15px',
                      backgroundColor: '#3498DB',
                      color: 'white',
                      padding: '10px 20px',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Mark as Shipped
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <MerkatoFooter />
    </div>
  );
}

export default VendorOrders;