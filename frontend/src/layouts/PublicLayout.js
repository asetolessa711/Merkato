// src/layouts/PublicLayout.js
import React from 'react';
import PropTypes from 'prop-types';
import { Outlet } from 'react-router-dom';
import MerkatoNavbar from '../components/MerkatoNavbar';
import ThemeSwitcher from '../components/ThemeSwitcher';

import styles from './PublicLayout.module.css';
import MerkatoFooter from '../components/MerkatoFooter';
import { Link } from 'react-router-dom';

function PublicLayout({ user = null, onLogout, lang = 'en', onLangChange = () => {} }) {
  const isCypress = typeof window !== 'undefined' && window.Cypress;
  return (
    <div className="public-layout">
  {isCypress && (
        <div style={{
          position: 'fixed', bottom: 80, left: 16, zIndex: 1500,
          background: '#111', color: '#fff', padding: '6px 10px', borderRadius: 6,
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          display: 'flex', gap: 8, alignItems: 'center'
        }}>
          <span style={{ fontSize: 12, opacity: 0.75 }}>Test Shortcuts:</span>
          <Link data-testid="e2e-register-link" to="/register" style={{ color: '#ffd700', textDecoration: 'underline' }}>Register</Link>
          <Link data-testid="e2e-login-link" to="/login" style={{ color: '#ffd700', textDecoration: 'underline' }}>Login</Link>
        </div>
      )}

  {/* Merkato Navbar (microbanner is rendered inside the navbar header) */}
  <MerkatoNavbar />
  <ThemeSwitcher />

      {/* Main content area for pages like HomePage, Shop, etc. */}
      <main className={styles.container}>
        <Outlet />
      </main>
      <MerkatoFooter />
    </div>
  );
}

PublicLayout.propTypes = {
  user: PropTypes.object,
  onLogout: PropTypes.func,
  lang: PropTypes.string,
  onLangChange: PropTypes.func
};

export default PublicLayout;