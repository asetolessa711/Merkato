import React from 'react';
import { NavLink } from 'react-router-dom';

const VendorSidebar = () => {
  const linkStyle = {
    display: 'block',
    padding: '12px 16px',
    textDecoration: 'none',
    color: '#0984e3',
    fontWeight: '500',
    borderRadius: '6px',
    transition: 'all 0.2s ease-in-out'
  };

  const activeStyle = {
    ...linkStyle,
    backgroundColor: '#ecf0f1',
    borderLeft: '4px solid #00B894',
    fontWeight: 'bold'
  };

  return (
    <div style={{
      width: '220px',
      padding: '20px',
      backgroundColor: '#fff',
      borderRight: '1px solid #eee',
      position: 'sticky',
      top: 0,
      height: '100vh'
    }}>
      <h3 style={{ marginBottom: '1.5rem', color: '#2d3436' }}>🧑‍💼 Vendor Menu</h3>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <NavLink to="/vendor" style={linkStyle} activeStyle={activeStyle} end>🏬 Store Overview</NavLink>
        <NavLink to="/vendor/products" style={linkStyle} activeStyle={activeStyle}>📦 Product Management</NavLink>
        <NavLink to="/vendor/orders" style={linkStyle} activeStyle={activeStyle}>📬 Order Management</NavLink>
        <NavLink to="/vendor/marketing" style={linkStyle} activeStyle={activeStyle}>📣 Marketing Tools</NavLink>
        <NavLink to="/vendor/customers" style={linkStyle} activeStyle={activeStyle}>💬 Customer Interaction</NavLink>
        <NavLink to="/vendor/finance" style={linkStyle} activeStyle={activeStyle}>💰 Finance & Payouts</NavLink>
      </nav>
    </div>
  );
};

export default VendorSidebar;
