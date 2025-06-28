import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

function CustomerSidebar({ user }) {
  const location = useLocation();

  const menuItems = [
    { path: '/account', icon: '👤', label: 'Dashboard' },
    { path: '/account/orders', icon: '📦', label: 'My Orders' },
    { path: '/favorites', icon: '❤️', label: 'Wishlist' },
    { path: '/account/inbox', icon: '💬', label: 'Messages' },
    { path: '/customer/addresses', icon: '📍', label: 'Addresses' },
    { path: '/account/guide', icon: '📖', label: 'Guide' }
  ];

  return (
    <aside
      role="navigation"
      style={{
        width: '240px',
        backgroundColor: 'white',
        padding: '20px 0',
        borderRight: '1px solid #eee',
        minHeight: '100vh',
        boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 1
      }}
    >
      {menuItems.map(item => {
        const isActive = location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 24px',
              textDecoration: 'none',
              color: isActive ? '#00b894' : '#4a5568',
              backgroundColor: isActive ? '#f0f9ff' : 'transparent',
              fontSize: '0.95rem',
              gap: '12px',
              fontWeight: isActive ? '600' : '400',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f9ff';
              e.currentTarget.style.color = '#00b894';
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#4a5568';
              }
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}

      {/* Support CTA */}
      <Link
        to="/support"
        style={{
          display: 'flex',
          alignItems: 'center',
          margin: '20px 24px',
          padding: '12px',
          textDecoration: 'none',
          color: 'white',
          backgroundColor: '#00b894',
          borderRadius: '8px',
          fontSize: '0.95rem',
          gap: '8px',
          justifyContent: 'center',
          transition: 'background-color 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#00a383'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00b894'}
      >
        <span>🎯</span>
        <span>Get Support</span>
      </Link>
    </aside>
  );
}

CustomerSidebar.propTypes = {
  user: PropTypes.object
};

export default CustomerSidebar;
