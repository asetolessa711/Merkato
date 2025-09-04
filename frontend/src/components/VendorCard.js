import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './VendorCard.css';

function VendorCard({ vendor, size = 'md', theme = 'light' }) {
  const avatar = vendor.logo || '/images/default-avatar.png';
  const cardSizeClass = `size-${size}`;
  const cardThemeClass = `theme-${theme}`;

  return (
    <div className={`vendor-card ${cardSizeClass} ${cardThemeClass}`}>
      <img
        src={avatar}
        alt={`${vendor.name || 'Vendor'} logo`}
        className="vendor-logo"
        loading="lazy"
      />

      <div className="vendor-info">
        <h4 className="vendor-name">{vendor.name || 'Unnamed Vendor'}</h4>
        <p className="vendor-email">{vendor.email || 'No contact info'}</p>

        {/* Optional Future: Ratings or Product Count */}
        {/* <p className="vendor-stats">⭐ 4.8 | 120 products</p> */}

        <Link
          to={`/vendor/${vendor._id}`}
          className="btn-secondary"
          aria-label={`Visit ${vendor.name || 'vendor'}'s store`}
        >
          Visit Store
        </Link>
      </div>
    </div>
  );
}

VendorCard.propTypes = {
  vendor: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string,
    email: PropTypes.string,
    logo: PropTypes.string,
  }).isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  theme: PropTypes.string,
};

export default VendorCard;
