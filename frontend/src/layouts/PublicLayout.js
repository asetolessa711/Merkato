import React from 'react';
import PropTypes from 'prop-types';
import Navbar from '../components/Navbar';
import styles from './PublicLayout.module.css';

function PublicLayout({ children, user, onLogout, lang, onLangChange }) {
  return (
    <div className={styles.layout}>
      <Navbar
        user={user}
        onLogout={onLogout}
        lang={lang}
        onLangChange={onLangChange}
      />
      <main className={styles.container}>
        {children}
      </main>
    </div>
  );
}

PublicLayout.propTypes = {
  children: PropTypes.node.isRequired,
  user: PropTypes.object,
  onLogout: PropTypes.func.isRequired,
  lang: PropTypes.string,
  onLangChange: PropTypes.func
};

PublicLayout.defaultProps = {
  user: null,
  lang: 'en',
  onLangChange: () => {}
};

export default React.memo(PublicLayout);