
import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import AdminTopNav from './admin/AdminTopNav';
import AdminSidebar from './AdminSidebar';
import MerkatoFooter from '../components/MerkatoFooter';
import AdminBreadcrumbs from './admin/AdminBreadcrumbs';
import styles from '../layouts/AdminLayout.module.css';

const AdminLayout = ({ user }) => {
  const navigate = useNavigate();

  // Log when AdminLayout loads and show user info
  console.log("🛠 AdminLayout loaded for user:", user);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Role-based admin controls example
  let adminNotice = null;
  if (user?.roles?.includes("global_admin")) {
    adminNotice = (
      <div style={{ color: '#0984e3', fontWeight: 'bold', marginBottom: 10 }}>
        🌍 Global Admin: You have access to all global controls.
      </div>
    );
  } else if (user?.roles?.includes("country_admin")) {
    adminNotice = (
      <div style={{ color: '#e67e22', fontWeight: 'bold', marginBottom: 10 }}>
        🌎 Country Admin: You are limited to your country’s dashboard.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Show warning if no user */}
      {!user && <p style={{ padding: '20px', color: 'red' }}>⚠️ No user found.</p>}

  {/* Fixed Admin Top Navigation */}
  <AdminTopNav />

      {/* Main Content Area with Sidebar and Scrollable Main */}
  <div className={styles.mainContent} style={{ marginTop: 56, paddingBottom: 88, display: 'grid', gridTemplateColumns: '280px 1fr', height: 'calc(100vh - 56px - 80px)', overflow: 'hidden' }}>
        <AdminSidebar />
        <main className={styles.contentArea} style={{ padding: '16px 20px', overflowY: 'auto' }}>
          {/* Admin Role Notice */}
          {adminNotice}
          <AdminBreadcrumbs />
          <Outlet />
        </main>
      </div>

      {/* Fixed Footer */}
      <div style={{ position: 'fixed', left: 0, bottom: 0, width: '100%', zIndex: 1000 }}>
        <MerkatoFooter role="admin" showSocials={false} />
      </div>
    </div>
  );
};

export default AdminLayout;