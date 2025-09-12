
import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import TemuNavbar from '../components/TemuNavbar';
import AdminSidebar from './AdminSidebar';
import MerkatoFooter from '../components/MerkatoFooter';
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

  {/* Fixed Top Navigation */}
  <TemuNavbar role="admin" showCategories={false} />

      {/* Main Content Area with Sidebar and Scrollable Main */}
  <div className={styles.mainContent} style={{ marginTop: 120, flex: 1 }}>
        <AdminSidebar />
        <main className={styles.contentArea}>
          {/* Admin Role Notice */}
          {adminNotice}
          {/* Heading for Admin Dashboard (deduplicated, only here) */}
          <h2 style={{ marginTop: 0, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center' }}>Admin Dashboard</h2>
          <Outlet />
        </main>
      </div>

      {/* Fixed Footer */}
      <div style={{ position: 'fixed', left: 0, bottom: 0, width: '100%', zIndex: 1000 }}>
        <MerkatoFooter showSocials={false} />
      </div>
    </div>
  );
};

export default AdminLayout;