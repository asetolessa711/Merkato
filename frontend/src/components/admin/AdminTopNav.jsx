import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function AdminTopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [lang, setLang] = useState(() => localStorage.getItem('merkato-lang') || 'en');
  const [currency, setCurrency] = useState(() => localStorage.getItem('merkato-currency') || 'USD');
  const [query, setQuery] = useState(() => {
    try { return localStorage.getItem('admin:last-search-q') || ''; } catch (_) { return ''; }
  });
  const [entity, setEntity] = useState(() => {
    try { return localStorage.getItem('admin:last-search-entity') || 'all'; } catch (_) { return 'all'; }
  });
  const [showAlerts, setShowAlerts] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Admin-centric search entities instead of storefront categories
  const ENTITIES = useMemo(() => [
    { key: 'all', label: 'All entities' },
    { key: 'users', label: 'Users' },
    { key: 'vendors', label: 'Vendors' },
    { key: 'orders', label: 'Orders' },
    { key: 'products', label: 'Products' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'expenses', label: 'Expenses' },
  ], []);

  const onLangChange = (v) => { setLang(v); try { localStorage.setItem('merkato-lang', v); } catch(_){} };
  const onCurrencyChange = (v) => { setCurrency(v); try { localStorage.setItem('merkato-currency', v); } catch(_){} };

  const goDashboard = () => navigate('/admin');
  const isActive = (path) => (location.pathname.startsWith(path) ? { textDecoration: 'underline' } : undefined);

  const runSearch = (e) => {
    e?.preventDefault?.();
    const qp = new URLSearchParams();
    if (query) qp.set('q', query);
    if (entity && entity !== 'all') qp.set('entity', entity);
    // Broadcast lightweight event and navigate to analytics as a catch-all admin search surface
    try { window.dispatchEvent(new CustomEvent('admin:search', { detail: { q: query, entity } })); } catch(_){ }
    try { localStorage.setItem('admin:last-search-q', query); localStorage.setItem('admin:last-search-entity', entity); } catch(_){}
    navigate(`/admin/analytics?${qp.toString()}`);
  };

  // Read basic counts for quick chips
  const counts = useMemo(() => {
    let c = { orders: 0, vendors: 0, system: 0, moderation: 0 };
    try { c = { ...c, ...(JSON.parse(localStorage.getItem('admin-notification-counts')) || {}) }; } catch(_){}
    // allow dedicated keys if present
    try {
      const o = localStorage.getItem('admin:orders:unfulfilled');
      const m = localStorage.getItem('admin:moderation:pending');
      if (o) c.orders = parseInt(o, 10) || c.orders;
      if (m) c.moderation = parseInt(m, 10) || c.moderation;
    } catch(_){}
    return c;
  }, [location.key]);

  const logout = () => {
    try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch(_){}
    navigate('/login');
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000, background: 'var(--nav-bg, var(--header-bg, var(--color-nav)))', color: 'var(--nav-text, var(--header-link, #fff))', borderBottom: '1px solid var(--nav-border, rgba(255,255,255,0.08))' }}>
      {/* primary row */}
  <nav aria-label="Admin top navigation" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '200px auto auto', padding: '6px 10px', gap: 8, alignItems: 'center', minHeight: 56, whiteSpace: 'nowrap' }}>
        {/* Left: brand only */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={goDashboard} title="Merkato Admin" aria-label="Go to Admin" style={{ background: 'transparent', color: 'var(--color-warning, #F4C430)', border: 0, fontWeight: 800, fontSize: 20, cursor: 'pointer', whiteSpace: 'nowrap' }}>Merkato Admin</button>
        </div>

  {/* Middle: entity + search (reduced width) */}
  <form role="search" aria-label="Admin search" onSubmit={runSearch} style={{ width: 'min(420px, 36vw)', display: 'flex', background: 'var(--surface, #ffffff)', border: '1px solid var(--border-subtle, #e5e7eb)', borderRadius: 999, overflow: 'hidden', boxShadow: 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.04))', height: 36 }}>
          <select aria-label="Search entity" value={entity} onChange={(e) => setEntity(e.target.value)} style={{ background: 'var(--surface-muted, #f3f4f6)', color: 'var(--text, #111827)', border: 0, borderRight: '1px solid var(--border-subtle, #e5e7eb)', padding: '0 10px', fontSize: 14 }}>
            {ENTITIES.map((e) => (<option key={`entity-${e.key}`} value={e.key}>{e.label}</option>))}
          </select>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search across admin" style={{ flex: 1, background: 'transparent', color: 'var(--text, #111827)', border: 0, padding: '6px 10px', outline: 'none' }} />
          <button type="submit" style={{ background: 'var(--color-primary)', color: '#fff', border: 0, padding: '0 12px', fontWeight: 700, cursor: 'pointer', outline: 'none' }}>Search</button>
        </form>

        {/* Right: section links + alerts + user menu */}
  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, flexWrap: 'nowrap', overflow: 'hidden' }}>
          {/* Primary section links */}
          <div aria-label="Primary sections" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/admin/vendors" style={{ color: '#e5e7eb', textDecoration: 'none', fontSize: 14, whiteSpace: 'nowrap', fontWeight: 600, ...isActive('/admin/vendors') }}>Vendors</Link>
            <Link to="/admin/orders" style={{ color: '#e5e7eb', textDecoration: 'none', fontSize: 14, whiteSpace: 'nowrap', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, ...isActive('/admin/orders') }}>
              Orders
              {counts.orders > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, padding: '0 6px', fontSize: 12, lineHeight: '16px', minWidth: 18, textAlign: 'center' }}>{counts.orders}</span>}
            </Link>
            <Link to="/admin/review-moderation" style={{ color: '#e5e7eb', textDecoration: 'none', fontSize: 14, whiteSpace: 'nowrap', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, ...isActive('/admin/review-moderation') }}>
              Moderation
              {counts.moderation > 0 && <span style={{ background: '#f59e0b', color: '#111827', borderRadius: 999, padding: '0 6px', fontSize: 12, lineHeight: '16px', minWidth: 18, textAlign: 'center' }}>{counts.moderation}</span>}
            </Link>
          </div>
          {/* Notifications dropdown with categories */}
          <div style={{ position: 'relative' }}>
            <button aria-haspopup="menu" aria-expanded={showAlerts} aria-label="Notifications" title="Notifications" onClick={() => setShowAlerts((v) => !v)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>🔔</button>
            {showAlerts && (
              <div role="menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, width: 260, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                {(() => {
                  let counts = { orders: 0, vendors: 0, system: 0 };
                  try { counts = { ...counts, ...(JSON.parse(localStorage.getItem('admin-notification-counts')) || {}) }; } catch(_){}
                  const rows = [
                    { label: 'Orders', to: '/admin/orders', count: counts.orders },
                    { label: 'Vendors', to: '/admin/vendors', count: counts.vendors },
                    { label: 'System', to: '/admin/analytics', count: counts.system },
                  ];
                  return rows.map(r => (
                    <Link key={r.label} to={r.to} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: '#111827', padding: '6px 8px', borderRadius: 8 }}>
                      <span>{r.label}</span>
                      <span style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: 999, padding: '2px 8px', fontSize: 12, minWidth: 24, textAlign: 'center' }}>{r.count}</span>
                    </Link>
                  ));
                })()}
              </div>
            )}
          </div>

          {/* Separate language and currency controls */}
          <select aria-label="Language" value={lang} onChange={(e) => onLangChange(e.target.value)} style={{ background: 'rgba(0,0,0,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 8px', fontSize: 13, width: 80 }}>
            <option value="en">EN</option>
            <option value="am">AM</option>
            <option value="or">OR</option>
          </select>
          <select aria-label="Currency" value={currency} onChange={(e) => onCurrencyChange(e.target.value)} style={{ background: 'rgba(0,0,0,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 8px', fontSize: 13, width: 96 }}>
            <option value="USD">USD</option>
            <option value="ETB">ETB</option>
            <option value="EUR">EUR</option>
          </select>

          {/* User menu (logout only) */}
          <div style={{ position: 'relative' }}>
            <button aria-haspopup="menu" aria-expanded={showUserMenu} onClick={() => setShowUserMenu((v) => !v)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>👤</button>
            {showUserMenu && (
              <div role="menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, width: 220, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  <button onClick={logout} style={{ marginTop: 6, background: 'var(--color-danger, #ef4444)', color: '#fff', border: 0, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Logout</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

  {/* breadcrumb row removed per UX direction */}

  {/* notifications popover handled in-cluster */}
    </div>
  );
}

export default React.memo(AdminTopNav);
