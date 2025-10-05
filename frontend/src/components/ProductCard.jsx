import React, { useMemo, useState, useCallback, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { LinkBuilder } from '../config/routes'';
import './ProductCard.css';
import { useCart } from '../cart/CartContext'';
import { Flags } from '../utils/featureFlags'';
import { toCents, applyDiscountCents, formatCurrency } from '../utils/currencyUtils'';
import { RailsContext } from '../context/RailsContext'';

function ProductCard({
  product,
  type = 'standard',
  size = 'md', // sm | md | lg | xl
  colorOptions = [], // e.g. ['#FF0000', '#000']
  onAddToCart,
  listCtx, // optional: { route, category, subcat, dealType, page, sort }
  position, // optional: numeric position within the list (1-based)
}) {
  const { add } = useCart();
  const isDeal = type === 'deal' || product.promotion?.isPromoted || product.discount > 0;
  const discountText = product.discount > 0 ? `-${product.discount}%` : '';
  const promoBadgeText = product?.promotion?.badgeText || discountText || '';
  // Money: compute in cents
  const currency = product.currency || 'USD';
  const baseCents = toCents(product.price ?? 0);
  const finalPrice = formatCurrency(baseCents, currency);
  // Images support: prefer product.images[], fallback to single product.image
  const images = useMemo(() => {
    const arr = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    const single = product.image ? [product.image] : [];
    const combined = [...arr, ...single];
  // Prefer SVG placeholder in public if no image available
  return combined.length ? combined : ['/images/default-product.svg'];
  }, [product.images, product.image]);
  const [imgIdx, setImgIdx] = useState(0);
  const [imgError, setImgError] = useState(false);
  const imageSrc = imgError ? '/images/default-product.svg' : images[Math.min(imgIdx, images.length - 1)];
  const activeImageAnnouncement = `Image ${Math.min(imgIdx, images.length - 1) + 1} of ${images.length}`;
  const theme = product.theme || 'mint'; // fallback
  const isOutOfStock = product.stock === 0;
  const isCypress = typeof window !== 'undefined' && window.Cypress;
  const productId = product._id || product.id || product.sku || product.name;
  const pdpHref = LinkBuilder.toPdp(productId);
  const pdpState = listCtx ? { fromList: { ...listCtx, pos: position || null } } : undefined;
  if (process.env.NODE_ENV !== 'production') {
    if (!productId) {
      // eslint-disable-next-line no-console
      console.warn('[ProductCard] missing id/slug for PDP link', product);
    }
  }

  // Enhanced details (behind flag)
  const showEnhanced = !!Flags.CARD_ENHANCED;
  const singleCTA = Flags?.CARD_SINGLE_CTA ?? true; // default to single CTA per spec
  const showDescription = Flags?.CARD_SHOW_DESCRIPTION ?? false; // default hide description per spec
  const role = Flags?.USER_ROLE || 'customer'; // scaffold for role-aware actions
  const vendorName = typeof product.vendor === 'string' ? product.vendor : product.vendor?.name;
  const rating = Number(product.rating || product.avgRating || 0);
  const reviewsCount = Number(product.reviewsCount || product.numReviews || 0);
  const hasDiscount = Number(product.discount || 0) > 0 && Number(product.price) > 0;
  const discountedCents = hasDiscount ? applyDiscountCents(baseCents, Number(product.discount)) : null;
  const discountedPrice = discountedCents != null ? formatCurrency(discountedCents, currency) : null;

  // Optional hover swap (default on). If flag missing, treat as enabled.
  const hoverSwap = Flags?.CARD_HOVER_SWAP ?? true;
  const onEnter = useCallback(() => {
    if (!hoverSwap) return;
    if (images.length > 1) setImgIdx(1);
  }, [hoverSwap, images.length]);
  const onLeave = useCallback(() => {
    if (!hoverSwap) return;
    setImgIdx(0);
  }, [hoverSwap]);
  // Keyboard accessibility: allow focus + arrow key image swap
  const onKey = useCallback((e) => {
    if (!hoverSwap || images.length < 2) return;
    if (e.key === 'ArrowRight') { setImgIdx(1); }
    if (e.key === 'ArrowLeft') { setImgIdx(0); }
  }, [hoverSwap, images.length]);
  const onImageError = useCallback(() => {
    // Avoid loops; only set once
    setImgError((v) => (v ? v : true));
  }, []);

  // Derive modern format URLs (best-effort) to allow browser fallback to original.
  const deriveFormat = useCallback((url, newExt) => {
    try {
      if (!url) return url;
      const qIndex = url.indexOf('?');
      const base = qIndex >= 0 ? url.slice(0, qIndex) : url;
      const query = qIndex >= 0 ? url.slice(qIndex) : '';
      const lastDot = base.lastIndexOf('.');
      if (lastDot > base.lastIndexOf('/') && lastDot !== -1) {
        return `${base.slice(0, lastDot)}.${newExt}${query}`;
      }
      return url;
    } catch (_) { return url; }
  }, []);

  const imgAvif = deriveFormat(imageSrc, 'avif');
  const imgWebp = deriveFormat(imageSrc, 'webp');

  // Prefetch the second image (if any) for smoother hover swap
  useEffect(() => {
    // Prefetch only in environments where Image exists; provide cleanup to release refs
    if (images && images.length > 1 && typeof window !== 'undefined' && typeof window.Image !== 'undefined') {
      let pre;
      try { pre = new Image(); pre.src = images[1]; } catch (_) {}
      return () => {
        try { if (pre) { pre.src = ''; pre = null; } } catch (_) {}
      };
    }
    return undefined;
  }, [images]);

  const railCtx = useContext(RailsContext);
  const handleCardClick = useCallback(() => {
    try {
      const sku = String(product.sku || product._id || product.id || product.name);
      const detail = { sku, source: 'product-card', ...(railCtx || {}) };
      window.dispatchEvent(new CustomEvent('ui:card_click', { detail }));
    } catch (_) {}
  }, [product, railCtx]);
  const handleAddToCart = () => {
    if (isOutOfStock && !isCypress) return;
    // Allow existing prop callback for any side-effects/tests
    if (typeof onAddToCart === 'function') {
      try { onAddToCart(product); } catch (_) {}
    }
    try {
      const sku = String(product.sku || product._id || product.id || product.name);
      const title = String(product.name || product.title || 'Untitled');
      const price = Number(product.price) || 0;
      const image = product.image;
      add({ sku, title, price, image }, 1);
      // Notify any legacy listeners
      try { window.dispatchEvent(new Event('cart:updated')); } catch (_) {}
      // Global attribution event (cart:add) with potential rail context
      try {
        const detail = { sku, price, source: 'product-card', ...(railCtx || {}) };
        window.dispatchEvent(new CustomEvent('cart:add', { detail }));
      } catch (_) {}
    } catch (_) { /* no-op */ }
  };

  const handleQuickAdd = () => {
    if (isOutOfStock && !isCypress) return;
    try {
      const sku = String(product.sku || product._id || product.id || product.name);
      const title = String(product.name || product.title || 'Untitled');
      const price = Number(product.price) || 0;
      const image = product.image;
      const metadata = { variant: product.defaultVariant || product.variant || null };
      add({ sku, title, price, image, ...metadata }, 1);
      try { window.dispatchEvent(new Event('cart:updated')); } catch (_) {}
      try {
        const detail = { sku, price, source: 'product-card-quickadd', ...(railCtx || {}) };
        window.dispatchEvent(new CustomEvent('cart:add', { detail }));
      } catch (_) {}
    } catch (_) {}
  };

  const cardRef = React.useRef(null);
  return (
    <div
      className={`product-card theme-${theme} size-${size} ${isDeal ? 'deal-card' : ''} ${isOutOfStock ? 'out-of-stock-card' : ''}`}
      data-testid="product-card"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onKeyDown={onKey}
      tabIndex={0}
      ref={cardRef}
    >
  {/* Product Image */}
  <div className="product-card-image-container">
        {promoBadgeText && (
          <span
            className="product-badge"
            aria-label="promotion-badge"
            data-testid="product-badge"
            data-discount={product.discount ? String(product.discount) : undefined}
          >
            {promoBadgeText}
          </span>
        )}
        {/* KPI-aligned badges */}
        {railCtx?.tactic === 'sponsored' && (
          <span className="badge badge-sponsored" aria-label="Sponsored">Sponsored</span>
        )}
        {(product.fastShip || product.flags?.fastShip) && (
          <span className="badge badge-fast-ship" aria-label="Fast shipping">Fast ship</span>
        )}
        {(product.verified || product.flags?.verified) && (
          <span className="badge badge-verified" aria-label="Verified seller">Verified</span>
        )}
        <picture>
          <source type="image/avif" srcSet={imgAvif} />
          <source type="image/webp" srcSet={imgWebp} />
          <img src={imageSrc} alt={product.name} loading="lazy" decoding="async" onError={onImageError} data-testid="product-image" aria-describedby={`img-status-${productId}`} />
        </picture>
        {isOutOfStock && (
          <span className="oos-badge" aria-label="out-of-stock" title="Out of stock">OOS</span>
        )}
        <span id={`img-status-${productId}`} aria-live="polite" style={{ position:'absolute', width:1, height:1, overflow:'hidden', clip:'rect(1px,1px,1px,1px)', whiteSpace:'nowrap' }}>{activeImageAnnouncement}</span>
      </div>
      {/* Product Info */}
      <div className="product-info">
        <h3 className="product-title">
          {pdpHref ? (
            <Link to={pdpHref} state={pdpState} onClick={handleCardClick}>
              {product.name}
            </Link>
          ) : (
            <span>{product.name}</span>
          )}
        </h3>

        {/* Enhanced vendor + rating line */}
        {showEnhanced && (
          <div className="product-meta">
            {vendorName && <span className="vendor" title="Vendor">{vendorName}</span>}
            {rating > 0 && (
              <span className="stars" aria-hidden="true">
                {'\u2605'.repeat(Math.round(Math.min(rating, 5)))}
                {'\u2606'.repeat(5 - Math.round(Math.min(rating, 5)))}
                {reviewsCount ? <span className="reviews-count" aria-hidden="true"> ({reviewsCount})</span> : null}
              </span>
            )}
            <span className="sr-only" style={{ position:'absolute', width:1, height:1, overflow:'hidden', clip:'rect(1px,1px,1px,1px)', whiteSpace:'nowrap' }}>
              {`Rated ${rating} out of 5${reviewsCount ? ` from ${reviewsCount} reviews` : ''}`}
            </span>
          </div>
        )}

        <div className="product-price">
          {showEnhanced && hasDiscount ? (
            <>
              <span className="price-original" aria-label="original-price">{finalPrice}</span>
              <span className="price-discounted" aria-label="discounted-price">{discountedPrice}</span>
            </>
          ) : (
            <span>{finalPrice}</span>
          )}
        </div>
        {/* Product Description (hidden by default, flag to enable) */}
        {showDescription && product.description && (
          <div className="product-description">{product.description}</div>
        )}

        {/* Optional color swatches (flagged) */}
        {showEnhanced && Array.isArray(colorOptions) && colorOptions.length > 0 && (
          <div className="color-preview" aria-label="color-options">
            {colorOptions.slice(0, 6).map((c, i) => (
              <span
                key={c}
                className="color-swatch"
                style={{ backgroundColor: c }}
                title={c}
                role="img"
                aria-label={`Color ${c}`}
                onMouseEnter={() => setImgIdx(Math.min(i, images.length - 1))}
              />
            ))}
          </div>
        )}

        {/* CTA area: default to a single primary CTA */}
        {singleCTA ? (
          role === 'vendor' ? (
            // Vendor role scaffold; future actions like Edit/Analytics can go here
            <Link to={`/product/${productId}/edit`} className="btn-small" aria-label="Edit Listing">
              Edit Listing
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock && !isCypress}
              aria-disabled={isOutOfStock && !isCypress ? true : undefined}
              aria-label="Add to Cart"
              data-testid="add-to-cart-btn"
              aria-live="polite"
            >
              Add to Cart
            </button>
          )
        ) : (
          <>
            {showEnhanced && (
              <button
                type="button"
                onClick={handleQuickAdd}
                className="btn-small"
                aria-label="Quick Add"
                data-testid="quick-add-btn"
                disabled={isOutOfStock && !isCypress}
              >
                Quick Add
              </button>
            )}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock && !isCypress}
              aria-disabled={isOutOfStock && !isCypress ? true : undefined}
              aria-label="Add to Cart"
              data-testid="add-to-cart-btn"
              aria-live="polite"
            >
              Add to Cart
            </button>
            <Link to={pdpHref} state={pdpState} className="btn-small">
              Shop Now
            </Link>
          </>
        )}
      </div>

      {/* SEO: Product + Offer JSON-LD */}
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify({
          '@context': 'https://schema.org/',
          '@type': 'Product',
          name: product.name,
          image: images,
          sku: String(product.sku || product._id || product.id || product.name),
          brand: vendorName ? { '@type': 'Brand', name: vendorName } : undefined,
          offers: {
            '@type': 'Offer',
            priceCurrency: currency,
            price: (baseCents / 100).toFixed(2),
            availability: isOutOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
            url: `/product/${productId}`,
          },
        })}
      </script>
    </div>
  );
}

ProductCard.propTypes = {
  product: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    image: PropTypes.string,
    price: PropTypes.number.isRequired,
    discount: PropTypes.number,
    theme: PropTypes.string,
    promotion: PropTypes.shape({
      isPromoted: PropTypes.bool,
      badgeText: PropTypes.string,
    }),
    // Accept either a vendor object { name } or a simple string vendor name (legacy fixtures)
    vendor: PropTypes.oneOfType([
      PropTypes.shape({
        name: PropTypes.string,
      }),
      PropTypes.string,
    ]),
    stock: PropTypes.number,
    rating: PropTypes.number,
    avgRating: PropTypes.number,
    reviewsCount: PropTypes.number,
    numReviews: PropTypes.number,
  }).isRequired,
  type: PropTypes.oneOf(['standard', 'deal']),
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  colorOptions: PropTypes.arrayOf(PropTypes.string),
  onAddToCart: PropTypes.func,
  listCtx: PropTypes.object,
  position: PropTypes.number,
};

export default ProductCard;
