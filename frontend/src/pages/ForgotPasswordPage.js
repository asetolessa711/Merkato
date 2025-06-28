import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import styles from './ForgotPassword.module.css';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setIsError(true);
      setMessage('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setIsError(false);

    try {
      await axios.post('/api/auth/forgot-password', { email });
      setIsSubmitted(true);
      // More secure message that doesn't reveal account existence
      setMessage('If an account exists with this email, you will receive password reset instructions.');
    } catch (err) {
      setIsError(true);
      // Generic error message for security
      setMessage('Unable to process your request. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className={styles.successContainer}>
        <h2>Check Your Email</h2>
        <p>If the email address matches an account, you will receive password reset instructions shortly.</p>
        <p className={styles.securityNote}>
          Note: For security reasons, this email will only be sent if the address matches a registered account.
        </p>
        <div className={styles.actions}>
          <Link to="/login" className={styles.backLink}>Return to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Reset Your Password</h2>
      <p className={styles.subtitle}>
        Enter your email address and we'll send you instructions to reset your password.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>
            Email Address
            <span className={styles.required}>*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${styles.input} ${isError ? styles.inputError : ''}`}
            required
            disabled={isLoading}
            placeholder="Enter your email address"
            aria-describedby="email-error"
          />
        </div>

        {message && (
          <div 
            className={`${styles.message} ${isError ? styles.error : styles.success}`}
            role="alert"
          >
            {message}
          </div>
        )}

        <button 
          type="submit" 
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className={styles.loadingDot}>.</span>
              <span className={styles.loadingDot}>.</span>
              <span className={styles.loadingDot}>.</span>
            </>
          ) : (
            'Send Reset Instructions'
          )}
        </button>

        <div className={styles.footer}>
          <Link to="/login" className={styles.backLink}>
            ← Back to Login
          </Link>
        </div>
      </form>

      <div className={styles.securityInfo}>
        <p>
          For your security:
        </p>
        <ul>
          <li>The reset link will expire after 1 hour</li>
          <li>We never share your email with third parties</li>
          <li>Make sure to check your spam folder</li>
        </ul>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;