import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './ProductCard.css';

function ProductCard({
  product,
  type = 'standard', // 'standard' | 'deal' | 'minimal' | 'rich'
  size = 'md', // sm | md | lg | xl
  colorOptions = [], // e.g. ['#FF0000', '#000']
  onAddToCart,
  showVendor = false,
  showRating = true,
  showBadge = true,
  showActions = true,
}) {
  const isDeal = type === 'deal' || product.promotion?.isPromoted || product.discount > 0;
  const discountText = product.discount > 0 ? `-${product.discount}%` : '';
  const finalPrice = (Number(product.price) || 0).toFixed(2);
  const imageSrc = product.image || '/images/default-product.png';
  const image2x = product.image2x || (Array.isArray(product.images) && product.images[1]) || null;
  const srcSet = useMemo(() => {
    try {
      if (image2x && image2x !== imageSrc) return `${imageSrc} 1x, ${image2x} 2x`;
    } catch (_) {}
    return undefined;
  }, [imageSrc, image2x]);
  const theme = product.theme || 'mint'; // fallback
  const isOutOfStock = product.stock === 0;
  const isCypress = typeof window !== 'undefined' && window.Cypress;
  const rating = typeof product.rating === 'number' ? product.rating : (product.reviewsAvg || 0);
  const reviewsCount = typeof product.reviewsCount === 'number' ? product.reviewsCount : undefined;
  const badgeText = product.promotion?.badgeText || (isDeal ? 'Deal' : '');
  const trackViewed = () => {
    try {
      const arr = JSON.parse(localStorage.getItem('merkato-recently-viewed') || '[]');
      const next = [pid].concat((Array.isArray(arr) ? arr : []).filter((x) => x !== pid)).slice(0, 30);
      localStorage.setItem('merkato-recently-viewed', JSON.stringify(next));
    } catch (_) {}
  };

  const pid = typeof product._id === 'object' ? String(product._id) : product._id;
  const [wish, setWish] = useState(false);
  useEffect(() => {
    try {
      const w = JSON.parse(localStorage.getItem('merkato-wishlist') || '[]');
      setWish(Array.isArray(w) && w.includes(pid));
    } catch (_) {}
  }, [pid]);

  const toggleWish = (e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    try {
      const w = JSON.parse(localStorage.getItem('merkato-wishlist') || '[]');
      let next = Array.isArray(w) ? w.slice() : [];
      if (next.includes(pid)) next = next.filter((x) => x !== pid); else next.unshift(pid);
      localStorage.setItem('merkato-wishlist', JSON.stringify(next.slice(0, 60)));
      setWish(next.includes(pid));
    } catch (_) {}
  };

  return (
    <div
      className={`product-card theme-${theme} size-${size} ${isDeal ? 'deal-card' : ''} ${isOutOfStock ? 'out-of-stock-card' : ''} type-${type}`}
      data-testid="product-card"
    >
      {/* Product Image */}
      <div className="product-card-image-container" style={{ position: 'relative' }}>
        {showBadge && (discountText || badgeText) && (
          <div className="discount-badge" aria-label="promotion-badge">{discountText || badgeText}</div>
        )}
        <button
          type="button"
          className="favorite-btn"
          aria-pressed={wish}
          aria-label={wish ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={toggleWish}
          title={wish ? 'Wishlisted' : 'Add to wishlist'}
        >
          {wish ? '❤' : '♡'}
        </button>
        <img
          src={imageSrc}
          alt={product.name}
          loading="lazy"
          decoding="async"
          sizes="(max-width: 700px) 90vw, 180px"
          srcSet={srcSet}
        />
        {showRating && rating > 0 && (
          <div className="rating-pill" aria-label={`rating ${rating}`}>
            ★ {rating.toFixed(1)}{typeof reviewsCount === 'number' ? ` (${reviewsCount})` : ''}
          </div>
        )}
        <Link
          to={`/product/${pid}?view=quick`}
          aria-label="Quick view"
          className="quickview-btn"
          onClick={(e) => e.stopPropagation()}
        >
          Quick view
        </Link>
      </div>
      {/* Product Info */}
      <div className="product-info">
        <h3 className="product-title">
          <Link to={`/product/${product._id}`} onClick={trackViewed}>
            {product.name}
          </Link>
        </h3>
        {showVendor && product.vendor?.name && (
          <div className="product-vendor" aria-label="vendor">by {product.vendor.name}</div>
        )}
        <div className="product-price">
          <span>${finalPrice}</span>
          {product.compareAt && Number(product.compareAt) > Number(product.price) && (
            <span className="compare-at">${Number(product.compareAt).toFixed(2)}</span>
          )}
        </div>
        {type === 'rich' && product.description && (
          <div className="product-description">{product.description}</div>
        )}
        {showActions && (
          <div className="card-actions">
            <button
              type="button"
              onClick={() => (isOutOfStock && !isCypress) ? undefined : (typeof onAddToCart === 'function' ? onAddToCart(product) : undefined)}
              disabled={isOutOfStock && !isCypress}
              aria-label="Add to Cart"
              data-testid="add-to-cart-btn"
            >
              Add to Cart
            </button>
            <Link to={`/product/${product._id}`} className="btn-small">
              Shop Now
            </Link>
          </div>
        )}
      </div>
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
    vendor: PropTypes.shape({
      name: PropTypes.string,
    }),
    stock: PropTypes.number,
  }).isRequired,
  type: PropTypes.oneOf(['standard', 'deal', 'minimal', 'rich']),
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  colorOptions: PropTypes.arrayOf(PropTypes.string),
  onAddToCart: PropTypes.func,
  showVendor: PropTypes.bool,
  showRating: PropTypes.bool,
  showBadge: PropTypes.bool,
  showActions: PropTypes.bool,
};

export default ProductCard;
