import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const LABELS = {
  admin: 'Admin Panel',
  dashboard: 'Overview',
  users: 'Users',
  vendors: 'Vendors',
  orders: 'Orders',
  invoices: 'Invoices',
  expenses: 'Expenses',
  analytics: 'System Tools',
  'review-moderation': 'Moderation',
  moderation: 'Moderation',
  trust: 'Trust',
  theme: 'Theme',
  access: 'Access Control',
  docs: 'Documentation',
  support: 'Help & Support',
  'mega-promos': 'Promo Mega Menu',
  microbanner: 'Microbanner',
  'promo-codes': 'Comms',
};

export default function AdminBreadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  const crumbs = [];
  let acc = '';
  for (let i = 0; i < parts.length; i++) {
    acc += '/' + parts[i];
    const key = parts[i];
    const label = LABELS[key] || key.replaceAll('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
    crumbs.push({ to: acc, label });
  }

  // Hide lone "Admin" breadcrumb on /admin root
  if (crumbs.length === 0) return null;
  if (crumbs.length === 1 && crumbs[0].to === '/admin') return null;

  return (
    <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', margin: '0 0 8px 0' }}>
      <ol style={{ listStyle: 'none', display: 'flex', gap: 8, padding: 0, margin: 0, alignItems: 'center', flexWrap: 'wrap' }}>
        {crumbs.map((c, idx) => (
          <li key={c.to}>
            {idx < crumbs.length - 1 ? (
              <>
                <Link to={c.to} style={{ textDecoration: 'none', color: 'inherit' }}>{c.label}</Link>
                <span style={{ margin: '0 6px' }}>/</span>
              </>
            ) : (
              <span aria-current="page" style={{ color: 'var(--text, #111827)', fontWeight: 600 }}>{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
