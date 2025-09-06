
import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
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

      {/* Fixed Top Navigation with Logo */}
      <div style={{
        backgroundColor: '#f0f0f0',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #ccc',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link to="/" style={{ textDecoration: 'none', fontSize: '1.6rem', fontWeight: 'bold' }}>
            <span style={{ color: '#00B894' }}>M</span>
            <span style={{ color: '#3498DB' }}>e</span>
            <span style={{ color: '#E67E22' }}>r</span>
            <span style={{ color: '#9B59B6' }}>k</span>
            <span style={{ color: '#E74C3C' }}>a</span>
            <span style={{ color: '#3498DB' }}>t</span>
            <span style={{ color: '#00B894' }}>o</span>
          </Link>
          <nav style={{ display: 'flex', gap: '16px', fontWeight: 'bold' }}>
            <Link to="/shop" style={{ color: '#0984e3', textDecoration: 'none' }}>🛍 Shop</Link>
            <Link to="/vendor" style={{ color: '#0984e3', textDecoration: 'none' }}>🧑‍💼 Vendor Panel</Link>
            <Link to="/account" style={{ color: '#0984e3', textDecoration: 'none' }}>👤 Customer Panel</Link>
          </nav>
        </div>
        <button 
          onClick={handleLogout} 
          style={{ 
            border: 'none', 
            background: 'none', 
            color: '#e74c3c', 
            fontWeight: 'bold', 
            cursor: 'pointer' 
          }}
        >
          🚪 Logout
        </button>
      </div>

      {/* Main Content Area with Sidebar and Scrollable Main */}
      <div className={styles.mainContent} style={{ marginTop: 60, flex: 1 }}>
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