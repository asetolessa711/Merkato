// src/layouts/PublicLayout.js
import React from 'react';
import PropTypes from 'prop-types';
import { Outlet } from 'react-router-dom';
import NavbarUniversal from '../components/NavbarUniversal';

import styles from './PublicLayout.module.css';
import MerkatoFooter from '../components/MerkatoFooter';

function PublicLayout({ user, onLogout, lang, onLangChange }) {
  return (
    <div className="public-layout">
      {/* Universal Navbar */}
      <NavbarUniversal />

      {/* Main content area for pages like HomePage, Shop, etc. */}
      <main>
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

PublicLayout.defaultProps = {
  user: null,
  lang: 'en',
  onLangChange: () => {}
};

export default PublicLayout;