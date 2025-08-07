import React, { useState, useEffect } from 'react';
import { useMessage } from '../context/MessageContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import styles from './RegisterPage.module.css';

function RegisterPage() {
  const { showMessage } = useMessage();
  // Remove rerender workaround, not needed after refactor
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const prefillRole = params.get('role');
  const [lang] = useState('en');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    country: '',
    roles: prefillRole ? [prefillRole] : []
  });
  const [user, setUser] = useState(null);
  const [isError, setIsError] = useState(false);
  const [msg, setMsg] = useState("");
  const [fieldError, setFieldError] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const labels = {
    en: {
      title: 'Create Your Account',
      name: 'Full Name',
      email: 'Email',
      password: 'Password',
      registerAs: 'Register As',
      submit: 'Register',
      login: 'Already have an account? Sign in',
      success: 'Account created!',
      fail: 'We couldn’t create your account. Please try again.',
      duplicate: 'This email is already registered. Please log in or use a different email.',
    }
  };
  const t = labels[lang] || labels.en;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => setUser(res.data.user || res.data))
        .catch(() => setUser(null));
    }
  }, []);

  const validate = () => {
    const errors = {};
    const name = form.name.trim();
    const email = form.email.trim();
    const password = form.password;
    const country = form.country.trim();
    if (!name) errors.name = 'Please enter your full name.';
    if (!email || !/\S+@\S+\.\S+/.test(email)) errors.email = 'Please enter a valid email address (e.g., user@example.com).';
    if (!password || password.trim().length < 6) errors.password = 'Your password must be at least 6 characters.';
    if (!country) errors.country = 'Please enter your country.';
    if (!form.roles.length) errors.roles = 'Please select your role.';
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'roles') {
      if (value === 'vendor') {
        navigate('/vendor-register');
        return;
      }
      setForm({ ...form, roles: [value] });
    } else {
      setForm({ ...form, [name]: value });
    }
    // Clear only the error for the changed field
    setFieldError((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setIsError(false);
    setMsg("");
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldError(errors);
      console.log('FIELD ERROR STATE:', errors);
      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post('/api/auth/register', form);
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user || res.data);
      // Optionally, show a global success message before redirecting
      // setMsg(t.success);
      // Reset form fields if not redirecting immediately
      // setForm({ name: '', email: '', password: '', country: '', roles: [] });
      navigate('/');
    } catch (err) {
      if (err.response?.status === 409) {
        setMsg(t.duplicate);
      } else if (err.response?.data?.errors) {
        // Clear all field errors, then set backend errors only
        setFieldError({ ...err.response.data.errors });
        setMsg(t.fail);
      } else {
        setMsg(t.fail);
      }
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // msg and isError already declared above, do not redeclare

  if (user) {
    return (
      <div className={styles.profileContainer}>
        <h2>You're already registered</h2>
        <p>Welcome back, <strong>{user.name}</strong>!</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Roles:</strong> {user.roles?.join(', ')}</p>
        <Link to="/edit-profile" className={styles.profileLink}>✏️ Edit Your Profile</Link>
        <br />
        <Link to="/" className={styles.homeLink}>← Back to Home</Link>
      </div>
    );
  }

  return (
    <div className={styles.registerContainer}>
      <h2 className={styles.title}>{t.title}</h2>
      {/* Global message system now handles feedback */}
      {msg && (
        <p
          className={`${styles.message} ${isError ? styles.error : styles.success}`}
          data-testid="global-message"
          role="alert"
        >
          {msg}
        </p>
      )}

      {/* DEBUG: Show fieldError.email for test visibility */}
      <div data-testid="debug-email-error">{fieldError.email}</div>

      <form onSubmit={handleSubmit}>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="register-name">{t.name}</label>
          <input
            id="register-name"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className={`${styles.input} ${fieldError.name ? styles.inputError : ''}`}
            disabled={isLoading}
          />
          {fieldError.name && <div className={styles.errorMsg}>{fieldError.name}</div>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="register-email">{t.email}</label>
          <input
            id="register-email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className={`${styles.input} ${fieldError.email ? styles.inputError : ''}`}
            disabled={isLoading}
          />
          <div className={styles.errorMsg} data-testid="email-error">
            {fieldError.email || ''}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="register-password">{t.password}</label>
          <div className={styles.passwordWrapper}>
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              className={`${styles.input} ${fieldError.password ? styles.inputError : ''}`}
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

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="register-roles">{t.registerAs}</label>
          <select
            id="register-roles"
            name="roles"
            value={form.roles[0] || ''}
            onChange={handleChange}
            className={`${styles.input} ${fieldError.roles ? styles.inputError : ''}`}
            disabled={isLoading}
          >
            <option value="">Select Role</option>
            <option value="customer">Customer (Buyer)</option>
            <option value="vendor">Vendor (Supplier)</option>
          </select>
          {fieldError.roles && <div className={styles.errorMsg}>{fieldError.roles}</div>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="register-country">Country</label>
          <input
            id="register-country"
            type="text"
            name="country"
            value={form.country}
            onChange={handleChange}
            className={`${styles.input} ${fieldError.country ? styles.inputError : ''}`}
            disabled={isLoading}
          />
          {fieldError.country && <div className={styles.errorMsg}>{fieldError.country}</div>}
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? '...' : t.submit}
        </button>
      </form>

      <p className={styles.loginRedirect}>
        <Link to="/login">{t.login}</Link>
      </p>
    </div>
  );
}
export default RegisterPage;
