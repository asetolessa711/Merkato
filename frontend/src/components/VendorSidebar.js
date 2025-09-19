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
        <NavLink to="/vendor" end style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          🏬 Store Overview
        </NavLink>
        <NavLink to="/vendor/products" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          📦 Product Management
        </NavLink>
        <NavLink to="/vendor/orders" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          📬 Order Management
        </NavLink>
        <NavLink to="/vendor/marketing" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          📣 Marketing Tools
        </NavLink>
        <NavLink to="/vendor/customers" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          💬 Customer Interaction
        </NavLink>
        <NavLink to="/vendor/finance" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          💰 Finance & Payouts
        </NavLink>
        <NavLink to="/vendor/store" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          🛒 Vendor Store
        </NavLink>
      </nav>
    </div>
  );
};

export default VendorSidebar;
