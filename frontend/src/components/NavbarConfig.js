// src/components/NavbarConfig.js
// Central config for universal and role-specific navbar links

export const universalLinks = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/vendors', label: 'Vendors' },
  { to: '/customers', label: 'Customers' },
  { to: '/categories', label: 'Categories', dropdown: true },
  { to: '/cart', label: 'Cart', icon: '🛒' },
];

export const roleLinks = {
  customer: [
    {
      label: 'My Account',
      dropdown: true,
      items: [
        { to: '/account/orders', label: 'My Orders' },
        { to: '/messages', label: 'Messages' },
        { to: '/account/wallet', label: 'Wallet' },
        { to: '/account/saved', label: 'Saved Items' },
        { to: '/account/profile', label: 'Update Profile' },
        { to: '/account/address', label: 'Address Book' },
        { to: '/logout', label: 'Logout', isLogout: true },
      ]
    },
  ],
  vendor: [
    {
      label: 'Vendor Account',
      dropdown: true,
      items: [
        { to: '/vendor/dashboard', label: 'Dashboard' },
        { to: '/vendor/store', label: 'My Store' },
        { to: '/vendor/orders', label: 'Orders' },
        { to: '/messages', label: 'Messages' },
        { to: '/vendor/wallet', label: 'Wallet' },
        { to: '/vendor/profile', label: 'Update Profile' },
        { to: '/vendor/address', label: 'Address Book' },
        { to: '/logout', label: 'Logout', isLogout: true },
      ]
    },
  ],
  admin: [
    {
      label: 'Admin Account',
      dropdown: true,
      items: [
        { to: '/admin', label: 'Admin Panel' },
        { to: '/admin/reports', label: 'Reports' },
        { to: '/admin/moderation', label: 'Moderation' },
        { to: '/admin/settings', label: 'Settings' },
        { to: '/admin/profile', label: 'Update Profile' },
        { to: '/admin/address', label: 'Address Book' },
        { to: '/logout', label: 'Logout', isLogout: true },
      ]
    },
  ],
};

export const authLinks = [
  { to: '/register', label: 'Register', icon: '📝' },
  { to: '/login', label: 'Login', icon: '🔑' },
];
