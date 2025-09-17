import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import MEGA_MENU from '../config/megaMenu';

// Merkato-style, accessible, test-stable navbar (renamed from TemuNavbar)
// Keeps existing E2E selectors: cart-link, navbar-register-link, and My Account button
function MerkatoNavbar({ role: roleProp = 'public', showCategories: showCategoriesProp }) {
  const location = useLocation();
  const navigate = useNavigate();
  // removed legacy All Categories panel to avoid duplication with mega menu
  const [searchCat, setSearchCat] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [showSuggest, setShowSuggest] = useState(false);
  const [recent, setRecent] = useState([]);
  const suggestRef = useRef(null);
  const [showMega, setShowMega] = useState(false);
  const [activeMegaIdx, setActiveMegaIdx] = useState(0);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showCatDrawer, setShowCatDrawer] = useState(false);
  const megaPanelRef = useRef(null);
  const megaTriggerRef = useRef(null);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user')) || null;
  } catch (_) {}

  const detectedRole = user?.role || (Array.isArray(user?.roles) ? user.roles[0] : undefined);
  const role = roleProp || detectedRole || 'public';
  const isVendor = role === 'vendor';
  const dashLink = role === 'admin' ? '/admin/dashboard' : role === 'vendor' ? '/vendor' : role === 'customer' ? '/account/dashboard' : null;

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
        // Minimal vendor links to reduce clutter on dashboard
        return [
          { to: '/vendor', label: 'Dashboard' },
          { to: '/vendor/products', label: 'Products' },
          { to: '/vendor/orders', label: 'Orders' }
        ];
      case 'admin':
        return [
          { to: '/admin/dashboard', label: 'Admin' },
          { to: '/admin/users', label: 'Users' },
          { to: '/admin/orders', label: 'Orders' },
          { to: '/admin/review-moderation', label: 'Moderation' }
        ];
      default:
        return [];
    }
  }, [role]);

  // const showCategories = typeof showCategoriesProp === 'boolean' ? showCategoriesProp : role !== 'admin';

  // Persisted selectors
  const [lang, setLang] = useState(() => localStorage.getItem('merkato-lang') || 'en');
  const [currency, setCurrency] = useState(() => localStorage.getItem('merkato-currency') || 'USD');

  const onLangChange = (v) => { setLang(v); try { localStorage.setItem('merkato-lang', v); } catch(_){} };
  const onCurrencyChange = (v) => { setCurrency(v); try { localStorage.setItem('merkato-currency', v); } catch(_){} };

  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem('merkato-recent-searches') || '[]');
      if (Array.isArray(r)) setRecent(r.slice(0, 6));
    } catch (_) {}
  }, []);

  const addRecent = (q) => {
    if (!q) return;
    try {
      const now = Date.now();
      const next = [{ q, t: now }].concat(recent.filter((x) => x.q !== q)).slice(0, 6);
      setRecent(next);
      localStorage.setItem('merkato-recent-searches', JSON.stringify(next));
    } catch (_) {}
  };

  // Admin/CMS override: allow MEGA_MENU to be replaced via localStorage JSON
  const [menuVersion, setMenuVersion] = useState(0);
  useEffect(() => {
    const onStorage = (e) => {
      if (e && e.key && e.key !== 'merkato-mega-menu') return;
      setMenuVersion((v) => v + 1);
    };
    const onCustom = () => setMenuVersion((v) => v + 1);
    window.addEventListener('storage', onStorage);
    window.addEventListener('mega-menu:updated', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('mega-menu:updated', onCustom);
    };
  }, []);

  const effectiveMegaMenu = useMemo(() => {
    const normalizeCols = (arr) => (Array.isArray(arr) ? arr : []);
    const mergeWithDefault = (overrideArr) => {
      const base = MEGA_MENU;
      const ov = normalizeCols(overrideArr);
      const merged = base.map((defCol, i) => {
        const o = ov[i] || {};
        const oLinks = Array.isArray(o.links) ? o.links : [];
        const links = oLinks.length ? oLinks : defCol.links;
        return {
          title: (o.title ?? defCol.title) || defCol.title,
          icon: o.icon ?? defCol.icon,
          thumb: o.thumb ?? defCol.thumb,
          links,
        };
      });
      // Append any extra override columns beyond defaults
      if (ov.length > base.length) {
        for (let j = base.length; j < ov.length; j++) {
          const extra = ov[j];
          merged.push({
            title: extra?.title ?? '',
            icon: extra?.icon,
            thumb: extra?.thumb,
            links: Array.isArray(extra?.links) ? extra.links : [],
          });
        }
      }
      // If all columns somehow have empty links, fallback entirely to base
      const anyLinks = merged.some((c) => Array.isArray(c.links) && c.links.length > 0);
      return anyLinks ? merged : base;
    };
    try {
      const raw = localStorage.getItem('merkato-mega-menu');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return mergeWithDefault(parsed);
      }
    } catch (_) {}
    return MEGA_MENU;
  }, []);

  // Desktop mega panel: close on ESC/outside, basic focus trap
  useEffect(() => {
    if (!showMega) return;
    // reset active tab on open
    setActiveMegaIdx(0);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowMega(false);
        setTimeout(() => megaTriggerRef.current?.focus(), 0);
      } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && megaPanelRef.current) {
        const tabs = megaPanelRef.current.querySelectorAll('[role="tab"]');
        if (!tabs.length) return;
        e.preventDefault();
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        setActiveMegaIdx((curr) => {
          const next = (curr + dir + tabs.length) % tabs.length;
          setTimeout(() => tabs[next]?.focus(), 0);
          return next;
        });
      } else if (e.key === 'Tab' && megaPanelRef.current) {
        const focusables = megaPanelRef.current.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const onClick = (e) => {
      if (!megaPanelRef.current) return;
      if (!megaPanelRef.current.contains(e.target) && !megaTriggerRef.current?.contains(e.target)) {
        setShowMega(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [showMega]);

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, width: '100%', zIndex: 10000, background: 'var(--header-bg, var(--color-nav))', isolation: 'isolate' }}>
      <style>{`
  a[data-navlink]:hover { text-decoration: underline; color: var(--header-hover, var(--color-primary)); }
        a[data-catlink]:hover { background: rgba(255,255,255,0.10); border-radius: 6px; }
  .suggest-panel { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px; z-index: 4000; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
  .suggest-item { display: block; width: 100%; text-align: left; background: transparent; border: 0; color: #111827; padding: 8px 10px; border-radius: 6px; cursor: pointer; }
  .suggest-item:hover { background: #f9fafb; }
        /* Responsive helpers */
        .desktop-only { display: block; }
        .mobile-only { display: none; }
        @media (max-width: 900px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: flex !important; }
        }
        /* Mobile drawer */
  .drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 11000; }
        .drawer { position: fixed; top: 0; left: 0; width: 82vw; max-width: 360px; height: 100vh; background: #1f2236; color: #fff; z-index: 11001; box-shadow: 2px 0 16px rgba(0,0,0,0.4); display: flex; flex-direction: column; }
        .drawer header { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.12); display: flex; justify-content: space-between; align-items: center; }
        .drawer section { padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .drawer a, .drawer button { color: #fff; text-decoration: none; background: transparent; border: 0; padding: 8px 0; text-align: left; width: 100%; }
        .drawer a:hover, .drawer button:hover { color: var(--color-primary); }
        /* Mega menu */
        .mega-wrapper { position: relative; }
  .mega-panel { position: absolute; left: 16px; right: 16px; top: 100%; background: var(--header-dropdown-bg, #1f2236); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 14px; color: #fff; box-shadow: 0 12px 24px rgba(0,0,0,0.25); z-index: 5000; }
        .mega-panel-full { left: 0; right: 0; border-radius: 0 0 12px 12px; }
  /* Layered mega menu */
  .mega-layered { display: grid; grid-template-columns: 260px 1fr; gap: 12px; min-height: 290px; }
  .mega-left { border-right: 1px solid rgba(255,255,255,0.12); padding-right: 8px; display: flex; flex-direction: column; }
  .mega-tab { display: flex; align-items: center; gap: 8px; background: transparent; color: #e5e7eb; border: 0; text-align: left; padding: 8px 10px; border-radius: 8px; cursor: pointer; font-size: 14px; }
  .mega-tab[aria-selected="true"] { background: rgba(255,255,255,0.08); color: #fff; }
  .mega-right { padding-left: 4px; }
  .mega-right h4 { margin: 0 0 8px 0; font-size: 14px; color: #cbd5e1; }
  .mega-links { display: flex; flex-direction: column; gap: 6px; max-height: 360px; overflow-y: auto; padding-right: 6px; margin: 0; padding-left: 0; list-style: none; }
  .mega-link { display: block; padding: 6px 8px; border-radius: 8px; color: #cbd5e1; text-decoration: none; font-size: 14px; }
  .mega-link:hover { background: rgba(255,255,255,0.08); color: #fff; }
      `}</style>
    {/* Top promo strip (hidden for vendor role) */}
    {!isVendor && (
  <div aria-label="Promotions" style={{ background: 'var(--color-warning)', color: '#2C2E43', fontWeight: 600, fontSize: 12, padding: '6px 12px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>🔥 Flash deals updated hourly</span>
            <span>🚚 Free shipping over $29</span>
            <span>✅ 90-day returns</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
      <Link to="/customers" style={{ color: '#2C2E43', textDecoration: 'none', fontWeight: 700 }}>Customers</Link>
      <Link to="/vendors" style={{ color: '#2C2E43', textDecoration: 'none', fontWeight: 700 }}>Vendors</Link>
          </div>
        </div>
      </div>
    )}

  {/* Main bar: brand, search, actions (solid background) */}
  <nav aria-label="Primary" style={{ background: 'var(--header-bg, var(--color-nav))', color: 'var(--header-link, #fff)', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'relative' }} data-testid="navbar">
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '240px 1fr 420px', gap: 12, alignItems: 'center', padding: '10px 16px' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Hamburger (mobile) */}
            <button className="mobile-only" aria-label="Open menu" onClick={() => setShowDrawer(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>☰</button>
            <Link to="/" style={{ color: 'var(--color-warning)', fontWeight: 800, fontSize: 22, textDecoration: 'none' }}>Merkato</Link>
            {/* Desktop Shop by Category trigger (not in vendor mode) */}
            {!isVendor && (
            <button
              ref={megaTriggerRef}
              className="desktop-only"
              aria-haspopup="dialog"
              aria-expanded={showMega}
              aria-controls="mega-panel"
              onMouseEnter={() => setShowMega(true)}
              onClick={() => setShowMega((v) => !v)}
              style={{ background: 'rgba(0,0,0,0.25)', color: 'var(--header-link, #fff)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Shop by Category ▾
            </button>
            )}
            {/* Mobile Shop by Category trigger */}
            {!isVendor && (
              <button className="mobile-only" aria-label="Shop by Category" onClick={() => setShowCatDrawer(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: 'var(--header-link, #fff)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Shop by Category ▾</button>
            )}
            {!isVendor && (
              <>
                <Link to="/favorites" data-navlink style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: 14, ...isActive('/favorites') }}>Favorites</Link>
                {roleNav.slice(0, 2).map((lnk) => (
                  <Link key={lnk.to} to={lnk.to} data-navlink style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 14, ...isActive(lnk.to) }}>{lnk.label}</Link>
                ))}
              </>
            )}
          </div>

    {/* Search (narrower) */}
  <form role="search" aria-label="Site" onSubmit={(e) => { e.preventDefault(); const v = searchText.trim(); const cat = searchCat && searchCat !== 'all' ? `&category=${encodeURIComponent(searchCat)}` : ''; addRecent(v); setShowSuggest(false); navigate(v ? `/shop?search=${encodeURIComponent(v)}${cat}` : (cat ? `/shop?${cat.slice(1)}` : '/shop')); }} style={{ maxWidth: 440, margin: '0 auto', width: '100%', position: 'relative' }}>
            <label htmlFor="global-search" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Search</label>
      <div style={{ display: 'flex', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 999, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
        <select aria-label="Category filter" value={searchCat} onChange={(e) => setSearchCat(e.target.value)} style={{ background: '#f3f4f6', color: '#111827', border: 0, borderRight: '1px solid #e5e7eb', padding: '0 10px', fontSize: 14 }}>
          <option value="all">All</option>
          {categories.map((c) => (<option key={`s-${c}`} value={c.toLowerCase()}>{c}</option>))}
        </select>
  <input id="global-search" name="search" placeholder="Search Merkato" value={searchText} onChange={(e) => setSearchText(e.target.value)} onFocus={() => setShowSuggest(true)} onBlur={() => setTimeout(() => setShowSuggest(false), 150)} style={{ flex: 1, background: 'transparent', color: '#111827', padding: '10px 12px', outline: 'none', border: 'none' }} />
        <button type="submit" aria-label="Search" title="Search" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--color-primary)', color: '#fff', border: 0, padding: '0 14px', fontWeight: 700, cursor: 'pointer' }}>
          {/* search icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <line x1="20" y1="20" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>Search</span>
        </button>
            </div>
            {showSuggest && (recent?.length > 0 || searchText) && (
              <div ref={suggestRef} className="suggest-panel">
                {searchText && (
                  <button type="button" className="suggest-item" onMouseDown={(e) => e.preventDefault()} onClick={() => { addRecent(searchText); setShowSuggest(false); navigate(`/shop?search=${encodeURIComponent(searchText)}${searchCat !== 'all' ? `&category=${encodeURIComponent(searchCat)}` : ''}`); }}>
                    Search “{searchText}” {searchCat !== 'all' ? `in ${searchCat}` : ''}
                  </button>
                )}
                {recent.map((r) => (
                  <button key={r.q} type="button" className="suggest-item" onMouseDown={(e) => e.preventDefault()} onClick={() => { setSearchText(r.q); setShowSuggest(false); navigate(`/shop?search=${encodeURIComponent(r.q)}${searchCat !== 'all' ? `&category=${encodeURIComponent(searchCat)}` : ''}`); }}>
                    {r.q}
                  </button>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                  <button type="button" className="suggest-item" style={{ width: 'auto', padding: '4px 8px', opacity: 0.8 }} onMouseDown={(e) => e.preventDefault()} onClick={() => { setRecent([]); localStorage.removeItem('merkato-recent-searches'); }}>
                    Clear recent
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
            <select aria-label="Language" value={lang} onChange={(e) => onLangChange(e.target.value)} style={{ background: 'rgba(0,0,0,0.25)', color: 'var(--header-link, #fff)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 10px', fontSize: 14, minWidth: 64 }}>
              <option value="en">EN</option>
              <option value="am">AM</option>
              <option value="or">OR</option>
            </select>
            <select aria-label="Currency" value={currency} onChange={(e) => onCurrencyChange(e.target.value)} style={{ background: 'rgba(0,0,0,0.25)', color: 'var(--header-link, #fff)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 10px', fontSize: 14, minWidth: 80 }}>
              <option value="USD">USD</option>
              <option value="ETB">ETB</option>
              <option value="EUR">EUR</option>
            </select>
            <button type="button" aria-label="Notifications" title="Notifications" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: 'var(--header-link, #fff)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>🔔</button>
            {isVendor ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div aria-hidden="true" style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                  {(user?.name || user?.username || 'V').toString().slice(0,1).toUpperCase()}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.92)', fontSize: 14, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user?.name || user?.username || 'Vendor'}>
                  {user?.name || user?.username || 'Vendor'}
                </span>
                <Link to="/vendor" style={{ color: 'rgba(255,255,255,0.92)', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.35)', padding: '6px 10px', borderRadius: 6 }}>Profile</Link>
                <button onClick={handleLogout} data-testid="logout-btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: 'var(--header-link, #fff)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Logout</button>
              </div>
            ) : (
              <>
                {/* Non-vendor keeps existing extras */}
                {roleNav.slice(2).map((lnk) => (
                  <Link key={lnk.to} to={lnk.to} data-navlink style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: 14, ...isActive(lnk.to) }}>{lnk.label}</Link>
                ))}
                {dashLink && (<Link to={dashLink} style={{ color: 'var(--header-link, #fff)', textDecoration: 'none' }}>Dashboard</Link>)}
                {role === 'customer' && (
                  <button type="button" aria-label="My Account" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: 'var(--header-link, #fff)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>My Account</button>
                )}
                {user ? (
                  <button onClick={handleLogout} data-testid="logout-btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: 'var(--header-link, #fff)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Logout</button>
                ) : (
                  <>
                    <Link to="/login" style={{ color: 'var(--header-link, #fff)', textDecoration: 'none' }}>Login</Link>
                    <Link to="/register?role=customer" data-testid="navbar-register-link" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 700 }}>Register</Link>
                  </>
                )}
                <Link to="/cart" data-testid="cart-link" style={{ color: 'var(--header-link, #fff)', textDecoration: 'none' }}>Cart</Link>
              </>
            )}
          </div>
        </div>

        {/* Desktop Shop by Category mega panel - Layered (vertical tabs) */}
  {!isVendor && showMega && (
          <div ref={megaPanelRef} id="mega-panel" className="mega-panel mega-panel-full" role="dialog" aria-label="Shop by Category">
            <div className="mega-layered" onMouseLeave={() => setShowMega(false)}>
              <div className="mega-left" role="tablist" aria-orientation="vertical">
                {effectiveMegaMenu.map((col, idx) => (
                  <button
                    key={`tab-${col.title}`}
                    role="tab"
                    className="mega-tab"
                    aria-selected={activeMegaIdx === idx}
                    aria-controls={`mega-tabpanel-${idx}`}
                    id={`mega-tab-${idx}`}
                    tabIndex={activeMegaIdx === idx ? 0 : -1}
                    onMouseEnter={() => setActiveMegaIdx(idx)}
                    onFocus={() => setActiveMegaIdx(idx)}
                    onClick={() => setActiveMegaIdx(idx)}
                  >
                    {col.thumb ? (
                      <img src={col.thumb} alt="" aria-hidden="true" style={{ width: 18, height: 18, objectFit: 'cover', borderRadius: 4 }} />
                    ) : col.icon ? (
                      <span aria-hidden="true">{col.icon}</span>
                    ) : null}
                    <span>{col.title}</span>
                  </button>
                ))}
              </div>
              <div className="mega-right">
                {effectiveMegaMenu[activeMegaIdx] && (
                  <div
                    role="tabpanel"
                    id={`mega-tabpanel-${activeMegaIdx}`}
                    aria-labelledby={`mega-tab-${activeMegaIdx}`}
                  >
                    <h4>
                      {effectiveMegaMenu[activeMegaIdx].thumb ? (
                        <img src={effectiveMegaMenu[activeMegaIdx].thumb} alt="" aria-hidden="true" style={{ width: 18, height: 18, objectFit: 'cover', borderRadius: 4, marginRight: 6, verticalAlign: 'middle' }} />
                      ) : effectiveMegaMenu[activeMegaIdx].icon ? (
                        <span aria-hidden="true" style={{ marginRight: 6 }}>{effectiveMegaMenu[activeMegaIdx].icon}</span>
                      ) : null}
                      {effectiveMegaMenu[activeMegaIdx].title}
                    </h4>
          <ul className="mega-links">
                      {effectiveMegaMenu[activeMegaIdx].links.map((lnk) => (
            <li key={`link-${effectiveMegaMenu[activeMegaIdx].title}-${lnk.to}`}>
                          <Link className="mega-link" to={lnk.to}>
                            {lnk.thumb ? (
                              <img src={lnk.thumb} alt="" aria-hidden="true" style={{ width: 16, height: 16, objectFit: 'cover', borderRadius: 4, marginRight: 6, verticalAlign: 'text-bottom' }} />
                            ) : lnk.icon ? (
                              <span aria-hidden="true" style={{ marginRight: 6 }}>{lnk.icon}</span>
                            ) : null}
                            {lnk.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Drawer */}
      {showDrawer && (
        <div className="drawer-backdrop" role="dialog" aria-label="Mobile menu" onClick={() => setShowDrawer(false)}>
          <div className="drawer" id="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <header>
              <strong>Menu</strong>
              <button aria-label="Close" onClick={() => setShowDrawer(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>✕</button>
            </header>
            <section>
              <form onSubmit={(e) => { e.preventDefault(); const v = searchText.trim(); const cat = searchCat && searchCat !== 'all' ? `&category=${encodeURIComponent(searchCat)}` : ''; addRecent(v); setShowDrawer(false); navigate(v ? `/shop?search=${encodeURIComponent(v)}${cat}` : (cat ? `/shop?${cat.slice(1)}` : '/shop')); }}>
                <div style={{ display: 'flex', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 999, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                  <select aria-label="Category" value={searchCat} onChange={(e) => setSearchCat(e.target.value)} style={{ background: '#f3f4f6', color: '#111827', border: 0, borderRight: '1px solid #e5e7eb', padding: '8px 10px', fontSize: 14 }}>
                    <option value="all">All</option>
                    {categories.map((c) => (<option key={`m-${c}`} value={c.toLowerCase()}>{c}</option>))}
                  </select>
                  <input placeholder="Search Merkato" value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ flex: 1, background: 'transparent', color: '#111827', border: 0, padding: '8px 10px' }} />
                  <button type="submit" aria-label="Search" title="Search" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--color-primary)', color: '#fff', border: 0, padding: '0 12px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                      <line x1="20" y1="20" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span>Search</span>
                  </button>
                </div>
              </form>
            </section>
            <section>
              <strong style={{ display: 'block', marginBottom: 8, color: '#cbd5e1' }}>Browse</strong>
              {categories.map((c) => (
                <Link key={`m-cat-${c}`} to={`/shop?cat=${encodeURIComponent(c.toLowerCase())}`} onClick={() => setShowDrawer(false)}>{c}</Link>
              ))}
            </section>
            <section>
              <strong style={{ display: 'block', marginBottom: 8, color: '#cbd5e1' }}>Account</strong>
              {user ? (
                <>
                  {dashLink && (<Link to={dashLink} onClick={() => setShowDrawer(false)}>Dashboard</Link>)}
                  <button onClick={() => { handleLogout(); setShowDrawer(false); }}>Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setShowDrawer(false)}>Login</Link>
                  <Link to="/register?role=customer" data-testid="navbar-register-link" onClick={() => setShowDrawer(false)}>Register</Link>
                </>
              )}
              <Link to="/cart" data-testid="cart-link" onClick={() => setShowDrawer(false)}>Cart</Link>
            </section>
            <section style={{ marginTop: 'auto' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select aria-label="Language" value={lang} onChange={(e) => onLangChange(e.target.value)} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                  <option value="en">EN</option>
                  <option value="am">AM</option>
                  <option value="or">OR</option>
                </select>
                <select aria-label="Currency" value={currency} onChange={(e) => onCurrencyChange(e.target.value)} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                  <option value="USD">USD</option>
                  <option value="ETB">ETB</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </section>
          </div>
        </div>
      )}

  {showCatDrawer && (
    <div className="drawer-backdrop" role="dialog" aria-label="Shop by Category" onClick={() => setShowCatDrawer(false)}>
          <div className="drawer" id="mobile-cat-drawer" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', color: '#111827' }}>
            <header style={{ borderBottom: '1px solid #e5e7eb' }}>
      <strong style={{ color: '#111827' }}>Shop by Category</strong>
              <button aria-label="Close" onClick={() => setShowCatDrawer(false)} style={{ background: 'transparent', border: '1px solid #e5e7eb', color: '#111827', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>✕</button>
            </header>
            <section style={{ borderBottom: 'none' }}>
              {effectiveMegaMenu.map((col) => (
                <details key={`mcol-${col.title}`} style={{ borderBottom: '1px solid #f3f4f6', padding: '8px 0' }}>
                  <summary style={{ cursor: 'pointer', listStyle: 'none', outline: 'none' }}>
                    {col.thumb ? (
                      <img src={col.thumb} alt="" aria-hidden="true" style={{ width: 18, height: 18, objectFit: 'cover', borderRadius: 4, marginRight: 6, verticalAlign: 'middle' }} />
                    ) : (
                      <span aria-hidden="true" style={{ marginRight: 6 }}>{col.icon || '▸'}</span>
                    )}
                    {col.title}
                  </summary>
                  <div style={{ marginTop: 8, paddingLeft: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {col.links.map((lnk) => (
                      <Link key={`mlink-${col.title}-${lnk.to}`} to={lnk.to} onClick={() => setShowCatDrawer(false)} style={{ color: '#111827', textDecoration: 'none', padding: '6px 0' }}>
                        {lnk.thumb ? (
                          <img src={lnk.thumb} alt="" aria-hidden="true" style={{ width: 16, height: 16, objectFit: 'cover', borderRadius: 4, marginRight: 6, verticalAlign: 'text-bottom' }} />
                        ) : lnk.icon ? (
                          <span aria-hidden="true" style={{ marginRight: 6 }}>{lnk.icon}</span>
                        ) : null}
                        {lnk.label}
                      </Link>
                    ))}
                  </div>
                </details>
              ))}
            </section>
          </div>
        </div>
      )}
    </header>
  );
}

export default React.memo(MerkatoNavbar);
