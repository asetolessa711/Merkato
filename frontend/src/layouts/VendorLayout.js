import React, { useEffect, useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import styles from './VendorLayout.module.css';

import Navbar from '../components/Navbar';
import SmartSidebar from '../components/SmartSidebar';
import Breadcrumb from '../components/Breadcrumb';
import QuickStatCard from '../components/QuickStatCard/QuickStatCard';
import MerkatoFooter from '../components/MerkatoFooter';

function VendorLayout({ user, onLogout, lang, onLangChange }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const isDashboardPage = location.pathname === '/vendor';

  const quickStats = useMemo(() => [
    { icon: '📦', label: 'Orders', value: user?.totalOrders || 0, onClick: () => navigate('/vendor/orders') },
    { icon: '💰', label: 'Revenue', value: `$${user?.revenue || 0}`, onClick: () => navigate('/vendor/analytics') },
    { icon: '⭐', label: 'Reviews', value: user?.reviewCount || 0, onClick: () => navigate('/vendor/questions') },
    { icon: '📢', label: 'Marketing', value: 'Tools', onClick: () => navigate('/vendor/marketing') }
  ], [user, navigate]);

  useEffect(() => {
    if (user) setLoading(false);
  }, [user]);

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <p>Loading vendor dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Navbar user={user} onLogout={onLogout} lang={lang} onLangChange={onLangChange} />

      <div className={styles.mainContent}>
        <SmartSidebar />

        <main className={styles.contentArea}>
          <Breadcrumb />

          {isDashboardPage && (
            <div className={styles.dashboardWelcome}>
              <h2>Welcome back, {user?.storeName || user?.name || 'Vendor'} 👋</h2>
              <div className={styles.statsGrid}>
                {quickStats.map((stat, index) => (
                  <QuickStatCard key={index} {...stat} />
                ))}
              </div>
            </div>
          )}

          <div className={styles.childrenWrapper}>
            <Outlet />
          </div>
          {/* Add logout button for Cypress test */}
          <button
            onClick={onLogout}
            data-cy="logout-button"
            className={styles.logoutButton}
            style={{
              margin: '24px 0 0 0',
              padding: '10px 24px',
              background: '#e74c3c',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </main>
      </div>

      <MerkatoFooter />
    </div>
  );
}

VendorLayout.propTypes = {
  user: PropTypes.object,
  onLogout: PropTypes.func.isRequired,
  lang: PropTypes.string.isRequired,
  onLangChange: PropTypes.func
};

export default VendorLayout;