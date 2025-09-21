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
	{ id: 'new-1', text: 'Fresh finds just dropped — explore what’s new.', type: 'info', action: 'link', href: '/shop?sort=new', enabled: true },
	{ id: 'top-1', text: 'Our favorites, your future obsessions. See what’s trending.', type: 'promo', action: 'link', href: '/shop?sort=top', enabled: true },
	{ id: 'best-1', text: 'Selling fast — grab the best before they’re gone.', type: 'promo', action: 'link', href: '/shop?sort=best', enabled: true },
	{ id: 'bonus-ship', text: '📦 Free shipping on new arrivals this week.', type: 'promo', action: 'link', href: '/shop?tag=new', enabled: true },
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
const typeStyles = {
	promo: {
		bg: 'var(--mb-promo-bg, var(--microbanner-bg, color-mix(in srgb, var(--warning) 12%, transparent)))',
		fg: 'var(--mb-promo-fg, var(--microbanner-fg, var(--ink)))',
		br: 'var(--mb-promo-br, var(--border))'
	},
	info: {
		bg: 'var(--mb-info-bg, var(--microbanner-bg-info, color-mix(in srgb, var(--info) 12%, transparent)))',
		fg: 'var(--mb-info-fg, var(--microbanner-fg-info, var(--ink)))',
		br: 'var(--mb-info-br, var(--border))'
	},
	cultural: {
		bg: 'var(--mb-promo-bg, var(--microbanner-bg-cultural, color-mix(in srgb, var(--accent) 20%, transparent)))',
		fg: 'var(--mb-promo-fg, var(--microbanner-fg-cultural, var(--ink)))',
		br: 'var(--mb-promo-br, var(--border))'
	}
};

const ROTATE_MS = 5000;

function MicroBanner({ messagesOverride, alwaysShow = false }) {
	const navigate = useNavigate();
	const location = useLocation();
	const [version, setVersion] = useState(0);
	const [openModal, setOpenModal] = useState(null);
	// Rotation state
	const [activeIdx, setActiveIdx] = useState(0);
	const timerRef = useRef(null);
	const [paused, setPaused] = useState(false);

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

	// Blend promos with trust messages 1:1 and rotate
	const blendedMessages = useMemo(() => {
		if (hideOnAdmin) return [];
		let mode = 'mix';
		try { mode = String(localStorage.getItem('trust-ticker-mode') || 'mix').toLowerCase(); } catch(_) {}
		if (mode === 'off') return messages;
		// Load trust messages from admin storage if present, else fall back to defaults
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
		// Interleave promos with trust messages 1:1
		const out = [];
		const maxLen = Math.max(messages.length, trust.length);
		for (let i = 0; i < maxLen; i++) {
			if (messages[i]) out.push(messages[i]);
			if (trust[i % trust.length]) out.push(trust[i % trust.length]);
		}
		return out;
	}, [messages, version, hideOnAdmin]);

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

	// Finally, render nothing on admin pages or when there are no messages
		if (hideOnAdmin || !blendedMessages.length) return null;
		const m = blendedMessages[Math.max(0, Math.min(activeIdx, blendedMessages.length - 1))];
	// Trust green style (recognizable), overridable via CSS vars
    const trustStyle = {
	    bg: 'var(--mb-trust-bg, var(--microbanner-bg-trust, color-mix(in srgb, var(--success) 15%, transparent)))',
	    fg: 'var(--mb-trust-fg, var(--microbanner-fg-trust, var(--success)))',
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
			};
		}

		const handleClick = () => {
		if (!m) return;
		if (m.action === 'modal') {
			setOpenModal({ title: m.modalTitle || 'Details', body: m.modalBody || m.text });
		} else if (m.action === 'link' && m.href) {
			if (/^https?:\/\//i.test(m.href)) {
				window.location.href = m.href;
			} else {
				navigate(m.href);
			}
		}
	};

	return (
		<>
			<div
				className={styles.microbanner}
				role="region"
				aria-label="Promotions"
				onMouseEnter={() => setPaused(true)}
				onMouseLeave={() => setPaused(false)}
				style={{
					background: style.bg,
					color: style.fg,
					borderBottom: `1px solid ${style.br || 'var(--border)'}`
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
	messagesOverride: PropTypes.array
};

export default React.memo(MicroBanner);
