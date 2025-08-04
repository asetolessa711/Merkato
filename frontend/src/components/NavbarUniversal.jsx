// src/components/NavbarUniversal.jsx
import React, { useState, useRef } from 'react';
import { universalLinks, roleLinks, authLinks } from './NavbarConfig';
import { Link, useLocation } from 'react-router-dom';
import useUser from '../hooks/useUser';
import styles from './Navbar.module.css';

function NavbarUniversal() {
  const { user, logout } = useUser();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  // Dropdown close timers
  const accountTimer = useRef();
  const categoryTimer = useRef();
  const registerTimer = useRef();

  // Determine role
  let role = user?.role || (user?.roles ? user.roles[0] : null);
  // Fallback: if user exists and has email but no role, treat as customer
  if (!role && user && user.email) role = 'customer';
  const roleNav = role && roleLinks[role] ? roleLinks[role] : [];

  // Helper for active link (exact for /, startsWith for others)
  const isActive = (to) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  // Universal + role links
  const navLinks = [
    ...universalLinks,
    ...roleNav
  ];

  // Auth links if not logged in
  const showAuth = !user;

  // Helper functions for delayed close
  const openDropdown = (setter, timerRef) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setter(true);
  };
  const closeDropdown = (setter, timerRef) => {
    timerRef.current = setTimeout(() => setter(false), 200);
  };
  return (
    <nav className={styles.navbar}>
      <div className={styles.navStart}>
        <Link to="/" className={styles.logo} style={{ color: '#FFD700' }}>Merkato</Link>
        <button className={styles.mobileMenuButton} onClick={() => setMobileOpen(!mobileOpen)}>
          <span className={styles.hamburgerIcon}></span>
        </button>
      </div>
      <div className={`${styles.navLinks} ${mobileOpen ? styles.showMobile : ''}`}> 
        <form className={styles.searchForm} onSubmit={e => { e.preventDefault(); window.location.href = `/shop?search=${encodeURIComponent(e.target.search.value)}`; }}>
          <input name="search" className={styles.searchInput} type="text" placeholder="Search..." style={{ maxWidth: 120 }} />
          <button className={styles.searchButton} type="submit">🔍</button>
        </form>
        <div className={styles.langSelector}>
          <select className={styles.langSelect} defaultValue="EN">
            <option value="EN">EN</option>
            <option value="AM">AM</option>
            <option value="OR">OR</option>
          </select>
          <select className={styles.langSelect} defaultValue="USD">
            <option value="USD">USD</option>
            <option value="ETB">ETB</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        {navLinks.map((link) => {
          if (link.dropdown && link.items) {
            // My Account dropdown for customer
          return (
            <div
              key={link.label}
              className={styles.dropdown}
              onMouseEnter={() => openDropdown(setAccountOpen, accountTimer)}
              onMouseLeave={() => closeDropdown(setAccountOpen, accountTimer)}
            >
              <button className={styles.link} onClick={() => setAccountOpen((v) => !v)}>
                {link.label} ▾
              </button>
              {accountOpen && (
                <div className={styles.dropdownMenu}
                  onMouseEnter={() => openDropdown(setAccountOpen, accountTimer)}
                  onMouseLeave={() => closeDropdown(setAccountOpen, accountTimer)}
                >
                  {link.items.map((item) =>
                    item.isLogout ? (
                      <button key={item.label} className={styles.logoutButton} onClick={logout}>
                        {item.label}
                      </button>
                    ) : (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={styles.dropdownItem}
                      >
                        {item.label}
                      </Link>
                    )
                  )}
                </div>
              )}
            </div>
          );
          } else if (link.dropdown) {
            // Categories dropdown
            return (
              <div
                key={link.label}
                className={styles.dropdown}
                onMouseEnter={() => openDropdown(setCategoryOpen, categoryTimer)}
                onMouseLeave={() => closeDropdown(setCategoryOpen, categoryTimer)}
              >
                <button className={`${styles.link} ${isActive(link.to) ? styles.activeLink : ''}`}>{link.label} ▾</button>
                {categoryOpen && (
                  <div className={styles.dropdownMenu}
                    onMouseEnter={() => openDropdown(setCategoryOpen, categoryTimer)}
                    onMouseLeave={() => closeDropdown(setCategoryOpen, categoryTimer)}
                  >
                    <Link to="/categories/electronics" className={styles.dropdownItem}>Electronics</Link>
                    <Link to="/categories/fashion" className={styles.dropdownItem}>Fashion</Link>
                    <Link to="/categories/food" className={styles.dropdownItem}>Food</Link>
                    <Link to="/categories/other" className={styles.dropdownItem}>Other</Link>
                  </div>
                )}
              </div>
            );
          } else if (link.isLogout) {
            return (
              <button key={link.label} className={styles.logoutButton} onClick={logout}>
                {link.label}
              </button>
            );
          } else {
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`${styles.link} ${isActive(link.to) ? styles.activeLink : ''}`}
              >
                {link.icon ? link.icon : ''}{link.label}
              </Link>
            );
          }
        })}
        {showAuth && (
          <div className={styles.dropdown} style={{ position: 'relative' }}
            onMouseEnter={() => openDropdown(setRegisterOpen, registerTimer)}
            onMouseLeave={() => closeDropdown(setRegisterOpen, registerTimer)}
          >
            <button className={styles.link} onClick={() => setRegisterOpen((v) => !v)}>
              📝 Register ▾
            </button>
            {registerOpen && (
              <div className={styles.dropdownMenu} style={{ minWidth: 120 }}
                onMouseEnter={() => openDropdown(setRegisterOpen, registerTimer)}
                onMouseLeave={() => closeDropdown(setRegisterOpen, registerTimer)}
              >
                <Link to="/register?type=customer" className={styles.dropdownItem}>As Customer</Link>
                <Link to="/register?type=vendor" className={styles.dropdownItem}>As Vendor</Link>
              </div>
            )}
          </div>
        )}
        {showAuth && (
          <Link to="/login" className={styles.link}>
            🔑 Login
          </Link>
        )}
      </div>
      {/* Search, Language, Currency selectors can be added here */}
    </nav>
  );
}

export default NavbarUniversal;
