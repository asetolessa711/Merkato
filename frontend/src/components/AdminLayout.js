
import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/routes';
import AdminSidebar from './AdminSidebar';
import MerkatoFooter from '../components/MerkatoFooter';
import styles from '../layouts/AdminLayout.module.css';
import MerkatoNavbar from '../components/MerkatoNavbar.jsx';
import MicroBanner from '../components/MicroBanner.jsx';

const AdminLayout = ({ user }) => {
  const navigate = useNavigate();

  // Removed verbose console.log to keep console clean in production/tests

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  navigate(ROUTES.login);
  };

  // Role notice removed: roles are handled at login and via backend authorization.

  return (
    <div className={styles.container}>
  {/* Micro promo + trust bar and Navbar */}
  <MicroBanner alwaysShow />
  <MerkatoNavbar role="admin" />

      {/* Main Content Area with Sidebar and Scrollable Main */}
      <div className={styles.mainContent}>
        <AdminSidebar />
        <main className={styles.contentArea}>
          {/* Page heading remains 'Admin Dashboard' for consistency and tests */}
          <h2 style={{ marginTop: 0, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center' }}>Admin Dashboard</h2>
          <Outlet />
        </main>
      </div>

      {/* Footer naturally sits at the bottom after content */}
      <MerkatoFooter showSocials={false} />
    </div>
  );
};

export default AdminLayout;