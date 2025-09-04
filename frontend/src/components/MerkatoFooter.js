import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import styles from './MerkatoFooter.module.css';

const currentYear = new Date().getFullYear();

const MerkatoFooter = ({ showSocials = true }) => (
  <footer className={styles.footer}>
    <div className={styles.footerContent}>
      {/* Left: Powered by Merkato, year */}
      <div className={styles.copyright}>
        <span>
          Powered by <strong className={styles.brand}>Merkato</strong> &copy; {currentYear}
        </span>
        <span className={styles.copyrightYear}>
          All rights reserved.
        </span>
      </div>
      {/* Center: About, Terms, Privacy */}
      <div className={styles.footerLinks}>
        <Link to="/about">About</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
      </div>
      {/* Right: Socials and Contact */}
      {showSocials && (
        <div className={styles.socialLinks}>
          <a href="https://twitter.com/merkato" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
            Twitter
          </a>
          <a href="https://facebook.com/merkato" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            Facebook
          </a>
          <a href="https://instagram.com/merkato" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            Instagram
          </a>
          <a href="https://youtube.com/merkato" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
            YouTube
          </a>
          <a href="https://tiktok.com/@merkato" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
            TikTok
          </a>
          <Link to="/contact">Contact</Link>
        </div>
      )}
    </div>
  </footer>
);

MerkatoFooter.propTypes = {
  showSocials: PropTypes.bool
};

export default React.memo(MerkatoFooter);