import React from 'react';
import { NavLink } from 'react-router-dom';
import './VendorSidebar.css'; // Include any specific styles

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
    <div className="vendor-sidebar">
      <h3 className="sidebar-header">🧑‍💼 Vendor Menu</h3>
      <nav className="sidebar-nav">
        <NavLink to="/vendor" style={linkStyle} activeStyle={activeStyle} end>
          🏬 Store Overview
        </NavLink>
        <NavLink to="/vendor/products" style={linkStyle} activeStyle={activeStyle}>
          📦 Product Management
        </NavLink>
        <NavLink to="/vendor/orders" style={linkStyle} activeStyle={activeStyle}>
          📬 Order Management
        </NavLink>
        <NavLink to="/vendor/marketing" style={linkStyle} activeStyle={activeStyle}>
          📣 Marketing Tools
        </NavLink>
        <NavLink to="/vendor/customers" style={linkStyle} activeStyle={activeStyle}>
          💬 Customer Interaction
        </NavLink>
        <NavLink to="/vendor/finance" style={linkStyle} activeStyle={activeStyle}>
          💰 Finance & Payouts
        </NavLink>
        <NavLink to="/vendor/store" style={linkStyle} activeStyle={activeStyle}>
          🛒 Vendor Store
        </NavLink>
      </nav>
    </div>
  );
};

export default VendorSidebar;
