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

      <NavLink to="/admin/dashboard" style={linkStyle} activeStyle={activeStyle} end>📊 Dashboard</NavLink>
      <NavLink to="/admin/vendors" style={linkStyle} activeStyle={activeStyle}>🏪 Vendors</NavLink>
      <NavLink to="/admin/orders" style={linkStyle} activeStyle={activeStyle}>🛍 Orders</NavLink>
      <NavLink to="/admin/invoices/report" style={linkStyle} activeStyle={activeStyle}>📄 Invoices</NavLink>
      <NavLink to="/admin/expenses" style={linkStyle} activeStyle={activeStyle}>💸 Expenses</NavLink>
      <NavLink to="/admin/feedback" style={linkStyle} activeStyle={activeStyle}>💬 Feedback</NavLink>
      <NavLink to="/admin/support" style={linkStyle} activeStyle={activeStyle}>🆘 Support</NavLink>
      <NavLink to="/admin/analytics" style={linkStyle} activeStyle={activeStyle}>📈 Analytics</NavLink>
      <NavLink to="/admin/promo-codes" style={linkStyle} activeStyle={activeStyle}>🎟 Promo Codes</NavLink>
    </div>
  );
};

export default AdminSidebar;
