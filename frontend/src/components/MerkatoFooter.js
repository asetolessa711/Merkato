import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import styles from './MerkatoFooter.module.css';

const currentYear = new Date().getFullYear();

const MerkatoFooter = ({ showSocials = true }) => (
  <footer className={styles.footer}>
    <div className={styles.footerContent}>
      {showSocials && (
        <div className={styles.socialLinks}>
          <a 
            href="https://twitter.com/merkato" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="Follow us on Twitter"
          >
            Twitter
          </a>
          <a 
            href="https://facebook.com/merkato" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="Follow us on Facebook"
          >
            Facebook
          </a>
          <a 
            href="https://instagram.com/merkato" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="Follow us on Instagram"
          >
            Instagram
          </a>
        </div>
      )}
      
      <div className={styles.footerLinks}>
        <Link to="/about">About Us</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/contact">Contact</Link>
      </div>

      <div className={styles.copyright}>
        <span>
          🔗 Powered by <strong className={styles.brand}>Merkato</strong>
        </span>
        <span className={styles.copyrightYear}>
          © {currentYear} Merkato. All rights reserved.
        </span>
      </div>
    </div>
  </footer>
);

MerkatoFooter.propTypes = {
  showSocials: PropTypes.bool
};

export default React.memo(MerkatoFooter);