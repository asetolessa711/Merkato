import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './VendorSidebar.module.css';

const VendorSidebar = () => {
  return (
    <div className={styles.sidebar}>
      <h3 className={styles.header}>Vendor Menu</h3>
      <nav className={styles.nav}>
        <NavLink to="/vendor" end className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          Store Overview
        </NavLink>
        <NavLink to="/vendor/products" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          Product Management
        </NavLink>
        <NavLink to="/vendor/orders" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          Order Management
        </NavLink>
        <NavLink to="/vendor/marketing" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          Marketing Tools
        </NavLink>
        <NavLink to="/vendor/customers" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          Customer Interaction
        </NavLink>
        <NavLink to="/vendor/finance" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          Finance & Payouts
        </NavLink>
        <NavLink to="/vendor/store" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          Vendor Store
        </NavLink>
      </nav>
    </div>
  );
};

export default VendorSidebar;
