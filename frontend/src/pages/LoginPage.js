import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from './LoginPage.module.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [fieldError, setFieldError] = useState({});
  const navigate = useNavigate();
  const lang = localStorage.getItem('merkato-lang') || 'en';

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    // Prefer roles[0] over role for consistency
    const role = storedUser?.roles?.[0] || storedUser?.role;
    if (storedUser && role) {
      if (
        storedUser.roles?.includes('admin') ||
        storedUser.roles?.includes('global_admin') ||
        storedUser.roles?.includes('country_admin')
      ) {
        navigate('/admin');
      } else if (storedUser.roles?.includes('vendor') || role === 'vendor') {
        navigate('/vendor');
      } else {
        navigate('/account');
      }
    }
  }, [navigate]);

  const labels = {
    en: {
      title: 'Login',
      email: 'Email',
      password: 'Password',
      submit: 'Sign In',
      remember: 'Remember Me',
      forgot: 'Forgot Password?',
      success: 'Logged in!',
      fail: 'Invalid credentials.'
    },
    // Other languages omitted for brevity...
  };

  const t = labels[lang] || labels.en;

  const validateFields = () => {
    const errors = {};
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Enter a valid email.';
    }
    if (!password || password.length < 3) {
      errors.password = 'Password must be at least 3 characters.';
    }
    return errors;
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
      const res = await axios.post('/api/auth/login', { email, password });
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
          navigate('/account');
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
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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