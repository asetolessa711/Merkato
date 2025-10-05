import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './PromoLinkCard.css';

/**
 * PromoLinkCard
 * A lightweight, accessible link card for routing users to public pages like
 * "See all tech", "See all deals", or a collection/category landing.
 * Variants: 'category' | 'deals' | 'collection'
 */
export default function PromoLinkCard({ title, subtitle, href, count, icon, variant = 'category', ariaLabel }){
  return (
    <Link
      className={[
        'promo-card',
        `promo-card--${variant}`
      ].join(' ')}
      to={href}
      aria-label={ariaLabel || title}
    >
      <div className="promo-card__body">
        {icon && (
          <div className="promo-card__icon" aria-hidden>
            {icon}
          </div>
        )}
        <div className="promo-card__text">
          <div className="promo-card__title">{title}</div>
          {subtitle && <div className="promo-card__sub">{subtitle}</div>}
          {typeof count === 'number' && (
            <div className="promo-card__count">Shop all {count}</div>
          )}
        </div>
        <div className="promo-card__arrow" aria-hidden>›</div>
      </div>
    </Link>
  );
}

PromoLinkCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  href: PropTypes.string.isRequired,
  count: PropTypes.number,
  icon: PropTypes.node,
  variant: PropTypes.oneOf(['category', 'deals', 'collection']),
  ariaLabel: PropTypes.string,
};
