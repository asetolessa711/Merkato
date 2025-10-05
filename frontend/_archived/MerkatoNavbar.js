import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LinkBuilder } from '../config/routes';
import MEGA_MENU from '../config/megaMenu';
import MegaMenuPromoPanel from './MegaMenuPromoPanel.js';
import MicroBanner from './MicroBanner.jsx';

// Merkato-style, accessible, test-stable navbar
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
  const [searchFocus, setSearchFocus] = useState(false);
  const megaPanelRef = useRef(null);
  const megaTriggerRef = useRef(null);
  const [activeCategoryTitle, setActiveCategoryTitle] = useState('');
  const [activeSubcategoryTitle, setActiveSubcategoryTitle] = useState('');
  // Vendor command search state
  const [vendorType, setVendorType] = useState('product'); // product | order | media | analytics | help
  const [vSuggestions, setVSuggestions] = useState([]);
  const [vLoading, setVLoading] = useState(false);
  const vAbort = useRef(null);
  const micActiveRef = useRef(false);
  // Notifications dropdown state (vendor)
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);
  // Expanded categories per request
  const [alerts, setAlerts] = useState({
    orders: [],            // Order Updates
    moderation: [],        // Product Moderation
    inventory: [],         // Inventory Alerts
    finance: [],           // Payout & Finance
    feedback: [],          // Customer Feedback
    admin: [],             // Admin Messages
    system: [],            // System Alerts
    promos: [],            // Promotional Nudges
  });
  const totalAlertCount =
    (alerts.orders?.length || 0) +
    (alerts.moderation?.length || 0) +
    (alerts.inventory?.length || 0) +
    (alerts.finance?.length || 0) +
    (alerts.feedback?.length || 0) +
    (alerts.admin?.length || 0) +
    (alerts.system?.length || 0) +
    (alerts.promos?.length || 0);
  // Profile dropdown
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);
  const trustScore = useMemo(() => {
    try { return Math.min(100, Math.max(0, parseInt(localStorage.getItem('vendor-trust-score') || '82', 10))); } catch(_) { return 82; }
  }, []);
  // System Status
  const [status, setStatus] = useState({ uptime: 'OK', sync: 'OK', moderation: 'OK', note: '' });
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('vendor-system-status') || '{}');
      setStatus({
        uptime: raw.uptime || 'OK',
        sync: raw.sync || 'OK',
        moderation: raw.moderation || 'OK',
        note: raw.note || '',
      });
    } catch (_) {}
  }, []);
  const statusColor = (v) => v === 'OK' ? '#10b981' : v === 'WARN' ? '#f59e0b' : '#ef4444';

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user')) || null;
  } catch (_) {}

  const detectedRole = user?.role || (Array.isArray(user?.roles) ? user.roles[0] : undefined);
  const role = roleProp || detectedRole || 'public';
  const isVendor = role === 'vendor';
  const dashLink = role === 'admin' ? '/admin' : role === 'vendor' ? '/vendor' : role === 'customer' ? '/account/dashboard' : null;

  // Derive categories from current mega menu for alignment
  const categories = useMemo(() => {
    try {
      // We'll compute from effectiveMegaMenu after it's calculated; temporary empty list
      return [];
    } catch (_) { return []; }
  }, []);

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

  // Seed and load vendor notifications (simple localStorage mock)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('vendor-notifications');
      if (!raw) {
        const seed = {
          orders: [
            { id: 'ord-4821', text: 'New order received: #4821', href: '/vendor/orders?highlight=4821', ts: Date.now() - 1000*60*25 },
            { id: 'ord-4792', text: 'Order #4792 marked as shipped', href: '/vendor/orders?filter=shipped', ts: Date.now() - 1000*60*90 },
            { id: 'ord-4756', text: 'Return request submitted for order #4756', href: '/vendor/orders?filter=returns', ts: Date.now() - 1000*60*180 },
          ],
          moderation: [
            { id: 'mod-basket', text: "Product 'Handwoven Basket' flagged for review", href: '/vendor/product-moderation', ts: Date.now() - 1000*60*60 },
            { id: 'mod-coffee', text: "Product 'Organic Coffee' approved and published", href: '/vendor/products', ts: Date.now() - 1000*60*200 },
          ],
          inventory: [
            { id: 'inv-wallet', text: "Low stock: 'Leather Wallet' has 3 units remaining", href: '/vendor/analytics/products?view=low-stock', ts: Date.now() - 1000*60*40 },
            { id: 'inv-mug', text: "Out of stock: 'Ceramic Mug'", href: '/vendor/products?filter=out-of-stock', ts: Date.now() - 1000*60*300 },
          ],
          finance: [
            { id: 'fin-pay', text: 'Payout of $245.00 processed to your account', href: '/vendor/payouts', ts: Date.now() - 1000*60*50 },
            { id: 'fin-inv', text: 'Invoice #INV-2025-09 is ready for download', href: '/vendor/invoices', ts: Date.now() - 1000*60*220 },
          ],
          feedback: [
            { id: 'fb-scarf', text: "New review on 'Cotton Scarf': ★★★★☆", href: '/vendor/product-reviews', ts: Date.now() - 1000*60*15 },
            { id: 'fb-cutlery', text: "Customer question on 'Bamboo Cutlery Set'", href: '/vendor/help', ts: Date.now() - 1000*60*120 },
          ],
          admin: [
            { id: 'adm-policy', text: 'Policy update: New packaging guidelines effective Oct 1', href: '/vendor/policy', ts: Date.now() - 1000*60*320 },
            { id: 'adm-setup', text: 'Reminder: Complete storefront setup to unlock analytics', href: '/vendor/settings', ts: Date.now() - 1000*60*420 },
          ],
          system: [
            { id: 'sys-maint', text: 'Scheduled maintenance on Sept 20, 2–4 AM UTC', href: '/status', ts: Date.now() - 1000*60*260 },
            { id: 'sys-live', text: 'Your storefront is now live', href: '/storefront', ts: Date.now() - 1000*60*460 },
          ],
          promos: [
            { id: 'prm-video', text: "Boost your visibility: Add a video to 'Spice Rack'", href: '/vendor/video-promotions', ts: Date.now() - 1000*60*35 },
            { id: 'prm-campaign', text: 'Join the Autumn Campaign to feature your products', href: '/vendor/analytics/products?view=campaigns', ts: Date.now() - 1000*60*80 },
          ],
        };
        localStorage.setItem('vendor-notifications', JSON.stringify(seed));
      }
      const parsed = JSON.parse(localStorage.getItem('vendor-notifications') || '{}');
      setAlerts({
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        moderation: Array.isArray(parsed.moderation) ? parsed.moderation : [],
        inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
        finance: Array.isArray(parsed.finance) ? parsed.finance : [],
        feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
        admin: Array.isArray(parsed.admin) ? parsed.admin : [],
        system: Array.isArray(parsed.system) ? parsed.system : [],
        promos: Array.isArray(parsed.promos) ? parsed.promos : [],
      });
    } catch (_) {}
  }, []);

  // Close notifications on outside click / ESC
  useEffect(() => {
    if (!showNotif) return;
    const onDown = (e) => {
      if (e.key === 'Escape') setShowNotif(false);
    };
    const onClick = (e) => {
      if (!notifRef.current) return;
      if (!notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('keydown', onDown);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onDown);
      document.removeEventListener('mousedown', onClick);
    };
  }, [showNotif]);

  // Close profile on outside / ESC
  useEffect(() => {
    if (!showProfile) return;
    const onDown = (e) => { if (e.key === 'Escape') setShowProfile(false); };
    const onClick = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false); };
    document.addEventListener('keydown', onDown);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onDown); document.removeEventListener('mousedown', onClick); };
  }, [showProfile]);

  const addRecent = (q) => {
    if (!q) return;
    try {
      const now = Date.now();
      const next = [{ q, t: now }].concat(recent.filter((x) => x.q !== q)).slice(0, 6);
      setRecent(next);
      localStorage.setItem('merkato-recent-searches', JSON.stringify(next));
    } catch (_) {}
  };

  // Vendor recent (stored separately to avoid mixing contexts)
  const [vRecent, setVRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vendor-search-recent') || '[]'); } catch (_) { return []; }
  });
  const addVendorRecent = (entry) => {
    try {
      const now = Date.now();
      const e = typeof entry === 'string' ? { q: entry, type: vendorType } : { ...entry };
      const next = [{ ...e, t: now }].concat(vRecent.filter((x) => x.q !== e.q || x.type !== e.type)).slice(0, 5);
      setVRecent(next);
      localStorage.setItem('vendor-search-recent', JSON.stringify(next));
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
  }, [menuVersion]);

  // Support SPA navigation when promo panel dispatches navigate intent
  useEffect(() => {
    const onNavigate = (e) => {
      const href = e?.detail?.href;
      if (href) navigate(href);
    };
    window.addEventListener('mega-promo:navigate', onNavigate);
    return () => window.removeEventListener('mega-promo:navigate', onNavigate);
  }, [navigate]);

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

  // Vendor suggestions fetcher (localStorage + light heuristics)
  useEffect(() => {
    if (!isVendor) return;
    const q = searchText.trim();
    if (!q) { setVSuggestions([]); return; }
    // Cancel previous
    if (vAbort.current) vAbort.current.aborted = true;
    const token = { aborted: false };
    vAbort.current = token;
    setVLoading(true);
    const run = async () => {
      try {
        // Mock sources from localStorage used elsewhere in the app
        const products = JSON.parse(localStorage.getItem('uploadedProducts') || '[]');
        const orders = JSON.parse(localStorage.getItem('vendor-orders') || '[]');
        const media = JSON.parse(localStorage.getItem('vendor-media') || '[]');

        const norm = (s) => (s || '').toString().toLowerCase();
        const includes = (s, p) => norm(s).includes(norm(p));

        let out = [];
        if (vendorType === 'product') {
          out = products.filter(p => includes(p.name, q) || includes(p.sku, q) || (Array.isArray(p.tags) && p.tags.some(t => includes(t, q)))).slice(0, 6).map(p => ({
            kind: 'product', id: p.id || p._id || p.name, title: p.name || 'Untitled', sub: p.sku ? `SKU: ${p.sku}` : undefined, thumb: p.image || p.thumb,
            href: '/vendor/products',
            actions: [
              { label: 'Edit', href: `/vendor/products?edit=${encodeURIComponent(p.id || p._id || '')}` },
              { label: 'View', href: LinkBuilder.toSearch(p.name || '') },
              { label: 'Duplicate', onClick: () => { try { const copy = { ...p, id: undefined, _id: undefined, name: `${p.name || 'Copy'} (Copy)` }; const next = [copy, ...products]; localStorage.setItem('uploadedProducts', JSON.stringify(next)); } catch (_) {} } },
              { label: 'Promote', href: `/vendor/analytics/products?promote=${encodeURIComponent(p.id || p._id || '')}` },
            ]
          }));
        } else if (vendorType === 'order') {
          out = orders.filter(o => includes(o.id, q) || includes(o.orderId, q) || includes(o.customerName, q) || includes(o.status, q)).slice(0, 6).map(o => ({
            kind: 'order', id: o.orderId || o.id, title: o.orderId || o.id, sub: `${o.status || 'unknown'} · ${o.customerName || 'Customer'}`,
            href: '/vendor/orders',
            actions: [
              { label: 'Invoice', href: `/vendor/orders?invoice=${encodeURIComponent(o.orderId || o.id || '')}` },
              { label: 'Tracking', href: `/vendor/orders?track=${encodeURIComponent(o.orderId || o.id || '')}` },
            ]
          }));
        } else if (vendorType === 'media') {
          out = media.filter(m => includes(m.name, q) || includes(m.type, q) || includes(m.productName, q)).slice(0, 6).map(m => ({
            kind: 'media', id: m.id || m.name, title: m.name, sub: `${m.type || 'file'}${m.productName ? ` · ${m.productName}` : ''}`, thumb: m.url?.startsWith('/uploads') ? m.url : undefined,
            href: '/vendor/media',
            actions: [
              { label: 'Open', href: m.url || '/vendor/media' },
              { label: 'Used In', href: `/vendor/media?usedIn=${encodeURIComponent(m.name)}` },
            ]
          }));
        } else if (vendorType === 'analytics') {
          const canned = [
            { title: 'Top-selling (30d)', href: '/vendor/analytics/products?view=top-selling' },
            { title: 'Low stock', href: '/vendor/analytics/products?view=low-stock' },
            { title: 'High return rate', href: '/vendor/analytics/products?view=high-returns' },
          ];
          out = canned.filter(c => includes(c.title, q)).slice(0, 6).map(c => ({ kind: 'analytics', title: c.title, href: c.href }));
        } else {
          const help = [
            { title: 'How to bulk upload', href: '/vendor/bulk-upload' },
            { title: 'Payout schedule', href: '/vendor/payouts' },
            { title: 'Return policy', href: '/vendor/policy' },
          ];
          out = help.filter(h => includes(h.title, q)).map(h => ({ kind: 'help', title: h.title, href: h.href }));
        }
        if (!token.aborted) setVSuggestions(out);
      } catch (_) {
        if (!token.aborted) setVSuggestions([]);
      } finally {
        if (!token.aborted) setVLoading(false);
      }
    };
    const id = setTimeout(run, 120); // light debounce
    return () => { clearTimeout(id); token.aborted = true; };
  }, [isVendor, vendorType, searchText]);

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, width: '100%', zIndex: 10000, background: 'var(--nav-bg)', isolation: 'isolate' }}>
      <style>{`
  a[data-navlink]:hover { text-decoration: underline; color: var(--brand-gold); }
        a[data-catlink]:hover { background: rgba(255,255,255,0.10); border-radius: 6px; }
  .suggest-panel { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px; z-index: 4000; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
  .suggest-item { display: block; width: 100%; text-align: left; background: transparent; border: 0; color: #111827; padding: 8px 10px; border-radius: 6px; cursor: pointer; }
  .suggest-item:hover { background: #f9fafb; }
  .vs-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px; border-radius: 8px; cursor: pointer; }
  .vs-item:hover { background: #f9fafb; }
  .vs-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .vs-title { font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vs-sub { color: #6b7280; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vs-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .vs-actions button { background: #f3f4f6; border: 1px solid #e5e7eb; color: #374151; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 12px; }
  .vs-actions button:hover { background: #e5e7eb; }
  .mic-btn { background: transparent; border: 1px solid rgba(255,255,255,0.35); color: var(--nav-text, #fff); padding: 6px 10px; border-radius: 6px; cursor: pointer; }
        /* Responsive helpers */
        .desktop-only { display: block; }
        .mobile-only { display: none; }
        @media (max-width: 900px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: flex !important; }
        }
        /* Mobile drawer */
  .drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 11000; }
    .drawer { position: fixed; top: 0; left: 0; width: 82vw; max-width: 360px; height: 100vh; background: var(--nav-bg); color: var(--nav-text); z-index: 11001; box-shadow: 2px 0 16px rgba(0,0,0,0.4); display: flex; flex-direction: column; }
    .drawer header { padding: 14px 16px; border-bottom: 1px solid var(--nav-border); display: flex; justify-content: space-between; align-items: center; }
    .drawer section { padding: 10px 16px; border-bottom: 1px solid var(--nav-border); }
    .drawer a, .drawer button { color: var(--nav-text); text-decoration: none; background: transparent; border: 0; padding: 8px 0; text-align: left; width: 100%; }
    .drawer a:hover, .drawer button:hover { color: var(--brand-gold); }
        /* Mega menu */
        .mega-wrapper { position: relative; }
  .mega-panel { position: absolute; left: 16px; right: 16px; top: 100%; background: var(--nav-bg); border: 1px solid var(--nav-border); border-radius: 12px; padding: 14px; color: var(--nav-text); box-shadow: 0 12px 24px rgba(0,0,0,0.25); z-index: 5000; overflow-x: auto; }
        .mega-panel-full { left: 0; right: 0; border-radius: 0 0 12px 12px; }
  /* Layered mega menu */
  .mega-layered { display: grid; grid-template-columns: 260px 1fr; gap: 12px; min-height: 290px; }
  .mega-left { border-right: 1px solid var(--nav-border); padding-right: 8px; display: flex; flex-direction: column; }
  .mega-tab { display: flex; align-items: center; gap: 8px; background: transparent; color: #e5e7eb; border: 0; text-align: left; padding: 8px 10px; border-radius: 8px; cursor: pointer; font-size: 14px; }
  .mega-tab[aria-selected="true"] { background: rgba(255,255,255,0.08); color: #fff; }
  .mega-right { padding-left: 4px; }
  .mega-right h4 { margin: 0 0 8px 0; font-size: 14px; color: #cbd5e1; }
  .mega-links { display: flex; flex-direction: column; gap: 6px; max-height: 360px; overflow-y: auto; padding-right: 6px; margin: 0; padding-left: 0; list-style: none; }
  .mega-link { display: block; padding: 6px 8px; border-radius: 8px; color: #cbd5e1; text-decoration: none; font-size: 14px; }
  .mega-link:hover { background: rgba(255,255,255,0.08); color: #fff; }
      `}</style>
  {/* Dynamic microbanner system (hidden for vendor to reduce noise) */}
  {!isVendor && <MicroBanner />}

  {/* Main bar: brand, search, actions (solid background) */}
  <nav aria-label="Primary" style={{ background: 'var(--nav-bg)', color: 'var(--nav-text, #fff)', borderBottom: '1px solid var(--nav-border)', position: 'relative', fontFamily: 'inherit' }} data-testid="navbar">
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '240px 1fr 360px', gap: 12, alignItems: 'center', padding: '10px 16px' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Hamburger (mobile) */}
            <button className="mobile-only" aria-label="Open menu" onClick={() => setShowDrawer(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: 'var(--nav-text, #fff)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>☰</button>
            <Link to="/" style={{ color: 'var(--nav-text, #fff)', fontWeight: 600, fontSize: 22, textDecoration: 'none', fontFamily: 'inherit' }}>Merkato</Link>
            {!isVendor && (
              <Link to="/" data-navlink style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: 14, fontFamily: 'inherit', ...isActive('/') }}>Home</Link>
            )}
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
              style={{ background: 'rgba(0,0,0,0.25)', color: 'var(--nav-text, #fff)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Shop by Category ▾
            </button>
            )}
            {/* Mobile Shop by Category trigger */}
            {!isVendor && (
              <button className="mobile-only" aria-label="Shop by Category" onClick={() => setShowCatDrawer(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: 'var(--nav-text, #fff)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Shop by Category ▾</button>
            )}
            {/* Vendor navbar keeps only the essentials; hide quick links */}
            {!isVendor && (
              <>
                {roleNav.slice(0, 2).map((lnk) => (
                  <Link key={lnk.to} to={lnk.to} data-navlink style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 14, ...isActive(lnk.to) }}>{lnk.label}</Link>
                ))}
              </>
            )}
          </div>

    {/* Search */}
    {isVendor ? (
      <form role="search" aria-label="Vendor Command Search" onSubmit={(e) => {
        e.preventDefault();
        const v = searchText.trim();
        if (!v && !vRecent.length) return;
        // Slash commands
        if (v.startsWith('/')) {
          const cmd = v.slice(1).toLowerCase();
          const map = {
            upload: '/vendor/upload',
            products: '/vendor/products',
            orders: '/vendor/orders',
            analytics: '/vendor/analytics/products',
            help: '/vendor/help',
            payouts: '/vendor/payouts',
            returns: '/vendor/returns',
            media: '/vendor/media',
          };
          if (map[cmd]) navigate(map[cmd]);
          addVendorRecent({ q: v, type: 'command' });
          setShowSuggest(false);
          return;
        }
        addVendorRecent({ q: v, type: vendorType });
        setShowSuggest(false);
        // Navigate to list pages with query param for deep filtering
        const go = (p) => navigate(`${p}?search=${encodeURIComponent(v)}`);
        if (vendorType === 'product') go('/vendor/products');
        else if (vendorType === 'order') go('/vendor/orders');
        else if (vendorType === 'media') go('/vendor/media');
        else if (vendorType === 'analytics') go('/vendor/analytics/products');
        else go('/vendor/help');
  }} style={{ maxWidth: 460, margin: '0 auto', width: '100%', position: 'relative' }}>
            <label htmlFor="global-search" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Search</label>
      <div onFocusCapture={() => setSearchFocus(true)} onBlurCapture={() => setSearchFocus(false)} style={{ display: 'flex', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 999, overflow: 'hidden', boxShadow: searchFocus ? '0 6px 18px rgba(0,0,0,0.08)' : 'none' }}>
        <select aria-label="Type" data-testid="vendor-search-type" value={vendorType} onChange={(e) => setVendorType(e.target.value)} style={{ background: '#f3f4f6', color: '#111827', border: 0, borderRight: '1px solid #e5e7eb', padding: '0 8px', fontSize: 14, fontFamily: 'inherit' }}>
          <option value="product">Product</option>
          <option value="order">Order</option>
          <option value="media">Media</option>
          <option value="analytics">Analytics</option>
          <option value="help">Help</option>
        </select>
  <input id="global-search" name="search" data-testid="vendor-search-input" placeholder="Try 'red sneakers', 'ORD-1002', '/upload'..." value={searchText} onChange={(e) => setSearchText(e.target.value)} onFocus={() => setShowSuggest(true)} onBlur={() => setTimeout(() => setShowSuggest(false), 150)} style={{ flex: 1, background: 'transparent', color: '#111827', padding: '6px 8px', outline: 'none', border: 'none', fontFamily: 'inherit' }} />
        <button type="button" aria-label="Voice input" className="mic-btn" onClick={() => {
          try {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR || micActiveRef.current) return;
            const rec = new SR();
            micActiveRef.current = true;
            rec.onresult = (e) => {
              const t = e.results?.[0]?.[0]?.transcript || '';
              if (t) setSearchText((prev) => (prev ? prev + ' ' : '') + t);
            };
            rec.onend = () => { micActiveRef.current = false; };
            rec.start();
          } catch (_) {}
        }}>🎙</button>
  <button type="submit" aria-label="Search" title="Search" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--brand-gold)', color: '#111827', border: '1px solid var(--nav-bg)', padding: '0 10px', fontWeight: 600, cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <line x1="20" y1="20" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>Search</span>
        </button>
      </div>
      {/* Quick actions removed from navbar to reduce clutter (available in sidebar) */}
      {showSuggest && (
        <div ref={suggestRef} className="suggest-panel" style={{ maxHeight: 420, overflowY: 'auto' }}>
          {/* Command hints */}
          {searchText.startsWith('/') && (
            <div className="vs-item" role="option">
              <div className="vs-left">
                <span className="vs-title">Use commands like /upload, /orders, /analytics, /help</span>
              </div>
            </div>
          )}
          {/* Recent */}
          {!searchText && vRecent.map((r) => (
            <div key={`${r.type}-${r.q}`} className="vs-item" role="option" onMouseDown={(e) => e.preventDefault()} onClick={() => { setVendorType(r.type || 'product'); setSearchText(r.q); }}>
              <div className="vs-left">
                <span className="vs-title">{r.q}</span>
                <span className="vs-sub">{(r.type || 'product').toUpperCase()}</span>
              </div>
            </div>
          ))}
          {/* Dynamic suggestions for vendor contexts */}
          {vSuggestions.map((s) => (
            <div key={`${s.kind}-${s.id || s.title}-${s.sub || ''}`} className="vs-item" role="option" data-testid="vendor-suggest-item" onMouseDown={(e) => e.preventDefault()} onClick={() => { if (s.href) navigate(s.href); setShowSuggest(false); }}>
              <div className="vs-left">
                {s.thumb && <img src={s.thumb} alt="" width={32} height={32} style={{ objectFit: 'cover', borderRadius: 6 }} />}
                <div style={{ minWidth: 0 }}>
                  <div className="vs-title">{s.title}</div>
                  {s.sub && <div className="vs-sub">{s.sub}</div>}
                </div>
              </div>
              {Array.isArray(s.actions) && s.actions.length > 0 && (
                <div className="vs-actions" onClick={(e) => e.stopPropagation()}>
                  {s.actions.map((a) => (
                    <button key={a.label} onClick={() => a.onClick?.() || (a.href && navigate(a.href))}>{a.label}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {vLoading && <div className="vs-item"><div className="vs-left"><span className="vs-sub">Searching…</span></div></div>}
        </div>
      )}
      </form>
    ) : (
  // Non-vendor search (routes to canonical /search)
  <form role="search" aria-label="Site" onSubmit={(e) => { e.preventDefault(); const v = searchText.trim(); addRecent(v); setShowSuggest(false); navigate(LinkBuilder.toSearch(v)); }} style={{ maxWidth: 360, margin: '0 auto', width: '100%', position: 'relative' }}>
            <label htmlFor="global-search" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Search</label>
      <div onFocusCapture={() => setSearchFocus(true)} onBlurCapture={() => setSearchFocus(false)} style={{ display: 'flex', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 999, overflow: 'hidden', boxShadow: searchFocus ? '0 6px 18px rgba(0,0,0,0.08)' : 'none' }}>
        <select aria-label="Category filter" value={searchCat} onChange={(e) => setSearchCat(e.target.value)} style={{ background: '#f3f4f6', color: '#111827', border: 0, borderRight: '1px solid #e5e7eb', padding: '0 10px', fontSize: 14, fontFamily: 'inherit' }}>
          <option value="all">All</option>
          {effectiveMegaMenu.map((c) => (
            <option key={`s-${c.title}`} value={(c.title || '').toLowerCase()}>{c.title}</option>
          ))}
        </select>
  <input id="global-search" name="search" placeholder="Search Merkato" value={searchText} onChange={(e) => setSearchText(e.target.value)} onFocus={() => setShowSuggest(true)} onBlur={() => setTimeout(() => setShowSuggest(false), 150)} style={{ flex: 1, background: 'transparent', color: '#111827', padding: '8px 10px', outline: 'none', border: 'none', fontFamily: 'inherit' }} />
  <button type="submit" aria-label="Search" title="Search" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--brand-gold)', color: '#111827', border: '1px solid var(--nav-bg)', padding: '0 14px', fontWeight: 600, cursor: 'pointer' }}>
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
                  <button type="button" className="suggest-item" onMouseDown={(e) => e.preventDefault()} onClick={() => { addRecent(searchText); setShowSuggest(false); navigate(LinkBuilder.toSearch(searchText)); }}>
                    Search “{searchText}”
                  </button>
                )}
                {recent.map((r) => (
                  <button key={r.q} type="button" className="suggest-item" onMouseDown={(e) => e.preventDefault()} onClick={() => { setSearchText(r.q); setShowSuggest(false); navigate(LinkBuilder.toSearch(r.q)); }}>
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
    )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, fontFamily: 'inherit' }}>
            {/* Language and Currency selectors */}
            <select aria-label="Language" value={lang} onChange={(e) => onLangChange(e.target.value)} style={{ background: 'rgba(0,0,0,0.25)', color: 'var(--nav-text, #fff)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 10px', fontSize: 14, minWidth: 64, fontFamily: 'inherit' }}>
              <option value="en">EN</option>
              <option value="am">AM</option>
              <option value="or">OR</option>
            </select>
            <select aria-label="Currency" value={currency} onChange={(e) => onCurrencyChange(e.target.value)} style={{ background: 'rgba(0,0,0,0.25)', color: 'var(--nav-text, #fff)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 10px', fontSize: 14, minWidth: 80, fontFamily: 'inherit' }}>
              <option value="USD">USD</option>
              <option value="ETB">ETB</option>
              <option value="EUR">EUR</option>
            </select>
            {/* System Status (vendor) */}
            {isVendor && (
              <span title={`Uptime: ${status.uptime} | Sync: ${status.sync} | Moderation: ${status.moderation}${status.note ? ' \n' + status.note : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', color: 'var(--nav-text,#fff)' }}>
                <span aria-label={`Uptime ${status.uptime}`} style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(status.uptime) }} />
                <span aria-label={`Sync ${status.sync}`} style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(status.sync) }} />
                <span aria-label={`Moderation ${status.moderation}`} style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(status.moderation) }} />
              </span>
            )}
            {/* Notifications bell (vendor: dropdown with categories) */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={showNotif}
                aria-controls="vendor-notif-panel"
                onClick={() => setShowNotif(v => !v)}
                title="Notifications"
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: 'var(--nav-text, #fff)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', position: 'relative' }}
              >
                🔔
                {totalAlertCount > 0 && (
                  <span aria-label={`${totalAlertCount} new notifications`} style={{ position: 'absolute', top: -4, right: -4, background: 'var(--brand-gold)', color: '#111827', border: '1px solid var(--nav-bg)', borderRadius: 999, fontSize: 10, lineHeight: '14px', padding: '0 5px', minWidth: 14, textAlign: 'center', fontWeight: 600 }}>{Math.min(99, totalAlertCount)}</span>
                )}
              </button>
              {showNotif && (
                <div id="vendor-notif-panel" role="dialog" aria-label="Notifications" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 420, maxWidth: '92vw', background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 12px 24px rgba(0,0,0,0.2)', zIndex: 12000 }}>
                  <div style={{ maxHeight: 340, overflowY: 'auto', padding: '8px 0' }}>
                    {[
                      { key: 'orders', label: 'Order Updates', items: alerts.orders },
                      { key: 'moderation', label: 'Product Moderation', items: alerts.moderation },
                      { key: 'inventory', label: 'Inventory Alerts', items: alerts.inventory },
                      { key: 'finance', label: 'Payout & Finance', items: alerts.finance },
                      { key: 'feedback', label: 'Customer Feedback', items: alerts.feedback },
                      { key: 'admin', label: 'Admin Messages', items: alerts.admin },
                      { key: 'system', label: 'System Alerts', items: alerts.system },
                      { key: 'promos', label: 'Promotional Nudges', items: alerts.promos },
                    ].map(sec => (
                      <div key={`sec-${sec.key}`} style={{ borderTop: '1px solid #f3f4f6', padding: '8px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <strong style={{ fontSize: 14 }}>{sec.label}</strong>
                          <span style={{ background: '#eef2ff', color: '#4338ca', borderRadius: 999, padding: '2px 6px', fontSize: 12, fontWeight: 700 }}>{sec.items?.length || 0}</span>
                        </div>
                        {sec.items && sec.items.length ? (
                          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {sec.items.map(a => (
                              <li key={`n-${sec.key}-${a.id}`}>
                                <Link to={a.href || '/vendor'} onClick={() => setShowNotif(false)} style={{ display: 'block', padding: '6px 8px', color: '#111827', textDecoration: 'none', borderRadius: 8 }}>
                                  {a.text}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div style={{ padding: '6px 8px', color: '#6b7280' }}>No messages</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isVendor ? (
              // Vendor Profile dropdown
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }} ref={profileRef}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={showProfile}
                  aria-controls="vendor-profile-menu"
                  onClick={() => setShowProfile(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: 'var(--nav-text, #fff)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
                >
                  <div aria-hidden="true" style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                    {(user?.name || user?.username || 'V').toString().slice(0,1).toUpperCase()}
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.92)', fontSize: 14, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title="Open vendor profile">
                    Vendor Profile
                  </span>
                </button>
                {showProfile && (
                  <div id="vendor-profile-menu" role="menu" aria-label="Profile" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 240, background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 12px 24px rgba(0,0,0,0.2)', zIndex: 12000 }}>
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 14 }}>Account</strong>
                      <span title="Trust Score" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)', padding: '2px 6px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>TS {trustScore}</span>
                    </div>
                    <Link role="menuitem" to="/storefront" onClick={() => setShowProfile(false)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', color: '#111827', textDecoration: 'none' }}>
                      My Storefront <span aria-hidden>↗</span>
                    </Link>
                    <Link role="menuitem" to="/vendor/settings" onClick={() => setShowProfile(false)} style={{ display: 'block', padding: '10px 12px', color: '#111827', textDecoration: 'none' }}>Settings</Link>
                    <button role="menuitem" onClick={() => { setShowProfile(false); navigate('/account/dashboard'); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, padding: '10px 12px', cursor: 'pointer' }}>Switch Role</button>
                    <button role="menuitem" onClick={() => { setShowProfile(false); handleLogout(); }} data-testid="logout-btn" style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, padding: '10px 12px', cursor: 'pointer', color: '#b91c1c' }}>Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Non-vendor retains links */}
                <Link to="/account/dashboard" data-navlink style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: 14, fontFamily: 'inherit', ...isActive('/account/dashboard') }}>Customer</Link>
                <Link to="/vendor" data-navlink style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: 14, fontFamily: 'inherit', ...isActive('/vendor') }}>Vendor</Link>
                {roleNav.slice(2).map((lnk) => (
                  <Link key={lnk.to} to={lnk.to} data-navlink style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: 14, ...isActive(lnk.to) }}>{lnk.label}</Link>
                ))}
                {dashLink && (<Link to={dashLink} style={{ color: 'var(--nav-text, #fff)', textDecoration: 'none' }}>Dashboard</Link>)}
                {/* Public CTA moved to MicroBanner promo */}
                {role === 'customer' && (
                  <button type="button" aria-label="My Account" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: 'var(--nav-text, #fff)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>My Account</button>
                )}
                {user ? (
                  <button onClick={handleLogout} data-testid="logout-btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: 'var(--nav-text, #fff)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Logout</button>
                ) : (
                  <>
                    <Link to="/login" style={{ color: 'var(--nav-text, #fff)', textDecoration: 'none', fontFamily: 'inherit' }}>Login</Link>
                    <Link to="/register?role=customer" data-testid="navbar-register-link" style={{ color: 'var(--brand-gold)', textDecoration: 'none', fontWeight: 600, fontFamily: 'inherit' }}>Register</Link>
                  </>
                )}
                <Link to="/cart" data-testid="cart-link" style={{ color: 'var(--nav-text, #fff)', textDecoration: 'none', fontFamily: 'inherit' }}>Cart</Link>
              </>
            )}
          </div>
        </div>

        {/* Desktop Shop by Category mega panel - Layered (vertical tabs) */}
  {!isVendor && showMega && (
          <div ref={megaPanelRef} id="mega-panel" className="mega-panel mega-panel-full" role="dialog" aria-label="Shop by Category">
            <div className="mega-layered" onMouseLeave={() => setShowMega(false)} style={{ gridTemplateColumns: '260px 1fr 900px' }}>
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
                    onMouseEnter={() => { setActiveMegaIdx(idx); setActiveCategoryTitle(col.title || ''); setActiveSubcategoryTitle(''); }}
                    onFocus={() => { setActiveMegaIdx(idx); setActiveCategoryTitle(col.title || ''); setActiveSubcategoryTitle(''); }}
                    onClick={() => { setActiveMegaIdx(idx); setActiveCategoryTitle(col.title || ''); setActiveSubcategoryTitle(''); }}
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
                          <Link className="mega-link" to={lnk.to} onMouseEnter={() => setActiveSubcategoryTitle(lnk.label || '')}>
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
              <MegaMenuPromoPanel activeCategory={activeCategoryTitle} activeSubcategory={activeSubcategoryTitle} />
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Drawer */}
  {!isVendor && showDrawer && (
        <div className="drawer-backdrop" role="dialog" aria-label="Mobile menu" onClick={() => setShowDrawer(false)}>
          <div className="drawer" id="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <header>
              <strong>Menu</strong>
              <button aria-label="Close" onClick={() => setShowDrawer(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>✕</button>
            </header>
            <section>
              <form onSubmit={(e) => { e.preventDefault(); const v = searchText.trim(); addRecent(v); setShowDrawer(false); navigate(LinkBuilder.toSearch(v)); }}>
                <div style={{ display: 'flex', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 999, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                  <select aria-label="Category" value={searchCat} onChange={(e) => setSearchCat(e.target.value)} style={{ background: '#f3f4f6', color: '#111827', border: 0, borderRight: '1px solid #e5e7eb', padding: '8px 10px', fontSize: 14, fontFamily: 'inherit' }}>
                    <option value="all">All</option>
                    {effectiveMegaMenu.map((c) => (<option key={`m-${c.title}`} value={(c.title || '').toLowerCase()}>{c.title}</option>))}
                  </select>
                  <input placeholder="Search Merkato" value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ flex: 1, background: 'transparent', color: '#111827', border: 0, padding: '8px 10px', fontFamily: 'inherit' }} />
                  <button type="submit" aria-label="Search" title="Search" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--brand-gold)', color: '#111827', border: '1px solid var(--nav-bg)', padding: '0 12px' }}>
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
              {effectiveMegaMenu.map((c) => {
                const href = LinkBuilder.toCategory(c.title || '', { sort: 'best' }) || '#';
                return (
                  <Link key={`m-cat-${c.title}`} to={href} onClick={() => setShowDrawer(false)}>{c.title}</Link>
                );
              })}
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
                  {/* Public CTA moved to MicroBanner promo */}
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

  {!isVendor && showCatDrawer && (
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
