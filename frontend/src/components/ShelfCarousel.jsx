import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './ShelfCarousel.css';

// Slim, Amazon-like carousel shelf for small items (e.g., books/accessories)
// items: [{ id, title, image, href }]
export default function ShelfCarousel({ title, items = [], pageSizeDesktop = 8, pageSizeTablet = 6, pageSizeMobile = 4, seeAllHref }) {
  const [pageSize, setPageSize] = useState(pageSizeDesktop);
  const viewportRef = useRef(null);
  const [pageIndex, setPageIndex] = useState(0);

  // Dynamically compute how many items fit in the viewport to avoid clipping
  useEffect(() => {
    const computeFromWidth = (vw) => {
      // Mirror CSS breakpoints and min widths
      // CSS: gap = 12px; item min: desktop 148, tablet 132, mobile 112
      const gap = 12;
      const minItem = vw < 640 ? 112 : (vw < 1024 ? 132 : 148);
      const capacity = Math.max(1, Math.floor((vw + gap) / (minItem + gap)));
      // Respect configured maximums for each tier as an upper bound
      const maxForTier = vw < 640 ? pageSizeMobile : (vw < 1024 ? pageSizeTablet : pageSizeDesktop);
      return Math.max(1, Math.min(capacity, maxForTier));
    };

    const compute = () => {
      const el = viewportRef.current;
      if (el && el.clientWidth) return computeFromWidth(el.clientWidth);
      const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
      return computeFromWidth(w);
    };

    const apply = () => {
      const next = compute();
      setPageSize((prev) => (prev !== next ? next : prev));
    };

    apply();

    // Observe element resize when available
    let ro;
    if (typeof ResizeObserver !== 'undefined' && viewportRef.current) {
      ro = new ResizeObserver(() => apply());
      ro.observe(viewportRef.current);
    }
    const onResize = () => apply();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (ro) try { ro.disconnect(); } catch (_) {}
    };
  }, [pageSizeDesktop, pageSizeMobile, pageSizeTablet]);

  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < items.length; i += pageSize) out.push(items.slice(i, i + pageSize));
    return out.length ? out : [items.slice(0, pageSize)];
  }, [items, pageSize]);
  const pageCount = pages.length;
  const clampedIndex = Math.min(pageIndex, Math.max(0, pageCount - 1));
  const page = pages[clampedIndex] || [];

  useEffect(() => { if (pageIndex !== clampedIndex) setPageIndex(clampedIndex); }, [clampedIndex]);

  return (
    <section className="shelf-carousel-band">
      <div className="shelf-carousel u-container" aria-label={title}>
        <div className="shelf-carousel__card">
        <header className="shelf-carousel__head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="shelf-carousel__title" style={{ margin: 0 }}>{title}</h2>
          {seeAllHref ? (
            <Link
              to={seeAllHref}
              className="shelf-carousel__seeall"
              style={{ fontSize: 13, color: '#0ea5e9', textDecoration: 'none' }}
            >
              See all
            </Link>
          ) : null}
        </header>
        <div ref={viewportRef} className="shelf-carousel__viewport" role="region" aria-label={`${title} carousel`}>
          {pageCount > 1 && (
            <button
              type="button"
              className="shelf-carousel__navbtn shelf-carousel__navbtn--prev"
              aria-label="Previous"
              onClick={() => setPageIndex(Math.max(0, clampedIndex - 1))}
              disabled={clampedIndex <= 0}
            >
              ‹
            </button>
          )}
          {pageCount > 1 && (
            <button
              type="button"
              className="shelf-carousel__navbtn shelf-carousel__navbtn--next"
              aria-label="Next"
              onClick={() => setPageIndex(Math.min(pageCount - 1, clampedIndex + 1))}
              disabled={clampedIndex >= pageCount - 1}
            >
              ›
            </button>
          )}

          <div className={`shelf-carousel__track${(page && page.length < pageSize) ? ' shelf-carousel__track--compact' : ''}`}>
            {page && page.length ? page.map((it) => (
              <Link key={it.id || it.href || it.title}
                 to={it.href || '#'}
                 className="shelf-carousel__item">
                <div className="shelf-carousel__thumb">
                  <img
                    src={it.image || '/images/default-product.svg'}
                    alt={it.title || ''}
                    loading="lazy"
                    onError={(e) => { try { e.currentTarget.src = '/images/default-product.svg'; } catch(_) {} }}
                  />
                </div>
                <div className="shelf-carousel__caption" title={it.title}>{it.title}</div>
                {it.price != null && (
                  <div className="shelf-carousel__price" style={{ fontWeight: 600, color: '#00B894', fontSize: 13 }}>
                    {(it.currency ? `${it.currency} ` : '') + (typeof it.price === 'number' ? it.price.toFixed(2) : String(it.price))}
                  </div>
                )}
              </Link>
            )) : (
              <div style={{ fontSize: 12, color: '#6B7280' }}>No items</div>
            )}
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}

ShelfCarousel.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    image: PropTypes.string,
    href: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    currency: PropTypes.string,
  })),
  pageSizeDesktop: PropTypes.number,
  pageSizeTablet: PropTypes.number,
  pageSizeMobile: PropTypes.number,
  seeAllHref: PropTypes.string,
};
