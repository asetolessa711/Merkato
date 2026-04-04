import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '../cart/CartContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import MEGA_MENU from '../config/megaMenu';
import { fetchCategories } from '../api/categories';
import { getCanonicalTaxonomy, getCategoryListFrom } from '../utils/taxonomy';
import MegaMenuPromoPanel from './MegaMenuPromoPanel.js';
import { fetchSearchSuggest, logSearchEvent } from '../api/search';
import MicroBanner from './MicroBanner.jsx';

// Merkato-style, accessible, test-stable navbar
// Keeps existing E2E selectors: cart-link, navbar-register-link, and My Account button
function MerkatoNavbar({ role: roleProp = 'public', showCategories: showCategoriesProp }) {
	const location = useLocation();
	const navigate = useNavigate();
	// removed legacy All Categories panel to avoid duplication with mega menu
	const [searchCat, setSearchCat] = useState('all');
		// Load canonical taxonomy once
	const [canonCats, setCanonCats] = useState([]);
	useEffect(() => {
		(async () => {
				try {
					const countryName = (() => { try { return localStorage.getItem('merkato-region') || ''; } catch { return ''; } })();
					const country = countryName === 'Ethiopia' ? 'ET' : '';
					const lang = (() => { try { return localStorage.getItem('merkato-lang') || 'en'; } catch { return 'en'; } })();
					const cats = await getCanonicalTaxonomy({ country, lang });
					setCanonCats(cats);
				} catch (_) {}
		})();
	}, []);
	const [searchText, setSearchText] = useState('');
	const [showSuggest, setShowSuggest] = useState(false);
	const [catSuggest, setCatSuggest] = useState([]);
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
	// Silent IP geolocation default (no UI here)
	useEffect(() => {
		try { if (localStorage.getItem('merkato-region')) return; } catch (_) {}
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch('/api/geo/ip', { headers: { 'Accept': 'application/json' } });
				if (!res.ok) return;
				const data = await res.json();
				const name = (data && (data.countryName || data.country || '')).toString();
				if (!cancelled && name) {
					try { localStorage.setItem('merkato-region', name); } catch (_) {}
				}
			} catch (_) {}
		})();
		return () => { cancelled = true; };
	}, []);
	// Scroll shadow state for navbar separation on scroll
	const [scrolled, setScrolled] = useState(false);
	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 0);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);
	// Vendor command search state
	const [vendorType, setVendorType] = useState('product'); // product | order | media | analytics | help
	const [vSuggestions, setVSuggestions] = useState([]);
	const [vLoading, setVLoading] = useState(false);
	const vAbort = useRef(null);
	const micActiveRef = useRef(false);
	// Notifications bell removed per request
	// Public Account dropdown
	const [showAccount, setShowAccount] = useState(false);
	const accountRef = useRef(null);
	// Locale dropdown (merge language + currency)
	const [showLangMenu, setShowLangMenu] = useState(false);
	const [showCurMenu, setShowCurMenu] = useState(false);
	const [showRegisterMenu, setShowRegisterMenu] = useState(false);
	const langRef = useRef(null);
	const curRef = useRef(null);
	const registerRef = useRef(null);
	// Live cart count via Cart Context; fallback to legacy storage if provider unavailable
	let cartCount = 0;
	try {
		const cart = useCart();
		cartCount = cart ? cart.totalQty : 0;
	} catch (_) {
		// Fallback legacy computation (merely as a backup in rare cases)
		try {
			const raw = localStorage.getItem('cart:v1');
			if (raw) {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed?.items)) {
					cartCount = parsed.items.reduce((n, it) => n + (parseInt(it?.qty ?? 1, 10) || 1), 0);
				}
			}
		} catch (_) { /* no-op */ }
	}
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

	// Unified labels for languages and currencies
	const LANGUAGE_OPTIONS = useMemo(() => (
		[
			['en', 'English'],
			['am', 'Amharic'],
			['or', 'Oromo'],
			['ti', 'Tigrinya'],
			['so', 'Somali'],
			['ar', 'Arabic'],
			['fr', 'French'],
			['it', 'Italian'],
			['sw', 'Swahili'],
		]
	), []);
	const LANGUAGE_LABELS = useMemo(() => Object.fromEntries(LANGUAGE_OPTIONS), [LANGUAGE_OPTIONS]);
	const CURRENCY_OPTIONS = useMemo(() => (
		[
			['USD', 'US Dollar'],
			['ETB', 'Ethiopian Birr'],
			['EUR', 'Euro'],
			['GBP', 'British Pound'],
			['AED', 'UAE Dirham'],
			['SAR', 'Saudi Riyal'],
			['KES', 'Kenyan Shilling'],
			['ZAR', 'South African Rand'],
			['CNY', 'Chinese Yuan'],
			['NGN', 'Nigerian Naira'],
		]
	), []);
	const CURRENCY_LABELS = useMemo(() => Object.fromEntries(CURRENCY_OPTIONS), [CURRENCY_OPTIONS]);

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

	// Notifications removed: no seeding or dropdown

	// Close profile on outside / ESC
	useEffect(() => {
		if (!showProfile) return;
		const onDown = (e) => { if (e.key === 'Escape') setShowProfile(false); };
		const onClick = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false); };
		document.addEventListener('keydown', onDown);
		document.addEventListener('mousedown', onClick);
		return () => { document.removeEventListener('keydown', onDown); document.removeEventListener('mousedown', onClick); };
	}, [showProfile]);

	// Close public Account menu on outside / ESC
	useEffect(() => {
		if (!showAccount) return;
		const onDown = (e) => { if (e.key === 'Escape') setShowAccount(false); };
		const onClick = (e) => { if (accountRef.current && !accountRef.current.contains(e.target)) setShowAccount(false); };
		document.addEventListener('keydown', onDown);
		document.addEventListener('mousedown', onClick);
		return () => { document.removeEventListener('keydown', onDown); document.removeEventListener('mousedown', onClick); };
	}, [showAccount]);

	// Close Language menu
	useEffect(() => {
		if (!showLangMenu) return;
		const onDown = (e) => { if (e.key === 'Escape') setShowLangMenu(false); };
		const onClick = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setShowLangMenu(false); };
		document.addEventListener('keydown', onDown);
		document.addEventListener('mousedown', onClick);
		return () => { document.removeEventListener('keydown', onDown); document.removeEventListener('mousedown', onClick); };
	}, [showLangMenu]);

	// Close Currency menu
	useEffect(() => {
		if (!showCurMenu) return;
		const onDown = (e) => { if (e.key === 'Escape') setShowCurMenu(false); };
		const onClick = (e) => { if (curRef.current && !curRef.current.contains(e.target)) setShowCurMenu(false); };
		document.addEventListener('keydown', onDown);
		document.addEventListener('mousedown', onClick);
		return () => { document.removeEventListener('keydown', onDown); document.removeEventListener('mousedown', onClick); };
	}, [showCurMenu]);

	// Close Register menu
	useEffect(() => {
		if (!showRegisterMenu) return;
		const onDown = (e) => { if (e.key === 'Escape') setShowRegisterMenu(false); };
		const onClick = (e) => { if (registerRef.current && !registerRef.current.contains(e.target)) setShowRegisterMenu(false); };
		document.addEventListener('keydown', onDown);
		document.addEventListener('mousedown', onClick);
		return () => { document.removeEventListener('keydown', onDown); document.removeEventListener('mousedown', onClick); };
	}, [showRegisterMenu]);

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

	// Track menu refresh requests from admin save actions.
	const [menuVersion, setMenuVersion] = useState(0);
	const [serverMegaMenu, setServerMegaMenu] = useState([]);
	useEffect(() => {
		const onCustom = () => setMenuVersion((v) => v + 1);
		window.addEventListener('mega-menu:updated', onCustom);
		return () => {
			window.removeEventListener('mega-menu:updated', onCustom);
		};
	}, []);

	useEffect(() => {
		if (isVendor) return;
		let mounted = true;
		const loadServerMegaMenu = async () => {
			try {
				const menu = await fetchCategories();
				if (!mounted) return;
				setServerMegaMenu(Array.isArray(menu) ? menu : []);
			} catch (_) {
				if (!mounted) return;
				setServerMegaMenu([]);
			}
		};
		loadServerMegaMenu();
		return () => {
			mounted = false;
		};
	}, [isVendor, menuVersion]);

	const effectiveMegaMenu = useMemo(() => {
		if (Array.isArray(serverMegaMenu) && serverMegaMenu.length > 0) {
			return serverMegaMenu.map((col) => ({
				title: col?.title || '',
				icon: col?.icon,
				thumb: col?.thumb,
				links: Array.isArray(col?.links) ? col.links : [],
			}));
		}
		return MEGA_MENU;
	}, [serverMegaMenu]);

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
							{ label: 'View', href: `/shop?search=${encodeURIComponent(p.name || '')}` },
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

	// Public search suggestions (categories first)
	useEffect(() => {
		if (isVendor) return; // vendor uses custom suggest logic
		const q = searchText.trim();
		if (!q) { setCatSuggest([]); return; }
		let stopped = false;
		const run = async () => {
			try {
				const countryName = (() => { try { return localStorage.getItem('merkato-region') || ''; } catch { return ''; } })();
				const country = countryName === 'Ethiopia' ? 'ET' : '';
				const res = await fetchSearchSuggest({ q, lang, country, limit: 5 });
				if (!stopped) setCatSuggest(res.categories || []);
			} catch (_) {
				if (!stopped) setCatSuggest([]);
			}
		};
		const id = setTimeout(run, 150);
		return () => { stopped = true; clearTimeout(id); };
	}, [searchText, isVendor, lang]);

	return (
		<header style={{ position: 'fixed', top: 0, left: 0, right: 0, width: '100%', zIndex: 10000, background: 'var(--nav-bg, var(--header-bg, var(--color-nav)))', isolation: 'isolate' }}>
			<style>{`
	a[data-navlink]:hover { text-decoration: underline; color: var(--header-hover, var(--color-primary)); }
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
	.mic-btn { background: transparent; border: 1px solid rgba(255,255,255,0.35); color: var(--header-link, #fff); padding: 6px 10px; border-radius: 6px; cursor: pointer; }
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
	.mega-panel { position: absolute; left: 16px; right: 16px; top: 100%; background: var(--header-dropdown-bg, #1f2236); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 14px; color: #fff; box-shadow: 0 12px 24px rgba(0,0,0,0.25); z-index: 5000; overflow-x: auto; }
	/* Light variant for public theme */
	.mega-panel.mega-light { background: #ffffff; color: #111827; border: 1px solid #e5e7eb; box-shadow: 0 16px 28px rgba(0,0,0,0.15); --mega-promo-bg: #f9fafb; --mega-promo-border: #e5e7eb; --mega-promo-fg: #111827; }
	.mega-panel.mega-light .mega-left { border-right: 1px solid #e5e7eb; }
	.mega-panel.mega-light .mega-tab { color: #374151; }
	.mega-panel.mega-light .mega-tab[aria-selected="true"] { background: #f3f4f6; color: #111827; }
	.mega-panel.mega-light .mega-right h4 { color: #374151; }
	.mega-panel.mega-light .mega-link { color: #374151; }
	.mega-panel.mega-light .mega-link:hover { background: #f3f4f6; color: #111827; }
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
	{/* Dynamic microbanner system (hidden for vendor to reduce noise) */}
	{!isVendor && <MicroBanner />}

	{/* Main bar: brand, search, actions (solid background) */}
	<nav aria-label="Primary" style={{ background: 'var(--nav-bg, var(--header-bg, var(--color-nav)))', color: 'var(--nav-text, var(--header-link, #fff))', borderBottom: '1px solid var(--nav-border, rgba(255,255,255,0.08))', position: 'relative', fontFamily: 'var(--font-sans, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif)', fontWeight: 400, boxShadow: scrolled ? '0 2px 8px rgba(0,0,0,0.12)' : 'none' }} data-testid="navbar">
				<div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', padding: '10px 16px' }}>
					{/* Brand */}
					<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap' }}>
						{/* Hamburger (mobile) */}
						<button className="mobile-only" aria-label="Open menu" onClick={() => setShowDrawer(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>☰</button>
						<Link to="/" style={{ color: 'var(--color-warning)', fontWeight: 400, fontSize: 22, textDecoration: 'none', fontFamily: 'inherit' }}>Merkato</Link>
						{/* Accessibility-only Home link retained for tests */}
						<Link to="/" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Home</Link>
						{/* Removed explicit Home link per public navbar cleanup */}
						{/* Bring forward: Sell on Merkato chip (public) */}
						{!isVendor && (
							<Link
								to="/vendor/register"
								style={{ background: 'rgba(0,0,0,0.25)', color: 'var(--header-link, #fff)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none', fontWeight: 400, fontSize: 14 }}
							>
								Sell on Merkato
							</Link>
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
							style={{ background: 'rgba(0,0,0,0.25)', color: 'var(--header-link, #fff)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}
						>
							Shop by Category ▾
						</button>
						)}
						{/* Mobile Shop by Category trigger */}
						{!isVendor && (
							<button className="mobile-only" aria-label="Shop by Category" onClick={() => setShowCatDrawer(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: 'var(--header-link, #fff)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Shop by Category ▾</button>
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
			<div onFocusCapture={() => setSearchFocus(true)} onBlurCapture={() => setSearchFocus(false)} style={{ display: 'flex', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: searchFocus ? '0 6px 18px rgba(0,0,0,0.08)' : 'none' }}>
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
	<button type="submit" aria-label="Search" title="Search" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--color-primary)', color: '#fff', border: 0, padding: '0 10px', fontWeight: 400, cursor: 'pointer' }}>
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
					{/* Vendor suggestions list */}
					{!searchText.startsWith('/') && vSuggestions.map((s) => (
						<div
							key={`${s.kind}-${s.id || s.title}-${s.sub || ''}`}
							className="vs-item"
							role="option"
							data-testid="vendor-suggest-item"
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => { if (s.href) navigate(s.href); setShowSuggest(false); }}
						>
							<div className="vs-left">
								{s.thumb && <img src={s.thumb} alt="" width={32} height={32} style={{ objectFit: 'cover', borderRadius: 6 }} />}
								<div style={{ minWidth: 0 }}>
									<div className="vs-title">{s.title}</div>
									{s.sub && <div className="vs-sub">{s.sub}</div>}
								</div>
							</div>
							{Array.isArray(s.actions) && s.actions.length > 0 && (
								<div className="vs-actions">
									{s.actions.map((a, i) => (
										<button key={`act-${i}`} type="button" onClick={(e) => { e.stopPropagation(); if (a.onClick) { a.onClick(); } else if (a.href) { navigate(a.href); } }}>
											{a.label}
										</button>
									))}
								</div>
							)}
						</div>
					))}
					{/* Region Modal moved to Customer page */}
					{vLoading && <div className="vs-item"><div className="vs-left"><span className="vs-sub">Searching…</span></div></div>}
				</div>
			)}
			</form>
		) : (
			<form role="search" aria-label="Site" onSubmit={(e) => { e.preventDefault(); const v = searchText.trim(); const cat = searchCat && searchCat !== 'all' ? `&category=${encodeURIComponent(searchCat)}` : ''; addRecent(v); setShowSuggest(false); navigate(v ? `/shop?search=${encodeURIComponent(v)}${cat}` : (cat ? `/shop?${cat.slice(1)}` : '/shop')); }} style={{ maxWidth: 320, margin: '0 auto', width: '100%', position: 'relative' }}>
						<label htmlFor="global-search" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Search</label>
			<div onFocusCapture={() => setSearchFocus(true)} onBlurCapture={() => setSearchFocus(false)} style={{ display: 'flex', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: searchFocus ? '0 6px 18px rgba(0,0,0,0.08)' : 'none', height: 40 }}>
				<select aria-label="Category filter" value={searchCat} onChange={(e) => setSearchCat(e.target.value)} style={{ background: '#f3f4f6', color: '#111827', border: 0, borderRight: '1px solid #e5e7eb', padding: '0 10px', fontSize: 14, fontFamily: 'inherit', height: '100%' }}>
					<option value="all">All</option>
                    {getCategoryListFrom(canonCats, lang).map((title) => (
						<option key={`s-${title}`} value={(title || '').toLowerCase()}>{title}</option>
					))}
				</select>
	<input id="global-search" name="search" placeholder="Search Merkato" value={searchText} onChange={(e) => setSearchText(e.target.value)} onFocus={() => setShowSuggest(true)} onBlur={() => setTimeout(() => setShowSuggest(false), 150)} style={{ flex: 1, background: 'transparent', color: '#111827', padding: '0 10px', outline: 'none', border: 'none', fontFamily: 'inherit', height: '100%' }} />
				<button type="submit" aria-label="Search" title="Search" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--color-primary)', color: '#fff', border: 0, padding: '0 14px', fontWeight: 400, cursor: 'pointer', height: '100%' }}>
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
														{/* Category suggestions from backend */}
														{catSuggest.map((c, idx) => (
															<button
																key={`cat-suggest-${c.slug}`}
																type="button"
																className="suggest-item"
																onMouseDown={(e) => e.preventDefault()}
																onClick={() => {
																	const countryName = (() => { try { return localStorage.getItem('merkato-region') || ''; } catch { return ''; } })();
																	const country = countryName === 'Ethiopia' ? 'ET' : '';
																	logSearchEvent({ type: 'category_suggest_clicked', slug: c.slug, pos: idx + 1, role, country, q: searchText.trim() });
																	setShowSuggest(false);
																	navigate(`/shop?category=${encodeURIComponent(c.slug)}`);
																}}
															>
																{c.name}
															</button>
														))}

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
		)}

					{/* Actions (right column) */}
					<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, flexWrap: 'nowrap' }}>
					{/* Region Modal removed (now in Customer page) */}
						{/* Language chip (desktop) */}
						<div style={{ position: 'relative' }} ref={langRef}>
							<button
								type="button"
								aria-haspopup="menu"
								aria-expanded={showLangMenu}
								aria-controls="lang-menu"
								onClick={() => { setShowLangMenu(v => !v); setShowCurMenu(false); setShowRegisterMenu(false); setShowMega(false); }}
								style={{ background: 'rgba(0,0,0,0.25)', color: 'var(--header-link, #fff)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 400 }}
							>
								{LANGUAGE_LABELS[lang] || 'English'} ▾
							</button>
							{showLangMenu && (
								<div id="lang-menu" role="menu" aria-label="Language" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 240, background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 12px 24px rgba(0,0,0,0.2)', zIndex: 20000 }}>
									<div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280' }}>Select language</div>
									{(LANGUAGE_OPTIONS && LANGUAGE_OPTIONS.length > 0) ? LANGUAGE_OPTIONS.map(([code, label]) => (
										<button key={code} role="menuitem" type="button" onClick={() => { onLangChange(code); setShowLangMenu(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, padding: '10px 12px', cursor: 'pointer', color: '#111827' }}>{label}</button>
									)) : (
										<div style={{ padding: '10px 12px', color: '#6b7280' }}>No languages</div>
									)}
								</div>
							)}
						</div>

						{/* Currency chip (desktop) */}
						<div style={{ position: 'relative' }} ref={curRef}>
							<button
								type="button"
								aria-haspopup="menu"
								aria-expanded={showCurMenu}
								aria-controls="cur-menu"
								onClick={() => { setShowCurMenu(v => !v); setShowLangMenu(false); setShowRegisterMenu(false); setShowMega(false); }}
								style={{ background: 'rgba(0,0,0,0.25)', color: 'var(--header-link, #fff)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 400 }}
							>
								{CURRENCY_LABELS[currency] || 'US Dollar'} ▾
							</button>
							{showCurMenu && (
								<div id="cur-menu" role="menu" aria-label="Currency" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 260, background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 12px 24px rgba(0,0,0,0.2)', zIndex: 20000 }}>
									<div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280' }}>Select currency</div>
									{(CURRENCY_OPTIONS && CURRENCY_OPTIONS.length > 0) ? CURRENCY_OPTIONS.map(([code, label]) => (
										<button key={code} role="menuitem" type="button" onClick={() => { onCurrencyChange(code); setShowCurMenu(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, padding: '10px 12px', cursor: 'pointer', color: '#111827' }}>{label}</button>
									)) : (
										<div style={{ padding: '10px 12px', color: '#6b7280' }}>No currencies</div>
									)}
								</div>
							)}
						</div>
						{/* System Status (vendor) */}
						{isVendor && (
							<span title={`Uptime: ${status.uptime} | Sync: ${status.sync} | Moderation: ${status.moderation}${status.note ? ' \n' + status.note : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', color: 'var(--header-link,#fff)' }}>
								<span aria-label={`Uptime ${status.uptime}`} style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(status.uptime) }} />
								<span aria-label={`Sync ${status.sync}`} style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(status.sync) }} />
								<span aria-label={`Moderation ${status.moderation}`} style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(status.moderation) }} />
							</span>
						)}
						{/* Role-aware CTA: keep vendor/admin only (public CTA moved to left chip) */}
						{role === 'vendor' ? (
							<Link to="/vendor" style={{ background: 'var(--color-primary)', color: '#fff', textDecoration: 'none', padding: '8px 12px', borderRadius: 8, fontWeight: 400, fontFamily: 'inherit' }}>Vendor Dashboard</Link>
						) : null}
						{/* Notifications bell removed */}

						{isVendor ? (
							// Vendor Profile dropdown
							<div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }} ref={profileRef}>
								<button
									type="button"
									aria-haspopup="menu"
									aria-expanded={showProfile}
									aria-controls="vendor-profile-menu"
									onClick={() => setShowProfile(v => !v)}
									style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: 'var(--header-link, #fff)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
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
														<span title="Trust Score" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)', padding: '2px 6px', borderRadius: 999, fontSize: 12, fontWeight: 400 }}>TS {trustScore}</span>
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
								{/* Public pages: show a concise set of actions */}
								{role === 'public' ? (
									<>
										{/* Inline Sign In / Register removed per request; use Account menu instead */}

										{/* Account dropdown consolidates Logout and account options */}
										<div style={{ position: 'relative' }} ref={accountRef}>
											<button
												type="button"
												aria-label="My Account"
												aria-haspopup="menu"
												aria-expanded={showAccount}
												aria-controls="public-account-menu"
												onClick={() => setShowAccount(v => !v)}
												style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.35)', color: 'var(--header-link, #fff)', padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}
											>
												Account ▾
											</button>
											{showAccount && (
												<div id="public-account-menu" role="menu" aria-label="Account" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 240, background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 12px 24px rgba(0,0,0,0.2)', zIndex: 12000 }}>
													{user ? (
														<>
															<Link role="menuitem" to="/account/dashboard" onClick={() => setShowAccount(false)} style={{ display: 'block', padding: '10px 12px', color: '#111827', textDecoration: 'none' }}>My Account</Link>
															<button role="menuitem" onClick={() => { setShowAccount(false); handleLogout(); }} data-testid="logout-btn" style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, padding: '10px 12px', cursor: 'pointer', color: '#b91c1c' }}>Logout</button>
														</>
													) : (
														<>
															<Link role="menuitem" to="/register?role=customer" onClick={() => setShowAccount(false)} style={{ display: 'block', padding: '10px 12px', color: '#111827', textDecoration: 'none' }}>Register</Link>
															<Link role="menuitem" to="/login" onClick={() => setShowAccount(false)} style={{ display: 'block', padding: '10px 12px', color: '#111827', textDecoration: 'none' }}>Sign In</Link>
														</>
													)}
												</div>
											)}
										</div>

										{/* Register selector (Buyer/Seller) */}
										<div style={{ position: 'relative' }} ref={registerRef}>
											<button
												type="button"
												aria-haspopup="menu"
												aria-expanded={showRegisterMenu}
												aria-controls="register-menu"
												onClick={() => setShowRegisterMenu(v => !v)}
												style={{ background: 'rgba(0,0,0,0.25)', color: 'var(--header-link, #fff)', textDecoration: 'none', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.35)', fontWeight: 400, fontSize: 14, cursor: 'pointer' }}
											>
												Register ▾
											</button>
											{showRegisterMenu && (
												<div id="register-menu" role="menu" aria-label="Register" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 240, background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 12px 24px rgba(0,0,0,0.2)', zIndex: 12000 }}>
													<Link role="menuitem" to="/register?role=customer" onClick={() => setShowRegisterMenu(false)} style={{ display: 'block', padding: '10px 12px', color: '#111827', textDecoration: 'none' }}>Register as Buyer</Link>
													<Link role="menuitem" to="/vendor/register" onClick={() => setShowRegisterMenu(false)} style={{ display: 'block', padding: '10px 12px', color: '#111827', textDecoration: 'none' }}>Register as Seller</Link>
												</div>
											)}
										</div>

										{/* Ensure account menu has Register, Sign In, Logout already; chooser above */}

										{/* Cart with icon and count */}
										<span style={{ position: 'relative', display: 'inline-block' }}>
											<Link to="/cart" aria-label={`Cart${cartCount ? ` (${cartCount} items)` : ''}`} data-testid="cart-link" title="Cart" style={{ color: 'var(--header-link, #fff)', textDecoration: 'none', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
												<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
													<path d="M6 6h15l-1.5 9h-12L6 6z" stroke="currentColor" strokeWidth="1.6" fill="none"/>
													<circle cx="9" cy="20" r="1.5" fill="currentColor"/>
													<circle cx="18" cy="20" r="1.5" fill="currentColor"/>
												</svg>
												<span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Cart</span>
											</Link>
											{cartCount > 0 && (
												<span aria-hidden="true" style={{ position: 'absolute', top: -8, right: -14, background: 'var(--color-primary)', color: '#fff', borderRadius: 999, fontSize: 10, lineHeight: '14px', padding: '0 5px', minWidth: 16, textAlign: 'center', fontWeight: 400, border: '2px solid var(--nav-bg, transparent)' }}>{cartCount > 99 ? '99+' : cartCount}</span>
											)}
										</span>
									</>
								) : (
									<>
										{/* Non-vendor (customer/admin) retain richer links */}
										{roleNav.slice(0, 0).map(() => null) /* reserved */}
										{/* Authenticated account dropdown (first name label) */}
										<div style={{ position: 'relative' }} ref={accountRef}>
											{(() => {
												const firstName = ((user?.name || user?.username || '').toString().trim().split(/\s+/)[0]) || 'Account';
												return (
													<button type="button" aria-label="My Account" aria-haspopup="menu" aria-expanded={showAccount} aria-controls="auth-account-menu" onClick={() => setShowAccount(v => !v)} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.35)', color: 'var(--header-link, #fff)', padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}>
														{firstName} ▾
													</button>
												);
											})()}
											{showAccount && (
												<div id="auth-account-menu" role="menu" aria-label="Account" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 240, background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 12px 24px rgba(0,0,0,0.2)', zIndex: 12000 }}>
													<Link role="menuitem" to="/account/dashboard" onClick={() => setShowAccount(false)} style={{ display: 'block', padding: '10px 12px', color: '#111827', textDecoration: 'none' }}>My Account</Link>
													<button role="menuitem" onClick={() => { setShowAccount(false); handleLogout(); }} data-testid="logout-btn" style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, padding: '10px 12px', cursor: 'pointer', color: '#b91c1c' }}>Logout</button>
												</div>
											)}
										</div>
										<span style={{ position: 'relative', display: 'inline-block' }}>
											<Link to="/cart" aria-label={`Cart${cartCount ? ` (${cartCount} items)` : ''}`} data-testid="cart-link" title="Cart" style={{ color: 'var(--header-link, #fff)', textDecoration: 'none', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
												<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
													<path d="M6 6h15l-1.5 9h-12L6 6z" stroke="currentColor" strokeWidth="1.6" fill="none"/>
													<circle cx="9" cy="20" r="1.5" fill="currentColor"/>
													<circle cx="18" cy="20" r="1.5" fill="currentColor"/>
												</svg>
												<span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Cart</span>
											</Link>
											{cartCount > 0 && (
												<span aria-hidden="true" style={{ position: 'absolute', top: -8, right: -14, background: 'var(--color-primary)', color: '#fff', borderRadius: 999, fontSize: 10, lineHeight: '14px', padding: '0 5px', minWidth: 16, textAlign: 'center', fontWeight: 400, border: '2px solid var(--nav-bg, transparent)' }}>{cartCount > 99 ? '99+' : cartCount}</span>
											)}
										</span>
									</>
								)}
							</>
						)}
					</div>
				</div>

				{/* Desktop Shop by Category mega panel - Layered (vertical tabs) */}
		{!isVendor && showMega && (
					<div ref={megaPanelRef} id="mega-panel" className="mega-panel mega-panel-full mega-light" role="dialog" aria-label="Shop by Category">
							<div className="mega-layered" onMouseLeave={() => setShowMega(false)} style={{ gridTemplateColumns: '260px 1fr 900px' }}>
							<div className="mega-left" role="tablist" aria-orientation="vertical" style={{ background: 'var(--canvas, #f8fafc)', borderRadius: 10, padding: 8 }}>
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
							<form onSubmit={(e) => { e.preventDefault(); const v = searchText.trim(); const cat = searchCat && searchCat !== 'all' ? `&category=${encodeURIComponent(searchCat)}` : ''; addRecent(v); setShowDrawer(false); navigate(v ? `/shop?search=${encodeURIComponent(v)}${cat}` : (cat ? `/shop?${cat.slice(1)}` : '/shop')); }}>
								<div style={{ display: 'flex', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
									<select aria-label="Category" value={searchCat} onChange={(e) => setSearchCat(e.target.value)} style={{ background: '#f3f4f6', color: '#111827', border: 0, borderRight: '1px solid #e5e7eb', padding: '8px 10px', fontSize: 14, fontFamily: 'inherit' }}>
										<option value="all">All</option>
										{getCategoryListFrom(canonCats, lang).map((title) => (<option key={`m-${title}`} value={(title || '').toLowerCase()}>{title}</option>))}
									</select>
									<input placeholder="Search Merkato" value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ flex: 1, background: 'transparent', color: '#111827', border: 0, padding: '8px 10px', fontFamily: 'inherit' }} />
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
							{effectiveMegaMenu.map((c) => (
								<Link key={`m-cat-${c.title}`} to={`/shop?category=${encodeURIComponent((c.title || '').toLowerCase())}`} onClick={() => setShowDrawer(false)}>{c.title}</Link>
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
									<Link to="/login" onClick={() => setShowDrawer(false)}>Sign In</Link>
									<Link to="/register?role=customer" data-testid="navbar-register-link" onClick={() => setShowDrawer(false)}>Register</Link>
									<Link to="/vendor/register" onClick={() => setShowDrawer(false)}>Sell on Merkato</Link>
									{/* Public CTA moved to MicroBanner promo */}
								</>
							)}
							<span style={{ position: 'relative', display: 'inline-block' }}>
								<Link to="/cart" aria-label={`Cart${cartCount ? `, ${cartCount} items` : ''}`} data-testid="cart-link" onClick={() => setShowDrawer(false)}>Cart</Link>
								{cartCount > 0 && (
									<span aria-hidden="true" style={{ position: 'absolute', top: -8, right: -14, background: 'var(--color-primary)', color: '#fff', borderRadius: 999, fontSize: 10, lineHeight: '14px', padding: '0 5px', minWidth: 16, textAlign: 'center', fontWeight: 700, border: '2px solid #1f2236' }}>{Math.min(99, cartCount)}</span>
								)}
							</span>
						</section>
						<section style={{ marginTop: 'auto' }}>
							<div style={{ display: 'flex', gap: 8 }}>
								<select aria-label="Language" value={lang} onChange={(e) => onLangChange(e.target.value)} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 10px' }}>
									{LANGUAGE_OPTIONS.map(([code, label]) => (
										<option key={`m-lang-${code}`} value={code}>{label}</option>
									))}
								</select>
								<select aria-label="Currency" value={currency} onChange={(e) => onCurrencyChange(e.target.value)} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 10px' }}>
									{CURRENCY_OPTIONS.map(([code, label]) => (
										<option key={`m-cur-${code}`} value={code}>{label}</option>
									))}
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
