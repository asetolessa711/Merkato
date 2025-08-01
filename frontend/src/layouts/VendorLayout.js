import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import VendorSidebar from '../components/VendorSidebar';
import styles from './VendorLayout.module.css';

function VendorLayout({ user, onLogout, lang, onLangChange }) {
  return (
    <div className={styles.container}>
      <Navbar
        user={user}
        onLogout={onLogout}
        lang={lang}
        onLangChange={onLangChange}
      />

      <div className={styles.mainContent}>
        <VendorSidebar />
        <main className={styles.contentArea}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default VendorLayout;
