import React from 'react';
import { Outlet } from 'react-router-dom';
import MerkatoNavbar from '../components/MerkatoNavbar';
import VendorSidebar from '../components/VendorSidebar';

import styles from './VendorLayout.module.css';
import MerkatoFooter from '../components/MerkatoFooter';

function VendorLayout({ user, onLogout, lang, onLangChange }) {
  return (
    <div className={styles.container}>
  <MerkatoNavbar role="vendor" showCategories={false} />
      {/* Fixed heading at the top */}
      <header className={styles.fixedHeader}>
        <h1>Vendor Dashboard</h1>
      </header>
      <div className={styles.mainContentScrollable}>
        <VendorSidebar />
        <main className={styles.contentArea}>
          <Outlet />
        </main>
      </div>
      <MerkatoFooter />
    </div>
  );
}

export default VendorLayout;
