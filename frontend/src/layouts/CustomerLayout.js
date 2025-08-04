import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './CustomerLayout.module.css';

import NavbarUniversal from '../components/NavbarUniversal';
import CustomerSidebar from '../components/CustomerSidebar';
import MerkatoFooter from '../components/MerkatoFooter';
import Breadcrumb from '../components/Breadcrumb';
import QuickStatCard from '../components/QuickStatCard/QuickStatCard';

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

function CustomerLayout({ children, user, onLogout, lang, onLangChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoized stats
  const quickStats = useMemo(() => [
    { icon: '📦', label: 'Active Orders', value: user?.activeOrders || '0', onClick: () => navigate('/account/orders') },
    { icon: '❤️', label: 'Wishlist', value: user?.wishlistCount || '0', onClick: () => navigate('/favorites') },
    { icon: '💰', label: 'Credits', value: `$${user?.credits || '0'}`, onClick: () => navigate('/account/wallet') },
    { icon: '🎯', label: 'Points', value: user?.rewardPoints || '0', onClick: () => navigate('/account/rewards') }
  ], [user, navigate]);

  // Memoized handlers
  const handleNotificationClick = useCallback(() => {
    navigate('/account/notifications');
  }, [navigate]);

  const formatLastLogin = useCallback((date) => {
    try {
      return new Date(date).toLocaleDateString();
    } catch (error) {
      return 'Not available';
    }
  }, []);

  useEffect(() => {
    if (user) setIsLoading(false);
  }, [user]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <NavbarUniversal />
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

  return (
    <div className={styles.container}>
      <NavbarUniversal />
      {/* Fixed heading at the top */}
      <header className={styles.fixedHeader}>
        <h1>Customer Dashboard</h1>
      </header>
      <div className={styles.mainContentScrollable}>
        <CustomerSidebar user={user} activePath={location.pathname} />
        <main className={styles.contentArea}>
          {/* Only render children, no duplicate headings */}
          <div className={styles.childrenWrapper}>{children}</div>
        </main>
      </div>
      <MerkatoFooter />
    </div>
  );
}

CustomerLayout.propTypes = {
  children: PropTypes.node.isRequired,
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
  onLangChange: PropTypes.func.isRequired
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

export default React.memo(({ ...props }) => (
  <CustomerLayoutErrorBoundary>
    <CustomerLayout {...props} />
  </CustomerLayoutErrorBoundary>
));