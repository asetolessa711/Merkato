import React from 'react';
import { NavLink } from 'react-router-dom';
import ROUTES, { buildRoute } from '../config/routes'';
import styles from './VendorSidebar.module.css';

const VendorSidebar = ({ user }) => {
  const vendorId = user && (user._id || user.id || user.vendorId);
  return (
    <div className={styles.sidebar}>
      <h3 className={styles.header}>Vendor Menu</h3>
      <nav className={styles.nav}>
        <NavLink to={ROUTES.vendor} end className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          Store Overview
        </NavLink>
        <NavLink to={ROUTES.vendorProducts} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          Product Management
        </NavLink>
        <NavLink to={ROUTES.vendorOrders} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          Order Management
        </NavLink>
        <NavLink to={ROUTES.vendorMarketing} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          Marketing Tools
        </NavLink>
        <NavLink to={ROUTES.vendorInbox} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          Customer Interaction
        </NavLink>
        <NavLink to={ROUTES.vendorInvoices} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          Finance & Payouts
        </NavLink>
        {vendorId && (
          <NavLink to={buildRoute.vendorStore(vendorId)} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            Vendor Store
          </NavLink>
        )}
      </nav>
    </div>
  );
};

export default VendorSidebar;
