import React from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import styles from './AuthLayout.module.css';

function AuthLayout({ children }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isForgotPassword = location.pathname === '/forgot-password';
  const showToggle = !isForgotPassword;

  return (
    <div className={styles.authLayout}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <Link to="/" className={styles.logoLink}>
            {['M', 'e', 'r', 'k', 'a', 't', 'o'].map((letter, index) => (
              <span 
                key={index} 
                className={`${styles.logoChar} ${styles[`logoChar${index + 1}`]}`}
              >
                {letter}
              </span>
            ))}
          </Link>
        </div>

        <div className={styles.formContainer}>
          {children}
        </div>

        {showToggle && (
          <div className={styles.toggleView}>
            {isLoginPage ? (
              <p>
                New to Merkato?{' '}
                <Link to="/register" className={styles.toggleLink}>
                  Create an account
                </Link>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <Link to="/login" className={styles.toggleLink}>
                  Sign in
                </Link>
              </p>
            )}
          </div>
        )}

        {isLoginPage && (
          <div className={styles.forgotPassword}>
            <Link to="/forgot-password" className={styles.forgotLink}>
              Forgot your password?
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired
};

export default AuthLayout;