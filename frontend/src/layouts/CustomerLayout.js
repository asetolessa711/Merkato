import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import styles from './CustomerLayout.module.css';

import Navbar from '../components/Navbar';
import CustomerSidebar from '../components/CustomerSidebar';
import MerkatoFooter from '../components/MerkatoFooter';
import Breadcrumb from '../components/Breadcrumb';
import QuickStatCard from '../components/QuickStatCard/QuickStatCard';
import SmartSidebar from '../components/SmartSidebar';

const EmptyState = ({ message }) => (
  <div className={styles.emptyState}>
    <p>{message}</p>
  </div>
);

const LoadingSkeleton = () => (
  <div className={styles.loadingSkeleton}>
    <div className={styles.skeletonHeader} />
    <div className={styles.skeletonStats}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className={styles.skeletonCard} />
      ))}
    </div>
  </div>
);

function CustomerLayout({ user, onLogout, lang, onLangChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const isDashboardPage = location.pathname === '/account/dashboard';

  const quickStats = useMemo(() => [
    { icon: '📦', label: 'Active Orders', value: user?.activeOrders || '0', onClick: () => navigate('/account/orders') },
    { icon: '❤️', label: 'Wishlist', value: user?.wishlistCount || '0', onClick: () => navigate('/favorites') },
    { icon: '💰', label: 'Credits', value: `$${user?.credits || '0'}`, onClick: () => navigate('/account/wallet') },
    { icon: '🎯', label: 'Points', value: user?.rewardPoints || '0', onClick: () => navigate('/account/rewards') }
  ], [user, navigate]);

  const handleNotificationClick = useCallback(() => {
    navigate('/account/notifications');
  }, [navigate]);

  const formatLastLogin = useCallback((date) => {
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return 'Not available';
    }
  }, []);

  useEffect(() => {
    if (user) setIsLoading(false);
  }, [user]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Navbar user={null} onLogout={onLogout} lang={lang} onLangChange={onLangChange} />
        <div className={styles.mainContent}>
          <CustomerSidebar user={null} activePath={location.pathname} />
          <main className={styles.contentArea}>
            <LoadingSkeleton />
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <h2>Something went wrong</h2>
        <button onClick={() => window.location.reload()}>
          Refresh Page
        </button>
      </div>
    );
  }

  // --- Use SmartSidebar instead of CustomerSidebar ---
  return (
    <div className="flex min-h-screen">
      <SmartSidebar />
      <main className="flex-grow p-4">
        <Navbar
          user={user}
          onLogout={onLogout}
          lang={lang}
          onLangChange={onLangChange}
        />

        <Breadcrumb />

        {isDashboardPage && (
          <>
            <header className={styles.welcomeHeader}>
              <h2 className={styles.welcomeTitle}>
                👋 Welcome back, {user?.name || 'Valued Customer'}
              </h2>
              <p className={styles.lastLogin}>
                Last login: {formatLastLogin(user?.lastLogin)}
              </p>
            </header>

            <div className={styles.statsGrid}>
              {quickStats.length > 0
                ? quickStats.map((stat, index) => (
                    <QuickStatCard key={index} {...stat} />
                  ))
                : <EmptyState message="No stats available" />}
            </div>

            {user?.hasNewNotifications && (
              <div className={styles.notification}>
                <div className={styles.notificationContent}>
                  <span>🔔</span>
                  <span>You have new notifications!</span>
                </div>
                <button
                  onClick={handleNotificationClick}
                  className={styles.notificationButton}
                >
                  View All
                </button>
              </div>
            )}
          </>
        )}

        {/* Inject routed content */}
        <div className={styles.childrenWrapper}>
          <Outlet />
        </div>
        {/* Cypress logout button for test */}
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
        <MerkatoFooter />
      </main>
    </div>
  );
}

CustomerLayout.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    lastLogin: PropTypes.string,
    activeOrders: PropTypes.number,
    wishlistCount: PropTypes.number,
    credits: PropTypes.number,
    rewardPoints: PropTypes.number,
    hasNewNotifications: PropTypes.bool
  }),
  onLogout: PropTypes.func.isRequired,
  lang: PropTypes.string.isRequired,
  onLangChange: PropTypes.func
};

class CustomerLayoutErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.errorState}>
          <h2>Something went wrong</h2>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default React.memo((props) => (
  <CustomerLayoutErrorBoundary>
    <CustomerLayout {...props} />
  </CustomerLayoutErrorBoundary>
));