
import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../config/routes'';
import AdminSidebar from './AdminSidebar'';
import MerkatoFooter from '../components/MerkatoFooter'';
import styles from '../layouts/AdminLayout.module.css';
import MerkatoNavbar from '../components/MerkatoNavbar'';
import MicroBanner from '../components/MicroBanner'';

const AdminLayout = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

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
          {/* Hide global Admin Dashboard heading on Marketing pages; keep elsewhere for tests */}
          {!(location?.pathname === '/admin/marketing' || location?.pathname?.startsWith('/admin/marketing')) && (
            <h2 style={{ marginTop: 0, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center' }}>Admin Dashboard</h2>
          )}
          <Outlet />
        </main>
      </div>

      {/* Footer naturally sits at the bottom after content */}
      <MerkatoFooter showSocials={false} />
    </div>
  );
};

export default AdminLayout;