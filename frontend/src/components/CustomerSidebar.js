import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '../config/routes';
import styles from './CustomerSidebar.module.css';

function CustomerSidebar({ user }) {
  const links = [
    { to: ROUTES.accountDashboard, label: 'Dashboard', icon: '🏠' },
    { to: ROUTES.accountOrders, label: 'My Orders', icon: '📦' },
    { to: ROUTES.accountWallet, label: 'Wallet', icon: '💰' },
    { to: ROUTES.accountRewards, label: 'Rewards', icon: '🎯' },
    { to: ROUTES.accountNotifications, label: 'Notifications', icon: '🔔' },
    { to: ROUTES.accountAddresses, label: 'Addresses', icon: '📍' },
    { to: ROUTES.accountInbox, label: 'Inbox', icon: '💬' },
    { to: ROUTES.editProfile, label: 'Profile', icon: '👤' },
  ];

  return (
    <aside role="navigation" className={styles.sidebar}>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.icon} aria-hidden="true">{l.icon}</span>
          <span>{l.label}</span>
        </NavLink>
      ))}

      <a href={ROUTES.support} className={styles.supportCta}>
        <span aria-hidden="true">🎯</span>
        <span>Get Support</span>
      </a>
    </aside>
  );
}

CustomerSidebar.propTypes = {
  user: PropTypes.object
};

export default CustomerSidebar;
