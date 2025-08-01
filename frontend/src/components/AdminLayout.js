import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'Poppins, sans-serif' }}>
      {/* Show warning if no user */}
      {!user && <p style={{ padding: '20px', color: 'red' }}>⚠️ No user found.</p>}

      {/* Top Navigation with Logo */}
      <div style={{
        backgroundColor: '#f0f0f0',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #ccc'
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

      {/* Admin Role Notice */}
      {adminNotice}

      {/* Admin Layout: Sidebar + Main */}
      <div style={{ display: 'flex', flex: 1 }}>
        <AdminSidebar />
        <main style={{ flex: 1, padding: '20px' }}>
          <Outlet />  {/* ✅ This renders all nested child routes */}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;