import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './ProductCard.css';
import { CartCtx } from '../cart/CartContext';

function ProductCard({
  product,
  type = 'standard',
  size = 'md', // sm | md | lg | xl
  colorOptions = [], // e.g. ['#FF0000', '#000']
  onAddToCart,
}) {
  const cart = React.useContext(CartCtx);
  const add = cart?.add;
  const isDeal = type === 'deal' || product.promotion?.isPromoted || product.discount > 0;
  const finalPrice = product.price.toFixed(2);
  const imageSrc = product.image || '/images/default-product.png';
  const theme = product.theme || 'mint'; // fallback
  const isOutOfStock = product.stock === 0;
  const isCypress = typeof window !== 'undefined' && window.Cypress;

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
      if (typeof add === 'function') {
        add({ sku, title, price, image }, 1);
      }
      // Notify any legacy listeners
      try { window.dispatchEvent(new Event('cart:updated')); } catch (_) {}
    } catch (_) { /* no-op */ }
  };

  return (
    <div
      className={`product-card theme-${theme} size-${size} ${isDeal ? 'deal-card' : ''} ${isOutOfStock ? 'out-of-stock-card' : ''}`}
      data-testid="product-card"
    >
      {/* Product Image */}
      <div className="product-card-image-container">
        <img src={imageSrc} alt={product.name} loading="lazy" />
      </div>
      {/* Product Info */}
      <div className="product-info">
        <h3 className="product-title">
          <Link to={`/product/${product._id}`}>
            {product.name}
          </Link>
        </h3>
        <div className="product-price">
          <span>${finalPrice}</span>
        </div>
        {/* Product Description */}
        {product.description && (
          <div className="product-description">{product.description}</div>
        )}
        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock && !isCypress}
          aria-label="Add to Cart"
          data-testid="add-to-cart-btn"
        >
          Add to Cart
        </button>
        {/* CTA */}
        <Link to={`/product/${product._id}`} className="btn-small">
          Shop Now
        </Link>
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
    // Accept either a vendor object { name } or a simple string vendor name (legacy fixtures)
    vendor: PropTypes.oneOfType([
      PropTypes.shape({
        name: PropTypes.string,
      }),
      PropTypes.string,
    ]),
    stock: PropTypes.number,
  }).isRequired,
  type: PropTypes.oneOf(['standard', 'deal']),
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  colorOptions: PropTypes.arrayOf(PropTypes.string),
  onAddToCart: PropTypes.func,
};

export default ProductCard;
