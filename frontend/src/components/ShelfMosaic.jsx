import React from 'react';
import PropTypes from 'prop-types';
import './ShelfMosaic.css';

/**
 * ShelfMosaic
 * Amazon-like 2x2 tile shelf with a header and optional footer link.
 * Props:
 * - title: string
 * - tiles: Array<{ image: string, title: string, href: string, alt?: string }>
 * - link?: { label: string, href: string }
 */
export default function ShelfMosaic({ title, tiles = [], link, variant = '2x2', inline = false, fullBleed = false, compact = false }){
  const is3x3 = variant === '3x3' || (Array.isArray(tiles) && tiles.length > 4);
  const safeTiles = Array.isArray(tiles) ? tiles.slice(0, is3x3 ? 9 : 4) : [];

  const content = (
    <div className="shelf__card">
      <header className="shelf__head">
        <h2 className="shelf__title">{title}</h2>
      </header>
      <div className="shelf__grid">
        {safeTiles.map((t, i) => {
          // Avoid dev console noise: if a tile references a non-existent shelf stock image,
          // render our local default instead of issuing a failing network request that CRA would proxy.
          const wantsShelfStock = typeof t.image === 'string' && t.image.startsWith('/images/shelf/');
          const resolvedSrc = wantsShelfStock ? '/images/default-product.svg' : (t.image || '/images/default-product.svg');
          return (
            <a key={i} className="shelf__tile" href={t.href || '#'}>
              <div className="shelf__imgwrap">
                <img
                  src={resolvedSrc}
                  alt={t.alt || t.title || ''}
                  loading="lazy"
                  onError={(e) => { try { e.currentTarget.src = '/images/default-product.svg'; } catch(_) {} }}
                />
              </div>
              <div className="shelf__caption">{t.title}</div>
            </a>
          );
        })}
      </div>
      <footer className="shelf__foot">
        {link && link.href ? (
          <a className="shelf__more" href={link.href}>{link.label || 'See more'}</a>
        ) : null}
      </footer>
    </div>
  );

  // inline: render only the card content (no outer container) for use inside shelf grids
  if (inline) return (
    <div className={`shelf shelf--inline ${compact ? 'shelf--compact' : ''} ${is3x3 ? 'shelf--3x3' : 'shelf--2x2'}`}>{content}</div>
  );

  return (
    <section className={`shelf ${fullBleed ? 'full-bleed' : ''} ${compact ? 'shelf--compact' : ''} u-container ${is3x3 ? 'shelf--3x3' : 'shelf--2x2'}`} aria-label={title}>
      {content}
    </section>
  );
}

ShelfMosaic.propTypes = {
  title: PropTypes.string.isRequired,
  tiles: PropTypes.arrayOf(PropTypes.shape({
    image: PropTypes.string,
    title: PropTypes.string,
    href: PropTypes.string,
    alt: PropTypes.string,
  })),
  link: PropTypes.shape({
    label: PropTypes.string,
    href: PropTypes.string,
  }),
  variant: PropTypes.oneOf(['2x2', '3x3']),
  inline: PropTypes.bool,
  fullBleed: PropTypes.bool,
  compact: PropTypes.bool,
};
