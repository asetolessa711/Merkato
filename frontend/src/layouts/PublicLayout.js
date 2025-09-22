// src/layouts/PublicLayout.js
import React from 'react';
import PropTypes from 'prop-types';
import { Outlet, useLocation } from 'react-router-dom';
import MerkatoNavbar from '../components/MerkatoNavbar.jsx';
import MicroBanner from '../components/MicroBanner.jsx';

import styles from './PublicLayout.module.css';
import MerkatoFooter from '../components/MerkatoFooter';
import { Flags } from '../utils/featureFlags';
import { Link } from 'react-router-dom';
import { ROUTES } from '../config/routes';

function PublicLayout({ user = null, onLogout, lang = 'en', onLangChange = () => {} }) {
  const isCypress = typeof window !== 'undefined' && window.Cypress;
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '/home';
  const microBelow = Flags.HOME_MICRO_BELOW && isHome;
  const tallNav = Flags.NAVBAR_TALL;
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
          <Link data-testid="e2e-register-link" to={ROUTES.register} style={{ color: '#ffd700', textDecoration: 'underline' }}>Register</Link>
          <Link data-testid="e2e-login-link" to={ROUTES.login} style={{ color: '#ffd700', textDecoration: 'underline' }}>Login</Link>
        </div>
      )}

  {/* Public pages use MerkatoNavbar with MicroBanner and Mega Menu */}
  <MerkatoNavbar role="public" tall={tallNav} microInline={!microBelow} />

      {/* Optionally render MicroBanner below the navbar on Home when flagged */}
      {microBelow && (
        <div style={{ position: 'relative', zIndex: 9999 }}>
          <MicroBanner alwaysShow />
        </div>
      )}

      {/* Main content area for pages like HomePage, Shop, etc. */}
      <main className={`${styles.container} ${isHome ? styles.containerTight : ''}`} style={{ paddingTop: tallNav ? 112 : undefined }}>
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

// Note: defaultProps removed for function component; defaults are applied via parameters above.

export default PublicLayout;