import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const AdminSidebar = () => {
  const location = useLocation();
  const path = location.pathname || '';

  const CATS = useMemo(() => ([
    { key: 'overview', label: 'Overview', items: [
      { to: '/admin/dashboard#metrics', label: "Today's Metrics" },
      { to: '/admin/dashboard#quick-actions', label: 'Quick Actions' },
      { to: '/admin/dashboard#system-status', label: 'System Status' },
    ] },
    { key: 'commerce', label: 'Commerce', items: [
      { to: '/admin/orders', label: 'Orders' },
      { to: '/admin/invoices/report', label: 'Invoices' },
      { to: '/admin/analytics?view=products', label: 'Product Performance' },
    ] },
    { key: 'vendors', label: 'Vendors', items: [
      { to: '/admin/vendors', label: 'Vendor Center' },
      { to: '/admin/vendors?filter=pending', label: 'Pending Approvals' },
      { to: '/admin/vendors/leads', label: 'Leads' },
      { to: '/admin/feedback', label: 'Vendor Feedback' },
    ] },
    { key: 'promos', label: 'Promotions', items: [
      { to: '/admin/mega-promos', label: 'Promo Mega Menu' },
      { to: '/admin/microbanner', label: 'Microbanner Manager' },
      { to: '/admin/promo-codes', label: 'Comms' },
    ] },
    { key: 'governance', label: 'Governance', items: [
      { to: '/admin/review-moderation', label: 'Moderation' },
      { to: '/admin/trust', label: 'Trust Tickets' },
      { to: '/admin/analytics?view=audit', label: 'Audit Logs' },
    ] },
    { key: 'financial', label: 'Financial', items: [
      { to: '/admin/analytics?view=revenue', label: 'Revenue Reports' },
      { to: '/admin/invoices', label: 'Invoice Tracker' },
      { to: '/admin/expenses', label: 'Budget Planning' },
    ] },
  { key: 'settings', label: 'Settings', items: [
      { to: '/admin/theme', label: 'Theme Manager' },
      { to: '/admin/access', label: 'Access Control' },
      { to: '/admin/docs', label: 'Documentation' },
      { to: '/admin/support', label: 'Help & Support' },
    ] },
  ]), []);

  // Role-based filtering (Overview always, Settings always for admin types)
  const filteredCATS = useMemo(() => {
    let roles = [];
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      roles = Array.isArray(u?.roles) ? u.roles : (u?.role ? [u.role] : []);
    } catch (_) {}

    const isAdmin = roles.includes('global_admin') || roles.includes('admin') || roles.includes('country_admin');
    const isVendorMgr = roles.includes('vendor_manager');
    const isFinanceAdmin = roles.includes('finance_admin');

    if (isAdmin) return CATS; // full access

    const allowKeys = new Set(['overview']);
    if (isVendorMgr) { allowKeys.add('vendors'); allowKeys.add('commerce'); }
    if (isFinanceAdmin) { allowKeys.add('financial'); allowKeys.add('governance'); }
    // Always keep settings if any special role detected
    if (isVendorMgr || isFinanceAdmin) allowKeys.add('settings');

    return CATS.filter(c => allowKeys.has(c.key));
  }, [CATS]);

  const computeByPath = (p) => {
    // Map dashboard (overview) and subpaths to relevant categories
    if (/^\/admin\/dashboard(\b|\/|#)/.test(p)) return 'overview';
    if (/\/admin\/(orders|invoices|analytics\?view=products|product-performance)/.test(p)) return 'commerce';
  if (/\/admin\/(vendors|vendors\/leads)/.test(p)) return 'vendors';
    if (/\/admin\/(feedback)/.test(p)) return 'vendors';
    if (/\/admin\/(review-moderation|trust|analytics)/.test(p)) return 'governance';
    if (/\/admin\/(invoices|expenses)/.test(p)) return 'financial';
    if (/\/admin\/(mega-promos|microbanner|promo-codes)/.test(p)) return 'promos';
    if (/\/admin\/(theme|access|docs|support)/.test(p)) return 'settings';
    return 'overview';
  };

  const [active, setActive] = useState(() => {
    try { return localStorage.getItem('admin-sidebar:active') || computeByPath(path); } catch (_) { return computeByPath(path); }
  });
  useEffect(() => {
    const byPath = computeByPath(path);
    if (byPath && byPath !== active) setActive(byPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const setActivePersist = (k) => {
    setActive(k);
    try { localStorage.setItem('admin-sidebar:active', k); } catch (_) {}
  };

  const catBtnStyle = {
    display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8,
    background: 'transparent', border: 0, cursor: 'pointer', fontFamily: 'var(--font-heading, var(--font-body, Poppins, sans-serif))',
    fontWeight: 800, fontSize: 13, color: 'var(--text, #111827)'
  };
  const catBtnActive = { ...catBtnStyle, background: 'var(--surface-muted, #f3f4f6)', boxShadow: 'inset 2px 0 0 var(--color-primary)', borderLeft: '3px solid var(--color-primary)' };

  const linkStyle = {
    display: 'block', padding: '6px 10px', textDecoration: 'none', color: 'var(--text-muted, #374151)', borderRadius: '6px', fontWeight: 600,
    fontFamily: 'var(--font-body, Poppins, sans-serif)', fontSize: 13
  };
  const activeStyle = { ...linkStyle, backgroundColor: 'var(--surface-muted, #f3f4f6)', boxShadow: 'inset 2px 0 0 var(--color-primary)', color: 'var(--text, #111827)' };

  const onCatKey = (e) => {
    const idx = CATS.findIndex((c) => c.key === active);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const ni = (idx + 1) % CATS.length; setActivePersist(CATS[ni].key);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const pi = (idx - 1 + CATS.length) % CATS.length; setActivePersist(CATS[pi].key);
    }
  };

  const current = (filteredCATS.find((c) => c.key === active) || filteredCATS[0] || CATS[0]);

  return (
  <aside style={{ width: 280, padding: 12, background: 'var(--surface, #ffffff)', borderRight: '1px solid var(--border-subtle, #e5e7eb)', minHeight: '100vh', position: 'sticky', top: 56, fontFamily: 'var(--font-body, Poppins, sans-serif)' }}>
  <h3 style={{ margin: '2px 0 8px 0', color: 'var(--text, #111827)', fontFamily: 'var(--font-heading, var(--font-body, Poppins, sans-serif))', fontSize: 14, fontWeight: 800 }}>Admin Panel</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'start', gap: 8 }}>
        <nav aria-label="Admin sections" role="tablist" onKeyDown={onCatKey}>
          {filteredCATS.map((c) => (
            <button key={c.key} id={`cat-${c.key}`} role="tab" aria-selected={active === c.key} onClick={() => setActivePersist(c.key)} style={active === c.key ? catBtnActive : catBtnStyle}>
              {c.label}
            </button>
          ))}
        </nav>
        <div role="tabpanel" aria-labelledby={`cat-${current.key}`}>
          {current.items.map((it) => (
            <NavLink key={it.to} to={it.to} style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>{it.label}</NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
