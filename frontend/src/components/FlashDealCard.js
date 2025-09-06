import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './FlashDealCard.css';

const FlashDealCard = ({ product }) => {
  const {
    _id,
    name,
    image,
    price,
    discount = 0,
    promotion = {},
    stock = 0,
  } = product;

  const finalPrice = price.toFixed(2);
  const isPromoted = promotion.isPromoted || discount > 0;
  const discountText = discount > 0 ? `-${discount}%` : '';
  const imageSrc = image || '/images/default-product.png';

  return (
    <div className="flash-card">
      <div className="flash-img-container">
        <img src={imageSrc} alt={name} className="flash-img" loading="lazy" />
        {discountText && <div className="flash-discount-badge">{discountText}</div>}
      </div>

      <h4 className="flash-title">{name}</h4>

      <div className="flash-price-row">
        <span className="flash-price">${finalPrice}</span>
        {isPromoted && <span className="flash-timer">⏱️ Limited Time</span>}
      </div>

      <div className="flash-stock">{stock} left in stock</div>

      <Link to={`/product/${_id}`} className="btn-flash">
        Shop Now
      </Link>
    </div>
  );
};

FlashDealCard.propTypes = {
  product: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    image: PropTypes.string,
    price: PropTypes.number.isRequired,
    discount: PropTypes.number,
    promotion: PropTypes.shape({
      isPromoted: PropTypes.bool,
      badgeText: PropTypes.string,
    }),
    stock: PropTypes.number,
  }).isRequired,
};

export default FlashDealCard;
