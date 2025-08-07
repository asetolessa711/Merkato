import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from './LoginPage.module.css';

function LoginPage() {
  // Use a single form state for easier input handling
  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [fieldError, setFieldError] = useState({});
  const navigate = useNavigate();
  const lang = localStorage.getItem('merkato-lang') || 'en';

  // --- Enhanced useEffect for token check and debug ---
  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      if (!storedUser || !token) {
        console.log('[Auto-Login] No stored user or token.');
        return;
      }

      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('[Auto-Login Check] Token:', token);
      console.log('[Auto-Login Check] Decoded Payload:', payload);

      if (payload.exp * 1000 < Date.now()) {
        console.warn('[Auto-Login] Token has expired.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return;
      }

      const role = storedUser?.roles?.[0] || storedUser?.role;

      if (window.location.pathname === '/login') {
        if (
          storedUser.roles?.includes('admin') ||
          storedUser.roles?.includes('global_admin') ||
          storedUser.roles?.includes('country_admin')
        ) {
          navigate('/admin');
        } else if (storedUser.roles?.includes('vendor') || role === 'vendor') {
          navigate('/vendor');
        } else {
          navigate('/account/dashboard');
        }
      }
    } catch (err) {
      console.error('[Auto-Login Check] Error decoding token:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, [navigate]);
  // --- End enhanced useEffect ---

  const labels = {
    en: {
      title: 'Login',
      email: 'Email',
      password: 'Password',
      submit: 'Sign In',
      remember: 'Remember Me',
      forgot: 'Forgot Password?',
      success: 'Logged in!',
      fail: 'We couldn’t log you in. Please check your email and password and try again.'
    },
    // Other languages omitted for brevity...
  };

  const t = labels[lang] || labels.en;

  const validateFields = () => {
    const errors = {};
    if (!form.email) {
      errors.email = 'Please enter your email address.';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errors.email = 'Please enter a valid email address (e.g., user@example.com).';
    }
    if (!form.password) {
      errors.password = 'Please enter your password.';
    } else if (form.password.length < 3) {
      errors.password = 'Your password must be at least 3 characters.';
    }
    return errors;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMsg('');
    setIsError(false);
    setFieldError({});

    const errors = validateFields();
    if (Object.keys(errors).length > 0) {
      setFieldError(errors);
      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post('/api/auth/login', { email: form.email, password: form.password });
      const token = res.data.token;
      // Prefer roles[0] over role for consistency
      const role = res.data.roles?.[0] || res.data.role;

      if (!token || !role) throw new Error('Invalid login response');

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ ...res.data, role }));
      if (remember) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }

      setMsg(t.success);
      setTimeout(() => {
        if (
          res.data.roles?.includes('admin') ||
          res.data.roles?.includes('global_admin') ||
          res.data.roles?.includes('country_admin')
        ) {
          navigate('/admin');
        } else if (res.data.roles?.includes('vendor') || role === 'vendor') {
          navigate('/vendor');
        } else {
          navigate('/account/dashboard'); // Redirect customers to dashboard
        }
      }, 500);
    } catch (err) {
      console.error('Login failed:', err);
      setMsg(t.fail);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h2 className={styles.title}>{t.title}</h2>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>{t.email}</label>
          <input
            data-cy="email-input"
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className={`${styles.input} ${fieldError.email ? styles.inputError : ''}`}
            autoComplete="email"
            disabled={isLoading}
          />
          {fieldError.email && <div className={styles.errorMsg}>{fieldError.email}</div>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>{t.password}</label>
          <div className={styles.passwordWrapper}>
            <input
              data-cy="password-input"
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              className={`${styles.input} ${fieldError.password ? styles.inputError : ''}`}
              autoComplete="current-password"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={styles.togglePassword}
              aria-label="Toggle password visibility"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {fieldError.password && <div className={styles.errorMsg}>{fieldError.password}</div>}
        </div>

        <div className={styles.formOptions}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={isLoading}
            />
            {t.remember}
          </label>
          <a href="/forgot-password" className={styles.forgotLink}>{t.forgot}</a>
        </div>

        <button
          data-cy="login-button"
          type="submit"
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? '...' : t.submit}
        </button>
      </form>

      {msg && (
        <div className={`${styles.message} ${isError ? styles.error : styles.success}`}>
          {msg}
        </div>
      )}
    </div>
  );
}

export default LoginPage;