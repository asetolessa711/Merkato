import React, { useEffect, useMemo, useRef, useState } from "react";

// CTA: { label, href, variant?: 'primary'|'secondary'|'ghost' }
// Slide: { id, title, subtitle?, bg, image?, imageAlt?, ctas? }
export default function HeroBar({ slides = [], autoMs = 6000, height = 420, showDots = true }) {
  const count = slides.length;
  const [idx, setIdx] = useState(1); // start on first real item (after a clone)
  const [anim, setAnim] = useState(true);
  const railRef = useRef(null);
  const hovering = useRef(false);
  const touch = useRef(null);
  const timer = useRef(undefined);

  // Build infinite loop by cloning ends: [last, ...slides, first]
  const loopSlides = useMemo(() => {
    if (!count) return [];
    return [slides[count - 1], ...slides, slides[0]];
  }, [slides, count]);

  // Auto-advance (respect reduced motion + pause on hover)
  useEffect(() => {
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || count < 2) return;
    const tick = () => { if (!hovering.current) go(idx + 1); };
    timer.current = window.setInterval(tick, autoMs);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [idx, autoMs, count]);

  // Jump when we hit cloned edges
  useEffect(() => {
    if (idx === 0) { // at front clone → snap to real last
      const snap = () => { setAnim(false); setIdx(count); requestAnimationFrame(() => setAnim(true)); };
      const id = setTimeout(snap, 300);
      return () => clearTimeout(id);
    }
    if (idx === count + 1) { // at back clone → snap to real first
      const snap = () => { setAnim(false); setIdx(1); requestAnimationFrame(() => setAnim(true)); };
      const id = setTimeout(snap, 300);
      return () => clearTimeout(id);
    }
  }, [idx, count]);

  // keyboard arrows
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(idx + 1);
      if (e.key === 'ArrowLeft') go(idx - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx]);

  function go(next) { setIdx(next); }
  function next() { go(idx + 1); }
  function prev() { go(idx - 1); }

  // touch / swipe
  function onPointerDown(e) {
    touch.current = { x: e.clientX, y: e.clientY };
    e.target.setPointerCapture?.(e.pointerId);
  }
  function onPointerUp(e) {
    if (!touch.current) return;
    const dx = e.clientX - touch.current.x;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
    touch.current = null;
  }

  const styleRail = {
    transform: `translateX(${-idx * 100}vw)`,
    transition: anim ? 'transform 450ms ease' : 'none',
    height
  };

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Promotions"
      onMouseEnter={() => (hovering.current = true)}
      onMouseLeave={() => (hovering.current = false)}
    >
      <div
        className="hero__rail"
        ref={railRef}
        style={styleRail}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {loopSlides.map((s, i) => (
          <article key={`${s.id}-${i}`} className="hero__slide" style={{ background: s.bg }}>
            <div className="hero__inner" style={{ height }}>
              <div className="hero__copy">
                <h1 className="hero__title">{s.title}</h1>
                {s.subtitle && <p className="hero__sub">{s.subtitle}</p>}
                {!!s.ctas?.length && (
                  <div className="hero__ctas">
                    {s.ctas.map((c, k) => (
                      <a
                        key={k}
                        href={c.href}
                        className={`btn ${btnClass(c.variant)}`}
                        aria-label={c.ariaLabel || c.label}
                      >
                        {c.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              {s.image && (
                <div className="hero__media">
                  <img src={s.image} alt={s.imageAlt || ''} loading="eager" />
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Arrows */}
      {count > 1 && (
        <>
          <button className="hero__arrow hero__arrow--left" aria-label="Previous slide" onClick={prev}>‹</button>
          <button className="hero__arrow hero__arrow--right" aria-label="Next slide" onClick={next}>›</button>
        </>
      )}

      {/* Dots (map to real slides) */}
      {showDots && count > 1 && (
        <div className="hero__dots" role="tablist" aria-label="Slide dots">
          {slides.map((_, real) => {
            const active = real + 1 === normalize(idx, count);
            return (
              <button
                key={real}
                role="tab"
                aria-selected={active}
                className={`hero__dot ${active ? 'is-active' : ''}`}
                onClick={() => go(real + 1)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function normalize(i, count) {
  if (i <= 0) return count;
  if (i > count) return 1;
  return i;
}
function btnClass(v) {
  if (v === 'secondary') return 'btn--secondary';
  if (v === 'ghost') return 'btn--ghost';
  return 'btn--primary';
}
