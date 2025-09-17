// src/components/MicroBanner.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

// Storage key for persisted microbanners
export const MICRO_BANNER_KEY = 'merkato-microbanners';
export const TRUST_MESSAGES_KEY = 'merkato-trust-messages';

// Default suggestions (used only when no admin data exists)
const DEFAULT_SUGGESTIONS = [
  { id: 'start-1', text: 'Become a Vendor: Start selling on Merkato \u00B7 Apply now', type: 'promo', action: 'link', href: '/vendor/register', enabled: true },
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

// Visual style map based on type; uses theme CSS variables
const typeStyles = {
  promo: {
    bg: 'var(--microbanner-bg, var(--color-warning))',
    fg: 'var(--microbanner-fg, #2C2E43)'
  },
  info: {
    bg: 'var(--microbanner-bg-info, var(--color-info, #e0f2fe))',
    fg: 'var(--microbanner-fg-info, #0f172a)'
  },
  cultural: {
    bg: 'var(--microbanner-bg-cultural, var(--color-accent, #fde68a))',
    fg: 'var(--microbanner-fg-cultural, #1f2937)'
  }
};

const ROTATE_MS = 5000;

function MicroBanner({ messagesOverride }) {
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const [openModal, setOpenModal] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef(null);
  const [paused, setPaused] = useState(false);

  // Listen for updates from Admin panel or other tabs
  useEffect(() => {
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
  }, []);

  const messages = useMemo(() => {
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
  }, [messagesOverride, version]);

  // Blend in trust messages in a microbanner-style narrow ticker. Modes: 'mix' (default), 'off'
  const blendedMessages = useMemo(() => {
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
    // Interleave promos with trust messages 1:1 where possible to keep variety
    const out = [];
    const maxLen = Math.max(messages.length, trust.length);
    for (let i = 0; i < maxLen; i++) {
      if (messages[i]) out.push(messages[i]);
      if (trust[i % trust.length]) out.push(trust[i % trust.length]);
    }
    return out;
  }, [messages, version]);

  // Auto-rotate
  useEffect(() => {
    clearInterval(timerRef.current);
    if (paused || blendedMessages.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIdx((i) => (i + 1) % blendedMessages.length);
    }, ROTATE_MS);
    return () => clearInterval(timerRef.current);
  }, [blendedMessages, paused]);

  // Reset index when messages change
  useEffect(() => { setActiveIdx(0); }, [blendedMessages.length]);

  if (!blendedMessages.length) return null;
  const m = blendedMessages[Math.max(0, Math.min(activeIdx, blendedMessages.length - 1))];
  // Trust green style (recognizable), overridable via CSS vars
  const trustStyle = {
    bg: 'var(--microbanner-bg-trust, var(--trust-green-bg, #dcfce7))', // green-100
    fg: 'var(--microbanner-fg-trust, var(--trust-green-fg, #065f46))', // emerald-800
  };
  let style = (typeStyles[m?.type] || typeStyles.promo);
  let forceGreen = false;
  try { forceGreen = String(localStorage.getItem('trust-ticker-bargreen') || 'false').toLowerCase() === 'true'; } catch(_) {}
  if (m?.type === 'trust' || forceGreen) style = trustStyle;

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
        className="microbanner"
        role="region"
        aria-label="Promotions"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        style={{
          background: style.bg,
          color: style.fg,
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          padding: '6px 12px',
          fontWeight: 600,
          fontSize: 12,
          cursor: 'pointer',
          position: 'relative'
        }}
        onClick={handleClick}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {/* Tiny type chip for subtle context */}
            <span aria-hidden="true" style={{ fontSize: 10, padding: '2px 6px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 999, background: 'rgba(255,255,255,0.6)', color: '#111' }}>
              {m?.type || 'promo'}
            </span>
            <span data-testid="microbanner-text">{m?.text}</span>
          </div>
      {blendedMessages.length > 1 && (
            <div aria-hidden="true" style={{ display: 'flex', gap: 6 }}>
        {blendedMessages.map((_, i) => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: 999, background: i === activeIdx ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.25)' }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {openModal && (
        <div role="dialog" aria-modal="true" aria-label="Promotion details" onClick={() => setOpenModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', color: '#111', maxWidth: 520, width: '90%', borderRadius: 12, padding: 18, boxShadow: '0 12px 24px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{openModal.title}</strong>
              <button onClick={() => setOpenModal(null)} aria-label="Close" style={{ background: 'transparent', border: '1px solid #e5e7eb', padding: '2px 8px', borderRadius: 6 }}>✕</button>
            </div>
            <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{openModal.body}</div>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button onClick={() => setOpenModal(null)} style={{ background: 'var(--color-primary)', color: '#fff', border: 0, padding: '8px 12px', borderRadius: 8 }}>Close</button>
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
