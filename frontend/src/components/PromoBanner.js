import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './PromoBanner.module.css';

const PROMO_MESSAGES = [
  '🎉 Kids Fashion Week Sale – up to 30% off!',
  '🌟 New Arrivals: Ethiopian Traditional Wear',
  '🚚 Free Shipping on Orders Over $50',
  '🎁 Gift Cards Now Available!'
];

function PromoBanner({ initialMessage, rotationInterval = 5000 }) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentMessage, setCurrentMessage] = useState(initialMessage);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        const nextIndex = (prev + 1) % PROMO_MESSAGES.length;
        setCurrentMessage(PROMO_MESSAGES[nextIndex]);
        return nextIndex;
      });
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [isVisible, rotationInterval]);

  if (!isVisible) return null;

  return (
    <div 
      className={styles.promoBanner} 
      aria-live="polite" 
      role="alert"
    >
      <span>{currentMessage}</span>
      <button
        onClick={() => setIsVisible(false)}
        className={styles.dismissButton}
        aria-label="Dismiss promotion"
      >
        ×
      </button>
    </div>
  );
}

PromoBanner.propTypes = {
  initialMessage: PropTypes.string,
  rotationInterval: PropTypes.number
};

PromoBanner.defaultProps = {
  initialMessage: PROMO_MESSAGES[0],
  rotationInterval: 5000
};

export default React.memo(PromoBanner);