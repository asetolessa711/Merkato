import React from 'react';
import './ShelfStrip.css';

/**
 * ShelfStrip – a simple, Amazon-like horizontal strip of cover images.
 * Props:
 * - title: string (section heading)
 * - items: Array<{ id: string|number, image: string, href?: string, title?: string }>
 * - link: optional { label: string, href: string } rendered on the right of header
 * - height: optional number (px) overrides default thumb height
 */
export default function ShelfStrip({ title = '', items = [], link, height }) {
  const h = height && Number.isFinite(height) ? height : undefined;
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <section className="shelf-strip u-container" aria-label={title} style={h ? { ['--strip-thumb-h']: `${h}px` } : undefined}>
      <header className="shelf-strip__head">
        {title ? <h2 className="shelf-strip__title">{title}</h2> : <span />}
        {link?.href && link?.label && (
          <a className="shelf-strip__link" href={link.href} aria-label={link.label}>
            {link.label}
          </a>
        )}
      </header>
      <div className="shelf-strip__viewport" role="region" aria-label={`${title} items`}>
        <ul className="shelf-strip__list" aria-live="polite">
          {items.map((it, idx) => {
            const key = it.id ?? idx;
            const img = it.image || '/images/default-product.svg';
            const content = (
              <img className="shelf-strip__img" src={img} alt={it.title || ''} loading="lazy" />
            );
            return (
              <li key={key} className="shelf-strip__item">
                {it.href ? (
                  <a href={it.href} aria-label={it.title || `Item ${idx + 1}`}>
                    {content}
                  </a>
                ) : content}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
