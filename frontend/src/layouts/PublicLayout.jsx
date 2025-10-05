// src/layouts/PublicLayout.js
import React from 'react';
import PropTypes from 'prop-types';
import { Outlet, useLocation, Link } from 'react-router-dom';

import MerkatoNavbar from '../components/MerkatoNavbar'';
import MerkatoFooter from '../components/MerkatoFooter'';
import MicroBanner from '../components/MicroBanner'';

import styles from './PublicLayout.module.css';
import { Flags } from '../utils/featureFlags'';
import { ROUTES } from '../config/routes'';

function PublicLayout({ user = null, onLogout, lang = 'en', onLangChange = () => {} }) {
  const isCypress = typeof window !== 'undefined' && window.Cypress;
  const location = useLocation();

  const isCheckout = location.pathname.startsWith(ROUTES.checkout);
  const isHome = location.pathname === '/';
  const tallNav = Flags.NAVBAR_TALL;

  // Site-wide kill switch for the micro bar; default off unless explicitly enabled
  // Hard-default to off; only enable when env flag is true and a localStorage override isn't forcing it on.
  const envMicro = String(process.env.REACT_APP_MICROBAR_ENABLED || 'false').toLowerCase() === 'true';
  let forceOn = false;
  try { forceOn = String(localStorage.getItem('dev:forceMicrobar') || 'false').toLowerCase() === 'true'; } catch {}
  const MICRO_ENABLED = envMicro || forceOn;
  const showMicro = MICRO_ENABLED && !isCheckout;

  return (
    <div className={styles.layout}>
      {isCypress && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            left: 16,
            zIndex: 1500,
            background: '#111',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: 6,
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            display: 'flex',
            gap: 8,
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: 12, opacity: 0.75 }}>Test Shortcuts:</span>
          <Link data-testid="e2e-register-link" to={ROUTES.register} style={{ color: '#ffd700', textDecoration: 'underline' }}>
            Register
          </Link>
          <Link data-testid="e2e-login-link" to={ROUTES.login} style={{ color: '#ffd700', textDecoration: 'underline' }}>
            Login
          </Link>
        </div>
      )}

      <MerkatoNavbar role="public" tall={tallNav} microInline={false} />

      {/* Full-bleed micro bar directly under the navbar (flush) */}
      {showMicro && (
        <div className={styles.microOuter}>
          <div className={styles.microInner}>
            <MicroBanner
              variant="compact"
              fullBleedBg={false}
            />
          </div>
        </div>
      )}

      <main
        className={[
          styles.container,
          showMicro ? styles.hasMicroAbove : '',
          isHome ? styles.containerTight : ''
        ].join(' ').trim()}
      >
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
