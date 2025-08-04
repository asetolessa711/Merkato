import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [registerTimer, setRegisterTimer] = useState(null);
  const [shopTimer, setShopTimer] = useState(null);

  // Determine user role from localStorage
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch (e) {}
  const isLoggedIn = !!user;
  const isCustomer = user?.role === 'customer';
  const isVendor = user?.role === 'vendor';

  function handleLogout() {
    localStorage.clear();
    window.location.href = '/';
  }

  return (
    <header className="top-bar">
      <div className="top-bar-content">
        {/* 🔶 Left: Logo + Tagline */}
        <div className="top-left">
          <span className="logo">Merkato</span>
          <span className="tagline">Trusted Marketplace for All</span>
        </div>

        {/* 🔵 Center: Search */}
        <div className="top-center">
          <label className="search-label" htmlFor="search">Search</label>
          <input
            type="text"
            id="search"
            placeholder="Search products, vendors..."
            className="search-input"
          />
        </div>

        {/* 🟣 Right: Nav + Selectors */}
        <nav className="top-right" role="navigation">
          {/* Register Dropdown */}
          <div
            className="dropdown"
            onMouseEnter={() => {
              clearTimeout(registerTimer);
              setRegisterOpen(true);
            }}
            onMouseLeave={() => {
              const timer = setTimeout(() => setRegisterOpen(false), 150);
              setRegisterTimer(timer);
            }}
          >
            <button className="dropdown-toggle">Register ▾</button>
            {registerOpen && (
              <div className="dropdown-menu">
                <Link to="/register?role=vendor">As Vendor</Link>
                <Link to="/register?role=customer">As Customer</Link>
              </div>
            )}
          </div>


          {/* Shop Dropdown and Direct Link */}
          <div
            className="dropdown"
            onMouseEnter={() => {
              clearTimeout(shopTimer);
              setShopOpen(true);
            }}
            onMouseLeave={() => {
              const timer = setTimeout(() => setShopOpen(false), 150);
              setShopTimer(timer);
            }}
          >
            <button className="dropdown-toggle">Shop ▾</button>
            {shopOpen && (
              <div className="dropdown-menu">
                <Link to="/shop?by=category">By Category</Link>
                <Link to="/shop?by=vendor">By Vendor</Link>
              </div>
            )}
          </div>
          {/* Direct Shop Link for accessibility and tests */}
          <Link to="/shop" className="top-link">Shop</Link>

          <Link to="/favorites" className="top-link">Favorites</Link>

          {/* Show dashboard and logout for logged-in users */}
          {isCustomer && <Link to="/dashboard" className="top-link">Dashboard</Link>}
          {isVendor && <Link to="/vendor/dashboard" className="top-link">Dashboard</Link>}
          {isLoggedIn ? (
            <button className="top-link" onClick={handleLogout}>Logout</button>
          ) : (
            <Link to="/login" className="top-link">Login</Link>
          )}

          <select className="lang-toggle" defaultValue="EN">
            <option value="EN">EN</option>
            <option value="AM">AM</option>
            <option value="OR">OR</option>
          </select>

          <select className="currency-toggle" defaultValue="USD">
            <option value="USD">USD</option>
            <option value="ETB">ETB</option>
            <option value="EUR">EUR</option>
          </select>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
