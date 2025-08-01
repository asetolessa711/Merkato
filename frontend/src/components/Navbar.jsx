// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css'; // optional external styles
import { useUser } from '../hooks/useUser'; // custom hook or state context

function Navbar() {
  const { user, logout } = useUser(); // assume role is in user?.role
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileOpen(!isMobileOpen);

  const isActive = (path) => location.pathname.startsWith(path) ? 'active' : '';

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop' },
    ...(user?.role === 'vendor' ? [{ to: '/vendor', label: 'Dashboard' }] : []),
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
    ...(user?.role === 'customer' ? [{ to: '/account/dashboard', label: 'Dashboard' }] : []),
    { to: '/cart', label: 'Cart' }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">Merkato</Link>
      </div>

      <button className="mobile-toggle" onClick={toggleMobileMenu}>
        ☰
      </button>

      <ul className={`navbar-links ${isMobileOpen ? 'open' : ''}`}>
        {navLinks.map((link) => (
          <li key={link.to} className={isActive(link.to)}>
            <Link to={link.to}>{link.label}</Link>
          </li>
        ))}
        {user ? (
          <li><button onClick={logout}>🚪 Logout</button></li>
        ) : (
          <>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register">Register</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
