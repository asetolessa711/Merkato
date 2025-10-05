import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './MicroBanner.module.css';

// Storage key for persisted microbanners
export const MICRO_BANNER_KEY = 'merkato-microbanners';
export const TRUST_MESSAGES_KEY = 'merkato-trust-messages';

// Default suggestions (used only when no admin data exists)
const DEFAULT_SUGGESTIONS = [
	{ id: 'start-1', text: 'Become a Vendor: Start selling on Merkato · Apply now', type: 'promo', action: 'link', href: '/vendor/register', enabled: true },
	{ id: 'new-1', text: 'Fresh finds just dropped — explore what’s new.', type: 'info', action: 'link', href: '/discover', enabled: true },
	{ id: 'top-1', text: 'Our favorites, your future obsessions. See what’s trending.', type: 'promo', action: 'link', href: '/discover', enabled: true },
	{ id: 'best-1', text: 'Selling fast — grab the best before they’re gone.', type: 'promo', action: 'link', href: '/discover', enabled: true },
	{ id: 'bonus-ship', text: '📦 Free shipping on new arrivals this week.', type: 'promo', action: 'link', href: '/discover', enabled: true },
];

// Compact trust messages to interleave into the micro banner for dynamic trust signaling
export const DEFAULT_TRUST_MESSAGES = [
	{ id: 'trust-secure', text: '✓ Secure checkout', type: 'trust', enabled: true },
	{ id: 'trust-verified', text: '✔ Verified vendors', type: 'trust', enabled: true },
	{ id: 'trust-returns', text: '↺ Free returns', type: 'trust', enabled: true },
	{ id: 'trust-protect', text: '🛡 Buyer protection', type: 'trust', enabled: true },
];

function withinWindow(startAt, endAt, now) {
	if (!startAt && !endAt) return true;
	try {
		const s = startAt ? new Date(startAt).getTime() : -Infinity;
		const e = endAt ? new Date(endAt).getTime() : Infinity;
		return now >= s && now <= e;
	} catch {
		return true;
	}
}

// Visual style map based on type; use new --mb-* variables with back-compat fallbacks
// Prefer neutral/blue/amber tints for micro-banner to avoid matching hero mint
const typeStyles = {
	promo: {
		// amber-50 like: #FFF7ED fallback
		bg: 'var(--mb-promo-bg, #FFF7ED)',
		fg: 'var(--mb-promo-fg, color-mix(in srgb, var(--ink) 85%, transparent))',
		br: 'var(--mb-promo-br, var(--border))'
	},
	info: {
		// blue-50 like: #EFF6FF fallback
		bg: 'var(--mb-info-bg, #EFF6FF)',
		fg: 'var(--mb-info-fg, color-mix(in srgb, var(--ink) 85%, transparent))',
		br: 'var(--mb-info-br, var(--border))'
	},
	cultural: {
		// neutral-100 like: #F1F5F9 fallback
		bg: 'var(--mb-cultural-bg, #F1F5F9)',
		fg: 'var(--mb-cultural-fg, color-mix(in srgb, var(--ink) 85%, transparent))',
		br: 'var(--mb-cultural-br, var(--border))'
	},
	neutral: {
		// slate-50 like: #F8FAFC fallback
		bg: 'var(--mb-neutral-bg, #F8FAFC)',
		fg: 'var(--mb-neutral-fg, color-mix(in srgb, var(--ink) 85%, transparent))',
		br: 'var(--mb-neutral-br, var(--border))'
	},
	warning: {
		// amber-100 like: #FEF3C7 fallback
		bg: 'var(--mb-warning-bg, #FEF3C7)',
		fg: 'var(--mb-warning-fg, color-mix(in srgb, var(--ink) 85%, transparent))',
		br: 'var(--mb-warning-br, var(--border))'
	},
	danger: {
		// red-50 like: #FEF2F2 fallback
		bg: 'var(--mb-danger-bg, #FEF2F2)',
		fg: 'var(--mb-danger-fg, color-mix(in srgb, var(--ink) 85%, transparent))',
		br: 'var(--mb-danger-br, var(--border))'
	}
};

const ROTATE_MS = 5000;

function MicroBanner({ messagesOverride, alwaysShow = false, className, previewMode = false, previewAllowDismiss = false, previewAllowNavigate = false, variant = 'default', fullBleedBg = true }) {
	const navigate = useNavigate();
	const location = useLocation();
	const [version, setVersion] = useState(0);
	const [openModal, setOpenModal] = useState(null);
	// Rotation state
	const [activeIdx, setActiveIdx] = useState(0);
	const timerRef = useRef(null);
	const [paused, setPaused] = useState(false);
    // In preview, track ephemeral dismissals without touching storage
    const [previewDismissed, setPreviewDismissed] = useState(() => new Set());

	// Context: page, audience, region, language
	const ctx = useMemo(() => {
		const path = location?.pathname || '/';
		const page = path === '/' ? 'home'
			: path.startsWith('/category') ? 'category'
			: path.startsWith('/product') ? 'product'
			: path.startsWith('/cart') ? 'cart'
			: path.startsWith('/checkout') ? 'checkout'
			: 'other';
		let audience = 'guest';
		try {
			audience = localStorage.getItem('userRole')
				|| localStorage.getItem('role')
				|| localStorage.getItem('app:audience')
				|| 'guest';
		} catch {}
		audience = String(audience).toLowerCase();
		let region = 'US';
		try {
			region = localStorage.getItem('region')
				|| localStorage.getItem('country')
				|| localStorage.getItem('app:region')
				|| region;
		} catch {}
		region = String(region).toUpperCase();
		let lang = 'en';
		try {
			const nav = (navigator && navigator.language) || 'en';
			lang = (localStorage.getItem('language') || localStorage.getItem('app:lang') || nav || 'en').slice(0,2);
		} catch { lang = 'en'; }
		return { page, audience, region, lang };
	}, [location?.pathname]);

	// Determine if we should hide on admin routes, but do NOT early-return before hooks
	const hideOnAdmin = useMemo(() => {
		const p = location?.pathname || '';
			return !alwaysShow && (p === '/admin' || p.startsWith('/admin/'));
		}, [location?.pathname, alwaysShow]);

	// Listen for updates from Admin panel or other tabs
	useEffect(() => {
		if (hideOnAdmin) return; // don't attach listeners if hidden
		const onStorage = (e) => {
			if (e && e.key && e.key !== MICRO_BANNER_KEY) return;
			setVersion((v) => v + 1);
		};
		const onCustom = () => setVersion((v) => v + 1);
		const onTrust = () => setVersion((v) => v + 1);
		window.addEventListener('storage', onStorage);
		window.addEventListener('microbanner:updated', onCustom);
		window.addEventListener('trust:updated', onTrust);
		return () => {
			window.removeEventListener('storage', onStorage);
			window.removeEventListener('microbanner:updated', onCustom);
			window.removeEventListener('trust:updated', onTrust);
		};
	}, [hideOnAdmin]);

	const messages = useMemo(() => {
		if (hideOnAdmin) return [];
		const now = Date.now();
		try {
			if (Array.isArray(messagesOverride)) {
				const base = messagesOverride.filter((m) => (m?.enabled ?? true) && withinWindow(m?.startAt, m?.endAt, now));
				return base;
			}
			const raw = localStorage.getItem(MICRO_BANNER_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					const act = parsed.filter((m) => (m?.enabled ?? true) && withinWindow(m?.startAt, m?.endAt, now));
					return act.length ? act : DEFAULT_SUGGESTIONS;
				}
			}
		} catch {}
		return DEFAULT_SUGGESTIONS;
	}, [messagesOverride, version, hideOnAdmin]);

	// Frequency/dismiss helpers
	const todayStr = () => {
		const d = new Date();
		const mm = String(d.getMonth()+1).padStart(2,'0');
		const dd = String(d.getDate()).padStart(2,'0');
		return `${d.getFullYear()}-${mm}-${dd}`;
	};
	const seenKey = (id) => `mb-seen-${id}`;
	const seenSessionKey = (id) => `mb-seen-session-${id}`;
	const dismissSessionKey = (id) => `mb-dismissed-session-${id}`;
	const dismissDayKey = (id) => `mb-dismissed-day-${id}`;

	const hasSeen = (m) => {
		const id = m?.id;
		if (!id) return false;
		const cap = m?.freqCap || 'oncePerSession';
		try {
			if (cap === 'always') return false;
			if (cap === 'oncePerSession') {
				return !!sessionStorage.getItem(seenSessionKey(id));
			}
			if (cap === 'oncePerDay') {
				const d = localStorage.getItem(seenKey(id));
				return d === todayStr();
			}
		} catch {}
		return false;
	};
	const markSeen = (m) => {
		const id = m?.id;
		if (!id) return;
		const cap = m?.freqCap || 'oncePerSession';
		try {
			if (cap === 'oncePerSession') {
				sessionStorage.setItem(seenSessionKey(id), '1');
			} else if (cap === 'oncePerDay') {
				localStorage.setItem(seenKey(id), todayStr());
			}
			// Metrics: impression
			try {
				const key = 'mb-metrics';
				const raw = localStorage.getItem(key);
				const obj = raw ? JSON.parse(raw) : {};
				const cur = obj[id] || { impressions: 0, clicks: 0, dismisses: 0 };
				cur.impressions += 1;
				obj[id] = cur;
				localStorage.setItem(key, JSON.stringify(obj));
				window.dispatchEvent(new CustomEvent('microbanner:metrics', { detail: { id, type: 'impression', value: cur.impressions } }));
			} catch {}
		} catch {}
	};
	const isDismissed = (m) => {
		const id = m?.id;
		if (!id) return false;
		const cap = m?.freqCap || 'oncePerSession';
		try {
			if (cap === 'oncePerSession' || cap === 'always') {
				return !!sessionStorage.getItem(dismissSessionKey(id));
			}
			if (cap === 'oncePerDay') {
				const d = localStorage.getItem(dismissDayKey(id));
				return d === todayStr();
			}
		} catch {}
		return false;
	};
	const dismiss = (m) => {
		const id = m?.id;
		if (!id) return;
		const cap = m?.freqCap || 'oncePerSession';
		try {
			if (cap === 'oncePerSession' || cap === 'always') {
				sessionStorage.setItem(dismissSessionKey(id), '1');
			} else if (cap === 'oncePerDay') {
				localStorage.setItem(dismissDayKey(id), todayStr());
			}
			// Metrics: dismiss
			try {
				const key = 'mb-metrics';
				const raw = localStorage.getItem(key);
				const obj = raw ? JSON.parse(raw) : {};
				const cur = obj[id] || { impressions: 0, clicks: 0, dismisses: 0 };
				cur.dismisses += 1;
				obj[id] = cur;
				localStorage.setItem(key, JSON.stringify(obj));
				window.dispatchEvent(new CustomEvent('microbanner:metrics', { detail: { id, type: 'dismiss', value: cur.dismisses } }));
			} catch {}
			// trigger recompute
			setVersion((v)=>v+1);
		} catch {}
	};

	// Targeting filter
	const eligibleMessages = useMemo(() => {
		if (hideOnAdmin) return [];
		const a = String(ctx.audience || 'guest').toLowerCase();
		const p = ctx.page;
		const r = String(ctx.region || 'US').toUpperCase();
		const l = String(ctx.lang || 'en').toLowerCase();
		return messages.filter((m) => {
			if (!m) return false;
			if (!previewMode && (isDismissed(m) || hasSeen(m))) return false;
            if (previewMode && m?.id && previewDismissed?.has(m.id)) return false;
			if (Array.isArray(m.audiences) && m.audiences.length) {
				const arr = m.audiences.map((x)=>String(x).toLowerCase());
				if (!arr.includes(a)) return false;
			}
			if (Array.isArray(m.pages) && m.pages.length) {
				const arr = m.pages.map((x)=>String(x).toLowerCase());
				if (!arr.includes(p)) return false;
			}
			if (Array.isArray(m.regions) && m.regions.length) {
				const arr = m.regions.map((x)=>String(x).toUpperCase());
				if (!arr.includes(r)) return false;
			}
			if (m.language && String(m.language).trim().length) {
				const want = String(m.language).toLowerCase();
				if (!l.startsWith(want)) return false;
			}
			return true;
		});
	}, [messages, hideOnAdmin, ctx.audience, ctx.page, ctx.region, ctx.lang, version, previewMode, previewDismissed]);

	// Severity ranking (higher is stronger)
	const severityRank = (t) => {
		switch ((t||'').toLowerCase()) {
			case 'danger': return 60;
			case 'warning': return 50;
			case 'promo': return 40;
			case 'info': return 30;
			case 'trust': return 20;
			case 'neutral': return 10;
			default: return 0;
		}
	};

	const selectedMessage = useMemo(() => {
		if (hideOnAdmin) return null;
		if (!eligibleMessages.length) return null;
		const sorted = [...eligibleMessages].sort((a,b)=>{
			const s = severityRank(b?.type) - severityRank(a?.type);
			if (s !== 0) return s;
			const pa = Number(a?.priority || 0), pb = Number(b?.priority || 0);
			return pb - pa;
		});
		return sorted[0] || null;
	}, [eligibleMessages, hideOnAdmin]);

	// Blend promos with trust messages 1:1 and rotate
	const blendedMessages = useMemo(() => {
		if (hideOnAdmin) return [];
		// If we have a selected message, optionally mix with trust
		let mode = 'mix';
		try { mode = String(localStorage.getItem('trust-ticker-mode') || 'mix').toLowerCase(); } catch(_) {}
		const sel = selectedMessage;
		if (!sel) {
			// No promos eligible; we can show trust only if mode != off
			if (mode === 'off') return [];
			let trust = DEFAULT_TRUST_MESSAGES;
			try {
				const raw = localStorage.getItem(TRUST_MESSAGES_KEY);
				if (raw) {
					const parsed = JSON.parse(raw);
					if (Array.isArray(parsed)) {
						const enabled = parsed.filter(t => (t?.enabled ?? true) && typeof t?.text === 'string' && t.text.trim().length > 0);
						if (enabled.length) trust = enabled;
					}
				}
			} catch {}
			return trust;
		}
		if (mode === 'off') return [sel];
		// Load trust messages and mix: [sel, t1, t2, ...]
		let trust = DEFAULT_TRUST_MESSAGES;
		try {
			const raw = localStorage.getItem(TRUST_MESSAGES_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					const enabled = parsed.filter(t => (t?.enabled ?? true) && typeof t?.text === 'string' && t.text.trim().length > 0);
					if (enabled.length) trust = enabled;
				}
			}
		} catch {}
		return [sel, ...trust];
	}, [selectedMessage, version, hideOnAdmin]);

	// Auto-rotate when multiple messages are present; pause on hover
	useEffect(() => {
		if (hideOnAdmin) return;
		clearInterval(timerRef.current);
		if (paused || blendedMessages.length <= 1) return;
		timerRef.current = setInterval(() => {
			setActiveIdx((i) => (i + 1) % blendedMessages.length);
		}, ROTATE_MS);
		return () => clearInterval(timerRef.current);
	}, [blendedMessages, paused, hideOnAdmin]);

	// Reset index when message set changes
	useEffect(() => {
		if (hideOnAdmin) return;
		setActiveIdx(0);
	}, [blendedMessages.length, hideOnAdmin]);

	// Mark impression when selected message changes
	useEffect(() => {
		if (!selectedMessage) return;
		if (!previewMode) {
			markSeen(selectedMessage);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedMessage?.id]);

	// Finally, render nothing on admin pages or when there are no messages
	if ((hideOnAdmin && !alwaysShow) || !blendedMessages.length) return null;
	const m = blendedMessages[Math.max(0, Math.min(activeIdx, blendedMessages.length - 1))];
	// Trust green style (recognizable), overridable via CSS vars
	const trustStyle = {
		// mint-50 like: #ECFDF5 fallback, but desaturated to avoid hero collision
		bg: 'var(--mb-trust-bg, #ECFDF5)',
		fg: 'var(--mb-trust-fg, color-mix(in srgb, var(--success) 60%, var(--ink) 40%))',
		br: 'var(--mb-trust-br, var(--border))',
	};
		let style = (typeStyles[m?.type] || typeStyles.promo);
	let forceGreen = false;
	try { forceGreen = String(localStorage.getItem('trust-ticker-bargreen') || 'false').toLowerCase() === 'true'; } catch(_) {}
		if (m?.type === 'trust' || forceGreen) style = trustStyle;
		// Per-message overrides: allow admin-defined bg/fg
		if (m?.bg || m?.fg) {
			style = {
				bg: m.bg || style.bg,
				fg: m.fg || style.fg,
				br: style.br
			};
		}

		const handleClick = () => {
		if (!m) return;
		if (m.action === 'modal') {
			setOpenModal({ title: m.modalTitle || 'Details', body: m.modalBody || m.text });
		} else if (m.action === 'link' && m.href) {
			if (!previewMode || (previewMode && previewAllowNavigate)) {
				if (/^https?:\/\//i.test(m.href)) {
					window.location.href = m.href;
				} else {
					navigate(m.href);
				}
			}
		}
		// Metrics: click
		try {
			if (!previewMode && m?.id) {
				const key = 'mb-metrics';
				const raw = localStorage.getItem(key);
				const obj = raw ? JSON.parse(raw) : {};
				const cur = obj[m.id] || { impressions: 0, clicks: 0, dismisses: 0 };
				cur.clicks += 1;
				obj[m.id] = cur;
				localStorage.setItem(key, JSON.stringify(obj));
				window.dispatchEvent(new CustomEvent('microbanner:metrics', { detail: { id: m.id, type: 'click', value: cur.clicks } }));
			}
		} catch {}
	};

    return (
		<>
			<div
				className={`${styles.microbanner}${(selectedMessage?.stickyDesktopOnly && (typeof window!=='undefined' ? window.innerWidth >= 1024 : true)) ? ` ${styles.stickyDesktop}` : ''}${variant === 'compact' ? ` ${styles.microCompact}` : ''}${fullBleedBg ? ` ${styles.microFullBleed}` : ''}${className ? ` ${className}` : ''}`}
				role="region"
				aria-label="Promotions"
				onMouseEnter={() => setPaused(true)}
				onMouseLeave={() => setPaused(false)}
				style={{
					background: fullBleedBg ? style.bg : 'transparent',
					color: style.fg,
					borderBottom: `1px solid ${fullBleedBg ? (style.br || 'var(--border)') : 'transparent'}`
				}}
				onClick={handleClick}
			>
				<div className={styles.container}>
					<div className={styles.left}>
						{/* Tiny type chip for subtle context */}
						<span aria-hidden="true" className={styles.typeChip}>
							{m?.type || 'promo'}
						</span>
						<span data-testid="microbanner-text" className={styles.text}>{m?.text}</span>
					</div>
					{/* Optional CTA label inline */}
					{m?.cta && (
						<button
							type="button"
							onClick={handleClick}
							className={styles.cta}
							aria-label={typeof m.cta === 'string' ? m.cta : 'Learn more'}
						>
							{typeof m.cta === 'string' ? m.cta : 'Learn more'}
						</button>
					)}
					{/* Dismiss button if allowed (trust non-dismissible by default) */}
					{(
						// In preview, controlled by toggle; otherwise, trust is non-dismissible by default
						previewMode ? previewAllowDismiss : (m?.type === 'trust' ? m?.dismissible === true : (m?.dismissible ?? true))
					) && (
                        <button
                            type="button"
								onClick={(e)=>{ 
									e.stopPropagation(); 
									if (previewMode) {
										if (m?.id) {
											setPreviewDismissed((prev) => {
												const next = new Set(prev);
												next.add(m.id);
												return next;
											});
											setVersion((v)=>v+1);
										}
									} else {
										dismiss(m);
									}
								}}
                            aria-label="Dismiss banner"
                            className={styles.closeBtn}
                            style={{ marginLeft: 8 }}
                        >
                            ✕
                        </button>
                    )}
					{blendedMessages.length > 1 && (
						<div aria-hidden="true" className={styles.dots}>
							{blendedMessages.map((_, i) => (
								<span key={i} className={`${styles.dot} ${i === activeIdx ? styles.dotActive : ''}`} />
							))}
						</div>
					)}
				</div>
			</div>

			{openModal && (
				<div role="dialog" aria-modal="true" aria-label="Promotion details" onClick={() => setOpenModal(null)} className={styles.modalOverlay}>
					<div onClick={(e) => e.stopPropagation()} className={styles.modalCard}>
						<div className={styles.modalHeader}>
							<strong>{openModal.title}</strong>
							<button onClick={() => setOpenModal(null)} aria-label="Close" className={styles.closeBtn}>✕</button>
						</div>
						<div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{openModal.body}</div>
						<div style={{ marginTop: 12, textAlign: 'right' }}>
							<button onClick={() => setOpenModal(null)} className="btn btn-primary">Close</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

MicroBanner.propTypes = {
	messagesOverride: PropTypes.array,
	previewMode: PropTypes.bool,
	previewAllowDismiss: PropTypes.bool,
	previewAllowNavigate: PropTypes.bool,
};

export default React.memo(MicroBanner);
