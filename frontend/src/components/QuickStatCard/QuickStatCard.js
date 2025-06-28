import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import styles from './QuickStatCard.module.css';

function QuickStatCard({ icon, label, value, onClick }) {
  const handleKeyPress = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  }, [onClick]);

  return (
    <div 
      className={styles.card}
      onClick={onClick}
      onKeyPress={handleKeyPress}
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${value}`}
    >
      <div className={styles.icon} aria-hidden="true">{icon}</div>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
    </div>
  );
}

QuickStatCard.propTypes = {
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onClick: PropTypes.func.isRequired
};

export default React.memo(QuickStatCard);