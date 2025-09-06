import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import styles from './BackButton.module.css';

const BackButton = ({ label = '← Back' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Do not show back button on homepage
  if (location.pathname === '/') return null;

  return (
    <button 
      onClick={() => navigate(-1)}
      className={styles.backButton}
      aria-label="Go back to previous page"
      type="button"
    >
      {label}
    </button>
  );
};

BackButton.propTypes = {
  label: PropTypes.string
};

BackButton.defaultProps = {
  label: '← Back'
};

export default BackButton;