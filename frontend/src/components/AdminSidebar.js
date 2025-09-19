import React from 'react';
import { NavLink } from 'react-router-dom';

const AdminSidebar = () => {
  const linkStyle = {
    display: 'block',
    padding: '10px 16px',
    textDecoration: 'none',
    color: '#3498db',
    fontWeight: 'bold',
    borderRadius: '4px'
  };

  const activeStyle = {
    ...linkStyle,
    backgroundColor: '#ecf0f1',
    borderLeft: '4px solid #00B894'
  };

  return (
    <div style={{
      width: '200px',
      padding: '20px',
      backgroundColor: '#fff',
      boxShadow: '1px 0 3px rgba(0,0,0,0.1)',
      height: '100vh',
      position: 'sticky',
      top: 0
    }}>
      <h3 style={{ marginBottom: '20px' }}>🛠 Admin Panel</h3>

  <NavLink to="/admin/dashboard" end style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>📊 Dashboard</NavLink>
  <NavLink to="/admin/vendors" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>🏪 Vendors</NavLink>
  <NavLink to="/admin/orders" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>🛍 Orders</NavLink>
  <NavLink to="/admin/invoices/report" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>📄 Invoices</NavLink>
  <NavLink to="/admin/expenses" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>💸 Expenses</NavLink>
  <NavLink to="/admin/feedback" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>💬 Feedback</NavLink>
  <NavLink to="/admin/support" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>🆘 Support</NavLink>
  <NavLink to="/admin/analytics" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>📈 Analytics</NavLink>
  <NavLink to="/admin/promo-codes" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>🎟 Promo Codes</NavLink>
  <NavLink to="/admin/mega-menu" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>🧭 Mega Menu</NavLink>
  <NavLink to="/admin/microbanner" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>🪧 Microbanner</NavLink>
  <NavLink to="/admin/trust-ticker" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>✅ Trust Ticker</NavLink>
    </div>
  );
};

export default AdminSidebar;
