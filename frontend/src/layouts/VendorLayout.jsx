import React from 'react';
import { Outlet } from 'react-router-dom';
import MerkatoNavbar from '../components/MerkatoNavbar'';
import MicroBanner from '../components/MicroBanner'';
import VendorSidebar from '../components/VendorSidebar'';

import styles from './VendorLayout.module.css';
import MerkatoFooter from '../components/MerkatoFooter'';

function VendorLayout({ user, onLogout, lang, onLangChange }) {
  // Defense-in-depth RBAC guard (ProtectedRoute already enforces this)
  const roles = (user && (user.roles || [])) || [];
  const isVendor = roles.includes('vendor');
  if (!isVendor) {
    return (
      <div className={styles.container}>
        <MicroBanner alwaysShow />
        <MerkatoNavbar role="vendor" />
        <main className={styles.contentArea}>
          <div className={styles.guardBox}>
            <h2>Access restricted</h2>
            <p>You need a vendor account to access this area.</p>
          </div>
        </main>
        <MerkatoFooter />
      </div>
    );
  }
  return (
    <div className={styles.container}>
  <MicroBanner alwaysShow />
  <MerkatoNavbar role="vendor" />
      {/* Fixed heading at the top */}
      <header className={styles.fixedHeader}>
        <h1>Vendor Dashboard</h1>
      </header>
      <div className={styles.mainContentScrollable}>
        <VendorSidebar user={user} />
        <main className={styles.contentArea}>
          <Outlet />
        </main>
      </div>
      <MerkatoFooter />
    </div>
  );
}

export default VendorLayout;
