import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LinkBuilder } from '../config/routes'';
import './MiniHeroBar.css';

// Compact hero carousel with arrows and dots; accepts promo items via props
export default function MiniHeroBar({ items, autoMs = 6000, showDots = true }) {
  const fallback = useMemo(() => ([
  { id: 'mini-hot', title: 'Hot Deals', subtitle: 'Limited-time offers today', image: '/images/hero-tech.jpg', href: LinkBuilder.toDeal('flash') },
  { id: 'mini-discount', title: '25% Off Picks', subtitle: 'Save big on popular items', image: '/images/hero-home.jpg', href: LinkBuilder.toDeal('percent-off-25') },
  { id: 'mini-popular', title: 'Popular Sale', subtitle: 'Trending products this week', image: '/images/hero-beauty.jpg', href: LinkBuilder.toDeal('percent-off-20') },
  ]), []);

  const slides = Array.isArray(items) && items.length ? items : fallback;
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  const go = (next) => {
    if (!slides.length) return;
    setIndex((i) => (next + slides.length) % slides.length);
  };
  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  useEffect(() => {
    if (!autoMs) return undefined;
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, autoMs);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [autoMs, slides.length]);

  if (!slides.length) return null;

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
  };

  return (
    <section className="u-container home-row mini-hero" aria-label="Featured promos">
      <div
        className="mini-hero__viewport"
        role="region"
        aria-roledescription="carousel"
        aria-label="Promotions"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div className="mini-hero__track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((s, i) => (
            <div className="mini-hero__slide" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`} key={s.id || i}>
              <a href={s.href} className="mini-hero__link" aria-label={`${s.title}. ${s.subtitle}`}>
                <img className="mini-hero__img" src={s.image} alt="" />
                <div className="mini-hero__copy">
                  <h3 className="mini-hero__title">{s.title}</h3>
                  {s.subtitle ? <p className="mini-hero__sub">{s.subtitle}</p> : null}
                </div>
              </a>
            </div>
          ))}
        </div>
        <button className="mini-hero__nav mini-hero__nav--prev" aria-label="Previous" onClick={prev}>
          ‹
        </button>
        <button className="mini-hero__nav mini-hero__nav--next" aria-label="Next" onClick={next}>
          ›
        </button>
        {showDots && (
          <div className="mini-hero__dots" role="tablist" aria-label="Promotions">
            {slides.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === index}
                aria-label={`Go to slide ${i + 1}`}
                className={"mini-hero__dot" + (i === index ? ' is-active' : '')}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
