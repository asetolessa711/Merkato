import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import styles from './ResetPassword.module.css';

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      setMessage('');
      setIsError(false);
    };
  }, []);

  const getErrorMessage = (error) => {
    if (error.response?.status === 404) {
      return 'Reset token not found or has expired';
    }
    if (error.response?.status === 400) {
      return 'Invalid password format';
    }
    return 'Something went wrong. Please try again.';
  };

  const validatePassword = (pass) => {
    return (
      pass.length >= 6 &&
      /[A-Z]/.test(pass) &&
      /[a-z]/.test(pass) &&
      /\d/.test(pass)
    );
  };

  const isPasswordValid = validatePassword(password);
  const passwordsMatch = password === confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isPasswordValid) {
      setMessage('Password does not meet the requirements.');
      setIsError(true);
      return;
    }

    if (!passwordsMatch) {
      setMessage('Passwords do not match.');
      setIsError(true);
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      await axios.post('/api/auth/reset-password', { token, password });
      setMessage('Password has been reset successfully!');
      setIsError(false);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setMessage(getErrorMessage(err));
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Invalid Reset Link</h2>
        <p className={styles.message}>
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <Link to="/forgot-password" className={styles.link}>
          Return to Forgot Password
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Set New Password</h2>

      {message && (
        <div className={`${styles.message} ${isError ? styles.error : styles.success}`} role="alert">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>
            New Password <span className={styles.required}>*</span>
          </label>
          <div className={styles.passwordWrapper}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${styles.input} ${!isPasswordValid && password ? styles.inputError : ''}`}
              minLength="6"
              required
              aria-describedby="password-criteria"
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          <div id="password-criteria" className={styles.passwordRequirements}>
            <small>Password must:</small>
            <ul>
              <li className={password.length >= 6 ? styles.valid : styles.invalid}>
                Be at least 6 characters long
              </li>
              <li className={/[A-Z]/.test(password) ? styles.valid : styles.invalid}>
                Contain an uppercase letter
              </li>
              <li className={/[a-z]/.test(password) ? styles.valid : styles.invalid}>
                Contain a lowercase letter
              </li>
              <li className={/\d/.test(password) ? styles.valid : styles.invalid}>
                Include a number
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirm" className={styles.label}>
            Confirm Password <span className={styles.required}>*</span>
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`${styles.input} ${!passwordsMatch && confirm ? styles.inputError : ''}`}
            required
            disabled={!isPasswordValid}
          />
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={!isPasswordValid || !passwordsMatch || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className={styles.loadingDot}>.</span>
              <span className={styles.loadingDot}>.</span>
              <span className={styles.loadingDot}>.</span>
            </>
          ) : (
            'Reset Password'
          )}
        </button>

        <div className={styles.footer}>
          <Link to="/login" className={styles.backLink}>
            ← Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
}

export default ResetPasswordPage;
