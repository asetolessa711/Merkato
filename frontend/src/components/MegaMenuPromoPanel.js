import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

// Admin-managed storage key (JSON array of promo blocks)
// Shape: { id, title, text, ctaText, href, image, type: 'image'|'text'|'cta', categories?: string[], subcategories?: string[], startAt?, endAt?, enabled? }
export const MEGA_PROMOS_KEY = 'merkato-mega-promos';

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

// Fallback promos when none configured (customer-focused)
const DEFAULT_PROMOS = [
  // New Arrivals
  {
    id: 'global-new-1',
    title: 'New Arrivals',
    text: "Fresh finds just dropped — explore what's new.",
    ctaText: 'Shop New In',
    href: '/shop?sort=new',
    type: 'text',
    enabled: true,
  },
  {
    id: 'global-new-2',
    title: 'New Arrivals',
    text: "Hot off the shelf — shop today's newest picks.",
    ctaText: "See What's New",
    href: '/shop?sort=new',
    type: 'text',
    enabled: true,
  },
  // Top Picks
  {
    id: 'global-top-1',
    title: 'Top Picks',
    text: "Our favorites, your future obsessions. See what's trending.",
    ctaText: 'View Top Picks',
    href: '/shop?sort=trending',
    type: 'text',
    enabled: true,
  },
  {
    id: 'global-top-2',
    title: 'Top Picks',
    text: 'Curated by Merkato, loved by shoppers. View top picks.',
    ctaText: 'Trending Now',
    href: '/shop?sort=trending',
    type: 'text',
    enabled: true,
  },
  // Best Sellers
  {
    id: 'global-best-1',
    title: 'Best Sellers',
    text: "Selling fast — grab the best before they're gone.",
    ctaText: 'Shop Best Sellers',
    href: '/shop?sort=best',
    type: 'text',
    enabled: true,
  },
  {
    id: 'global-best-2',
    title: 'Best Sellers',
    text: 'Join thousands who chose these best sellers.',
    ctaText: 'See Most-Loved',
    href: '/shop?sort=best',
    type: 'text',
    enabled: true,
  },
  // Utility/seasonal
  {
    id: 'global-deal-1',
    title: 'Limited-time deals',
    text: 'Limited-time deals on top picks — shop now.',
    ctaText: 'Grab the Deal',
    href: '/shop?deal=top-picks',
    type: 'cta',
    enabled: true,
  },
  {
    id: 'global-free-ship',
    title: 'Free Shipping',
    text: '📦 Free shipping on new arrivals this week.',
    ctaText: 'Shop New Arrivals',
    href: '/shop?sort=new&promo=free-ship',
    type: 'cta',
    enabled: true,
  },
  {
    id: 'global-wishlist',
    title: 'Your Wishlist',
    text: '🛒 Your wishlist is waiting — check your saved items.',
    ctaText: 'Open Wishlist',
    href: '/account/wishlist',
    type: 'cta',
    enabled: true,
  },
  {
    id: 'global-vendor-spotlight',
    title: 'Vendor Spotlight',
    text: '💬 Meet the makers behind our best sellers — vendor spotlight.',
    ctaText: 'Explore Stories',
    href: '/stories/vendors',
    type: 'text',
    enabled: true,
  },
];

// Optional global controls via localStorage (no UI dependency):
//  - merkato-mega-promo-mode: 'default' | 'minimal' | 'off'
//      default: colorful gradient; minimal: single-color, blended; off: hide panel entirely
//  - merkato-mega-promo-hide: 'true' | 'false' (legacy alias for 'off')
export default function MegaMenuPromoPanel({ activeCategory, activeSubcategory }) {
  const [version, setVersion] = useState(0);
  const [index, setIndex] = useState(0);

  // Listen for admin updates (storage + custom event)
  useEffect(() => {
    const onStorage = (e) => {
      if (e && e.key && e.key !== MEGA_PROMOS_KEY) return;
      setVersion((v) => v + 1);
    };
    const onCustom = () => setVersion((v) => v + 1);
    window.addEventListener('storage', onStorage);
    window.addEventListener('mega-promo:updated', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('mega-promo:updated', onCustom);
    };
  }, []);

  const promos = useMemo(() => {
    const now = Date.now();
    try {
      const raw = localStorage.getItem(MEGA_PROMOS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          return arr.filter((p) => (p?.enabled ?? true) && withinWindow(p?.startAt, p?.endAt, now));
        }
      }
    } catch {}
    return DEFAULT_PROMOS;
  }, [version]);

  // Panel mode and global hide flag
  const panelMode = useMemo(() => {
    try {
      const m = String(localStorage.getItem('merkato-mega-promo-mode') || 'minimal').toLowerCase();
      return ['default', 'minimal', 'off'].includes(m) ? m : 'minimal';
    } catch {
      return 'minimal';
    }
  }, [version]);
  const hidden = useMemo(() => {
    try {
      const v = String(localStorage.getItem('merkato-mega-promo-hide') || '').toLowerCase();
      return v === 'true' || v === '1' || panelMode === 'off';
    } catch {
      return panelMode === 'off';
    }
  }, [version, panelMode]);

  // Choose matching promos list: priority subcategory > category > all; rotate over matches
  const matches = useMemo(() => {
    const sub = (activeSubcategory || '').toLowerCase();
    const cat = (activeCategory || '').toLowerCase();
    const bySub = promos.filter((p) => Array.isArray(p.subcategories) && p.subcategories.some((s) => String(s).toLowerCase() === sub));
    if (bySub.length) return bySub;
    const byCat = promos.filter((p) => Array.isArray(p.categories) && p.categories.some((c) => String(c).toLowerCase() === cat));
    if (byCat.length) return byCat;
    return promos;
  }, [promos, activeCategory, activeSubcategory]);

  // Reset rotation index when context changes
  useEffect(() => { setIndex(0); }, [activeCategory, activeSubcategory, promos]);

  // Auto-rotate through matches
  useEffect(() => {
    if (!matches.length) return undefined;
    // Reduce motion in minimal mode
    try {
      const m = String(localStorage.getItem('merkato-mega-promo-mode') || 'minimal').toLowerCase();
      if (m === 'minimal') return undefined;
    } catch {}
    const ROTATE_MS = 5000;
    const id = setInterval(() => setIndex((i) => (i + 1) % matches.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [matches]);

  const selected = matches.length ? matches[Math.min(index, matches.length - 1)] : null;

  // Prefer explicit promo href; else link to hovered main category; else Shop
  const computedHref = useMemo(() => {
    if (selected?.href) return selected.href;
    const cat = (activeCategory || '').trim();
    if (cat) return `/shop?category=${encodeURIComponent(cat.toLowerCase())}`;
    return '/shop';
  }, [selected, activeCategory]);

  if (hidden || !selected) return null;

  const handleClick = () => {
    const href = computedHref;
    if (!href) return;
    if (/^https?:\/\//i.test(href)) {
      window.location.href = href;
    } else {
      // Allow SPA navigation by emitting an intent; Navbar is within Router
      try {
        const navEvent = new CustomEvent('mega-promo:navigate', { detail: { href } });
        window.dispatchEvent(navEvent);
      } catch {}
    }
  };

  const isMinimal = panelMode === 'minimal';
  const cardBg = isMinimal
    ? 'var(--mega-promo-bg, var(--surface))'
    : 'var(--mega-promo-bg, linear-gradient(90deg, var(--grad-bolt-start), var(--grad-bolt-end)))';
  const borderCol = isMinimal
    ? 'var(--mega-promo-border, var(--border))'
    : 'var(--mega-promo-border, color-mix(in srgb, #000 15%, transparent))';
  const baseFg = isMinimal ? 'var(--mega-promo-fg, var(--slate))' : 'var(--mega-promo-fg, #fff)';

  return (
    <aside
      role="complementary"
      aria-label="Featured promotion"
      style={{
        borderLeft: '1px solid var(--mega-promo-border, rgba(255,255,255,0.12))',
        paddingLeft: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        color: baseFg,
      }}
    >
      <div
        role={computedHref ? 'button' : undefined}
        aria-label={selected.ctaText || selected.title || selected.text || 'Open promotion'}
        tabIndex={computedHref ? 0 : undefined}
        onKeyDown={(e) => { if (!computedHref) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
        onClick={handleClick}
        style={{
          // Minimal mode uses a single-color/neutral card to avoid visual congestion
          background: cardBg,
          border: `1px solid ${borderCol}`,
          borderRadius: 14,
          overflow: 'hidden',
          cursor: computedHref ? 'pointer' : 'default',
          minHeight: 320,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* In minimal mode, hide images to keep the palette restrained */}
        {!isMinimal && selected.image ? (
          <div style={{ position: 'relative' }}>
            <img src={selected.image} alt="" aria-hidden="true" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
          </div>
        ) : null}
        <div style={{ padding: 16 }}>
          {selected.title && (
            <div style={{ fontWeight: 900, fontSize: 20, lineHeight: 1.1, marginBottom: 8, opacity: isMinimal ? 0.95 : 1 }}>{selected.title}</div>
          )}
          {selected.text && (
            <div style={{ fontSize: 14, opacity: isMinimal ? 0.9 : 0.95, marginBottom: 12 }}>{selected.text}</div>
          )}
          {selected.ctaText && (
            <button
              type="button"
              className={isMinimal ? 'btn btn-secondary' : 'btn btn-primary'}
              onClick={handleClick}
            >
              {selected.ctaText}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

MegaMenuPromoPanel.propTypes = {
  activeCategory: PropTypes.string,
  activeSubcategory: PropTypes.string,
};
