// src/layouts/PublicLayout.js
import React from 'react';
import PropTypes from 'prop-types';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import styles from './PublicLayout.module.css';

function PublicLayout({ user, onLogout, lang, onLangChange }) {
  return (
    <div className="public-layout">
      {/* Navbar handles all top navigation */}
      <Navbar
        user={user}
        onLogout={onLogout}
        lang={lang}
        onLangChange={onLangChange}
      />

      {/* Main content area for pages like HomePage, Shop, etc. */}
      <main>
        <Outlet />
      </main>
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