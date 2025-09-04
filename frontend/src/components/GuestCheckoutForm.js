import React, { useState } from 'react';
import styles from './GuestCheckoutForm.module.css';

export default function GuestCheckoutForm({ onSubmit, isSubmitting }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    country: ''
  });
  const [fieldError, setFieldError] = useState({});
  // Remove local isLoading, use isSubmitting from parent

  const validate = () => {
    const errors = {};
    if (!form.name) errors.name = 'Name is required.';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Valid email required.';
    if (!form.phone) errors.phone = 'Phone is required.';
    if (!form.address) errors.address = 'Shipping address is required.';
    if (!form.country) errors.country = 'Country is required.';
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setFieldError((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldError(errors);
      return;
    }
    if (onSubmit) onSubmit(form);
  };

  return (
    <form className={styles.guestCheckoutForm} onSubmit={handleSubmit}>
      <h2>Guest Checkout</h2>
      <div className={styles.formGroup}>
        <label htmlFor="guest-name">Full Name</label>
        <input id="guest-name" name="name" value={form.name} onChange={handleChange} />
        {fieldError.name && <div className={styles.errorMsg}>{fieldError.name}</div>}
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="guest-email">Email</label>
        <input id="guest-email" name="email" type="email" value={form.email} onChange={handleChange} />
        {fieldError.email && <div className={styles.errorMsg}>{fieldError.email}</div>}
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="guest-phone">Phone</label>
        <input id="guest-phone" name="phone" value={form.phone} onChange={handleChange} />
        {fieldError.phone && <div className={styles.errorMsg}>{fieldError.phone}</div>}
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="guest-address">Shipping Address</label>
        <input id="guest-address" name="address" value={form.address} onChange={handleChange} />
        {fieldError.address && <div className={styles.errorMsg}>{fieldError.address}</div>}
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="guest-country">Country</label>
        <input id="guest-country" name="country" value={form.country} onChange={handleChange} />
        {fieldError.country && <div className={styles.errorMsg}>{fieldError.country}</div>}
      </div>
      <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
        {isSubmitting ? '...' : 'Place Order as Guest'}
      </button>
    </form>
  );
}
