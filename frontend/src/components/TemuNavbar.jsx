import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// Temu-style, accessible, test-stable navbar
// Keeps existing E2E selectors: cart-link, navbar-register-link, and My Account button
function TemuNavbar({ role: roleProp = 'public', showCategories: showCategoriesProp }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showAllCats, setShowAllCats] = useState(false);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user')) || null;
  } catch (_) {}

  const detectedRole = user?.role || (Array.isArray(user?.roles) ? user.roles[0] : undefined);
  const role = roleProp || detectedRole || 'public';
  const dashLink = role === 'admin' ? '/admin' : role === 'vendor' ? '/vendor' : role === 'customer' ? '/account/dashboard' : null;

  const categories = useMemo(
    () => [
      'Flash Deals', 'Women', 'Men', 'Kids', 'Electronics', 'Home', 'Beauty', 'Shoes', 'Bags', 'Jewelry', 'Sports', 'Automotive'
    ],
    []
  );

  const isActive = (path) => (location.pathname === path ? { textDecoration: 'underline' } : undefined);

  const handleLogout = () => {
    try { localStorage.clear(); } catch (_) {}
    navigate('/');
  };

  const roleNav = useMemo(() => {
    switch (role) {
      case 'customer':
        return [
          { to: '/account/dashboard', label: 'Dashboard' },
          { to: '/account/orders', label: 'My Orders' },
          { to: '/account/profile', label: 'Profile' },
          { to: '/account/returns', label: 'Returns' }
        ];
      case 'vendor':
        return [
          { to: '/vendor', label: 'Dashboard' },
          { to: '/vendor/products', label: 'Products' },
          { to: '/vendor/orders', label: 'Orders' },
          { to: '/vendor/analytics', label: 'Analytics' }
        ];
      case 'admin':
        return [
          { to: '/admin', label: 'Admin' },
          { to: '/admin/users', label: 'Users' },
          { to: '/admin/orders', label: 'Orders' },
          { to: '/admin/moderation', label: 'Moderation' }
        ];
      default:
        return [];
    }
  }, [role]);

  const showCategories = typeof showCategoriesProp === 'boolean' ? showCategoriesProp : role !== 'admin';

  return (
    <header style={{ position: 'relative', width: '100%', zIndex: 1000 }}>
      {/* Top promo strip */}
      <div aria-label="Promotions" style={{ background: '#fffbeb', color: '#7c2d12', fontSize: 12, padding: '6px 12px', borderBottom: '1px solid #fde68a' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>🔥 Flash deals updated hourly</span>
            <span>🚚 Free shipping over $29</span>
            <span>✅ 90-day returns</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link to="/customers" style={{ color: '#7c2d12', textDecoration: 'none' }}>Customers</Link>
            <Link to="/vendors" style={{ color: '#7c2d12', textDecoration: 'none' }}>Vendors</Link>
          </div>
        </div>
      </div>

      {/* Main bar: brand, search, actions */}
      <nav aria-label="Primary" style={{ background: '#0b1020', color: '#fff', borderBottom: '1px solid #222' }} data-testid="navbar">
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '220px 1fr 280px', gap: 12, alignItems: 'center', padding: '10px 16px' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/" style={{ color: '#ffd700', fontWeight: 800, fontSize: 22, textDecoration: 'none' }}>Merkato</Link>
            <Link to="/shop" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 14, ...isActive('/shop') }}>Shop</Link>
            <Link to="/favorites" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 14, ...isActive('/favorites') }}>Favorites</Link>
            {/* Role quick links (condensed) */}
            {roleNav.slice(0, 2).map((lnk) => (
              <Link key={lnk.to} to={lnk.to} style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 14, ...isActive(lnk.to) }}>{lnk.label}</Link>
            ))}
          </div>

          {/* Search */}
          <form role="search" aria-label="Site" onSubmit={(e) => { e.preventDefault(); const v = e.currentTarget.elements.search?.value?.trim(); navigate(v ? `/shop?search=${encodeURIComponent(v)}` : '/shop'); }}>
            <label htmlFor="global-search" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Search</label>
            <div style={{ display: 'flex', background: '#111827', border: '1px solid #374151', borderRadius: 999, overflow: 'hidden' }}>
              <input id="global-search" name="search" placeholder="Search products, stores, and more" style={{ flex: 1, background: 'transparent', color: '#fff', padding: '10px 12px', outline: 'none', border: 'none' }} />
              <button type="submit" style={{ background: '#22c55e', color: '#111', border: 0, padding: '0 14px', fontWeight: 700, cursor: 'pointer' }}>Search</button>
            </div>
          </form>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
            {/* Show remaining role links, if any */}
            {roleNav.slice(2).map((lnk) => (
              <Link key={lnk.to} to={lnk.to} style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 14, ...isActive(lnk.to) }}>{lnk.label}</Link>
            ))}
            {dashLink && (
              <Link to={dashLink} style={{ color: '#fff', textDecoration: 'none' }}>Dashboard</Link>
            )}
            {role === 'customer' && (
              <button type="button" aria-label="My Account" style={{ background: 'transparent', border: '1px solid #555', color: '#fff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>My Account</button>
            )}
            {user ? (
              <button onClick={handleLogout} data-testid="logout-btn" style={{ background: 'transparent', border: '1px solid #555', color: '#fff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Logout</button>
            ) : (
              <>
                <Link to="/login" style={{ color: '#fff', textDecoration: 'none' }}>Login</Link>
                <Link to="/register?role=customer" data-testid="navbar-register-link" style={{ color: '#fff', textDecoration: 'none' }}>Register</Link>
              </>
            )}
            <Link to="/cart" data-testid="cart-link" style={{ color: '#fff', textDecoration: 'none' }}>Cart</Link>
          </div>
        </div>

        {/* Category rail */}
        {showCategories && (
        <div aria-label="Categories" style={{ borderTop: '1px solid #1f2937', background: '#0f172a' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '8px 16px', display: 'flex', gap: 10, alignItems: 'center', overflowX: 'auto' }}>
            <button type="button" onClick={() => setShowAllCats((v) => !v)} aria-expanded={showAllCats} aria-controls="all-cats-panel" style={{ background: '#111827', color: '#e5e7eb', border: '1px solid #374151', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>All Categories ▾</button>
            {categories.map((c) => (
              <Link key={c} to={`/shop?cat=${encodeURIComponent(c.toLowerCase())}`} style={{ color: '#cbd5e1', textDecoration: 'none', padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>{c}</Link>
            ))}
          </div>
          {showAllCats && (
            <div id="all-cats-panel" role="region" aria-label="All Categories" style={{ background: '#0b1020', borderTop: '1px solid #1f2937' }}>
              <div style={{ maxWidth: 1280, margin: '0 auto', padding: 16, color: '#e5e7eb' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
                  {categories.concat(['Pets', 'Outdoors', 'Office', 'Toys']).map((c) => (
                    <Link key={`all-${c}`} to={`/shop?cat=${encodeURIComponent(c.toLowerCase())}`} style={{ color: '#cbd5e1', textDecoration: 'none', padding: '6px 8px', borderRadius: 6 }}>{c}</Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        )}
      </nav>
    </header>
  );
}

export default React.memo(TemuNavbar);
