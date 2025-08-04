import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './ProductCard.css';

function ProductCard({
  product,
  type = 'standard',
  size = 'md', // sm | md | lg | xl
  colorOptions = [], // e.g. ['#FF0000', '#000']
  onAddToCart,
}) {
  const isDeal = type === 'deal' || product.promotion?.isPromoted || product.discount > 0;
  const discountText = product.discount > 0 ? `-${product.discount}%` : '';
  const finalPrice = product.price.toFixed(2);
  const imageSrc = product.image || '/images/default-product.png';
  const theme = product.theme || 'mint'; // fallback
  const isOutOfStock = product.stock === 0;

  return (
    <div className={`product-card theme-${theme} size-${size} ${isDeal ? 'deal-card' : ''} ${isOutOfStock ? 'out-of-stock-card' : ''}`}>
      {/* Product Image */}
      <div className="product-card-image-container">
        <img src={imageSrc} alt={product.name} loading="lazy" />
      </div>
      {/* Product Info */}
      <div className="product-info">
        <h3 className="product-title">{product.name}</h3>
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
          onClick={() => !isOutOfStock && typeof onAddToCart === 'function' ? onAddToCart(product) : undefined}
          disabled={isOutOfStock}
          aria-label="Add to Cart"
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
    vendor: PropTypes.shape({
      name: PropTypes.string,
    }),
    stock: PropTypes.number,
  }).isRequired,
  type: PropTypes.oneOf(['standard', 'deal']),
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  colorOptions: PropTypes.arrayOf(PropTypes.string),
  onAddToCart: PropTypes.func,
};

export default ProductCard;
