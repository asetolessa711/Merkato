import React, { useEffect, useMemo, useRef, useState } from 'react';

function Hero({
  title = 'Discover Daily Deals',
  subtitle = 'Big savings across fashion, electronics, home, and more.',
  ctaText = 'Shop Now',
  onCtaClick,
  secondaryCtaText = 'Explore Categories',
  onSecondaryCtaClick,
  imageSrc = '/images/hero-default.jpg',
  imageAlt = 'Featured promotion',
  variant = 'split', // 'split' | 'overlay' | 'banner'
  // Optional carousel slides; if provided, hero becomes a carousel
  slides,
  autoPlayMs = 5000,
  personalization,
  offsetTop = 8,
  fullBleed = false,
  containerWidth = 1600,
}) {
  const hasSlides = Array.isArray(slides) && slides.length > 0;
  const safeSlides = useMemo(() => {
    if (!hasSlides) return [{ title, subtitle, ctaText, onCtaClick, secondaryCtaText, onSecondaryCtaClick, imageSrc, imageAlt, variant }];
    return slides.map((s) => ({
      title: s.title ?? title,
      subtitle: s.subtitle ?? subtitle,
      ctaText: s.ctaText ?? ctaText,
      onCtaClick: s.onCtaClick ?? onCtaClick,
      secondaryCtaText: s.secondaryCtaText ?? secondaryCtaText,
      onSecondaryCtaClick: s.onSecondaryCtaClick ?? onSecondaryCtaClick,
      imageSrc: s.imageSrc ?? imageSrc,
      imageAlt: s.imageAlt ?? imageAlt,
      variant: s.variant ?? variant,
      bg: s.bg,
    }));
  }, [hasSlides, slides, title, subtitle, ctaText, onCtaClick, secondaryCtaText, onSecondaryCtaClick, imageSrc, imageAlt, variant]);

  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const hoverRef = useRef(false);

  const go = (next) => {
    setIdx((prev) => {
      const n = safeSlides.length;
      return (prev + next + n) % n;
    });
  };

  useEffect(() => {
    if (!hasSlides || safeSlides.length <= 1) return;
    const loop = () => {
      if (!hoverRef.current) go(1);
    };
    timerRef.current = setInterval(loop, Math.max(2000, autoPlayMs));
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [hasSlides, safeSlides.length, autoPlayMs]);

  const active = safeSlides[idx] || safeSlides[0];
  const isBanner = (active.variant || variant) === 'banner';
  const bannerBg = active.bg || 'var(--hero-warm, #FFF3C4)';
  const showNav = hasSlides && safeSlides.length > 1;
  const sideArrowReserve = showNav ? 60 : 0; // reserve space for arrows

  // Lightweight analytics helper
  const track = (event, meta) => {
    try {
      const key = 'merkato-analytics';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      const next = [{ t: Date.now(), e: event, ...meta }].concat(Array.isArray(arr) ? arr : []).slice(0, 200);
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('analytics:click', { detail: { event, ...meta } }));
    } catch (_) {}
  };

  const handlePrimary = () => {
    track('hero:cta', { idx, title: active.title });
    active.onCtaClick && active.onCtaClick();
  };
  const handleSecondary = () => {
    track('hero:secondaryCta', { idx, title: active.title });
    active.onSecondaryCtaClick && active.onSecondaryCtaClick();
  };

  return (
    <section
      aria-label="Featured promotions"
      role="region"
      aria-roledescription={hasSlides ? 'carousel' : undefined}
      onMouseEnter={() => { hoverRef.current = true; }}
      onMouseLeave={() => { hoverRef.current = false; }}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); }}
      style={{
        background: isBanner ? bannerBg : 'linear-gradient(90deg, var(--color-nav) 0%, #353859 50%, #454a6e 100%)',
        color: isBanner ? '#111' : '#fff',
        marginTop: Math.max(12, offsetTop),
        marginBottom: 12,
        borderRadius: fullBleed ? 0 : 12,
        position: 'relative',
        overflow: 'hidden',
      }}
      tabIndex={0}
    >
      <div
        style={{
          maxWidth: containerWidth,
          margin: '0 auto',
          padding: '28px 24px',
          paddingLeft: 24 + sideArrowReserve,
          paddingRight: 24 + sideArrowReserve,
          display: 'grid',
          gridTemplateColumns: isBanner ? '1.1fr 1fr' : (active.variant === 'split' ? '1.3fr 1fr' : '1fr'),
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          {personalization && (
            <div style={{ display: 'inline-block', background: isBanner ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.25)', color: isBanner ? '#111' : '#fff', padding: '6px 12px', borderRadius: 999, fontWeight: 700, marginBottom: 10 }}>
              {personalization}
            </div>
          )}
          <h1 style={{ fontSize: isBanner ? 46 : 34, lineHeight: 1.05, margin: '0 0 10px 0', color: isBanner ? '#111' : '#fff', letterSpacing: '-0.5px' }}>{active.title}</h1>
          <p style={{ opacity: isBanner ? 0.95 : 0.9, margin: '0 0 18px 0', color: isBanner ? '#111' : '#fff', fontSize: isBanner ? 18 : 16 }}>{active.subtitle}</p>
          <button
            data-testid="hero-cta"
            onClick={handlePrimary}
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              fontWeight: 800,
              border: 0,
              padding: '10px 14px',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            {active.ctaText}
          </button>
          {active.secondaryCtaText && (
            <button
              onClick={handleSecondary}
              style={{
                marginLeft: 10,
                background: 'transparent',
                color: isBanner ? '#111' : '#fff',
                border: isBanner ? '1px solid rgba(0,0,0,0.35)' : '1px solid rgba(255,255,255,0.6)',
                padding: '9px 14px',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {active.secondaryCtaText}
            </button>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          {/* Layered imagery behind hero asset for depth on banner */}
          {isBanner && (
            <div aria-hidden="true" style={{ position: 'absolute', inset: '-20% -10% 0 -10%', filter: 'blur(36px) saturate(1.1)', background: 'radial-gradient(35% 45% at 30% 20%, rgba(255,255,255,0.65), rgba(255,255,255,0) 70%), radial-gradient(45% 55% at 80% 40%, rgba(255,216,128,0.35), rgba(255,216,128,0) 70%)' }} />
          )}
          {active.variant === 'overlay' && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 12,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.5))'
            }} />
          )}
          <img
            src={active.imageSrc}
            alt={active.imageAlt}
            decoding="async"
            fetchpriority={idx === 0 ? 'high' : 'auto'}
            sizes={fullBleed ? '(max-width: 900px) 100vw, 1200px' : '(max-width: 900px) 90vw, 800px'}
            style={{ width: '100%', height: 'auto', borderRadius: 12, transition: 'opacity 400ms ease', boxShadow: isBanner ? '0 8px 24px rgba(0,0,0,0.08)' : undefined }}
          />
          {hasSlides && safeSlides.length > 1 && !fullBleed && (
            <>
              {/* Arrows */}
              <button aria-label="Previous" onClick={() => go(-1)} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: isBanner ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.4)', color: '#fff', border: 0, borderRadius: 999, width: 36, height: 36, cursor: 'pointer' }}>
                ‹
              </button>
              <button aria-label="Next" onClick={() => go(1)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: isBanner ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.4)', color: '#fff', border: 0, borderRadius: 999, width: 36, height: 36, cursor: 'pointer' }}>
                ›
              </button>
              {/* Dots */}
              <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
                {safeSlides.map((_, i) => (
                  <button key={i} aria-label={`Go to slide ${i + 1}`} onClick={() => setIdx(i)} style={{ width: 8, height: 8, borderRadius: 999, border: 0, background: i === idx ? 'var(--color-primary)' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {/* Section-level arrows for full-bleed banner to ensure visibility */}
      {hasSlides && safeSlides.length > 1 && (
        <>
          <button
            aria-label="Previous"
            onClick={() => go(-1)}
            style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.35)', color: '#fff', border: '1px solid rgba(255,255,255,0.85)', borderRadius: 999, width: 46, height: 46, cursor: 'pointer', zIndex: 10 }}
          >
            ‹
          </button>
          <button
            aria-label="Next"
            onClick={() => go(1)}
            style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.35)', color: '#fff', border: '1px solid rgba(255,255,255,0.85)', borderRadius: 999, width: 46, height: 46, cursor: 'pointer', zIndex: 10 }}
          >
            ›
          </button>
          <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6, zIndex: 10 }}>
            {safeSlides.map((_, i) => (
              <button key={i} aria-label={`Go to slide ${i + 1}`} onClick={() => setIdx(i)} style={{ width: 9, height: 9, borderRadius: 999, border: 0, background: i === idx ? 'var(--color-primary)' : 'rgba(255,255,255,0.7)', cursor: 'pointer' }} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default React.memo(Hero);
