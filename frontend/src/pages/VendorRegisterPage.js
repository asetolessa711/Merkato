import React, { useState } from 'react';
import axios from 'axios';
import styles from './VendorRegisterPage.module.css';
import { useMessage } from '../context/MessageContext';

export default function VendorRegisterPage() {
  const [form, setForm] = useState({
    businessName: '',
    contactName: '',
    email: '',
    password: '',
    country: '',
    address: '',
    phone: '',
    businessType: '',
    website: '',
    taxId: '',
    agree: false,
    roles: ['vendor']
  });
  const [fieldError, setFieldError] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { showMessage } = useMessage();

  const validate = () => {
    const errors = {};
    if (!form.businessName) errors.businessName = 'Business name is required.';
    if (!form.contactName) errors.contactName = 'Contact name is required.';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Valid email required.';
    if (!form.password || form.password.length < 6) errors.password = 'Password must be at least 6 characters.';
    if (!form.country) errors.country = 'Country is required.';
    if (!form.address) errors.address = 'Business address is required.';
    if (!form.phone) errors.phone = 'Phone number is required.';
    if (!form.businessType) errors.businessType = 'Business type is required.';
    if (!form.agree) errors.agree = 'You must agree to the terms.';
    return errors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
    setFieldError((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldError(errors);
      setIsLoading(false);
      return;
    }
    try {
      await axios.post('/api/auth/register', form);
      showMessage('Vendor registration submitted! Please check your email for verification or admin approval.', 'success');
    } catch (err) {
      showMessage('Registration failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.vendorRegisterContainer}>
      <h2>Vendor Registration</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Business Name</label>
          <input name="businessName" value={form.businessName} onChange={handleChange} />
          {fieldError.businessName && <div className={styles.errorMsg}>{fieldError.businessName}</div>}
        </div>
        <div className={styles.formGroup}>
          <label>Contact Name</label>
          <input name="contactName" value={form.contactName} onChange={handleChange} />
          {fieldError.contactName && <div className={styles.errorMsg}>{fieldError.contactName}</div>}
        </div>
        <div className={styles.formGroup}>
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} />
          {fieldError.email && <div className={styles.errorMsg}>{fieldError.email}</div>}
        </div>
        <div className={styles.formGroup}>
          <label>Password</label>
          <input name="password" type="password" value={form.password} onChange={handleChange} />
          {fieldError.password && <div className={styles.errorMsg}>{fieldError.password}</div>}
        </div>
        <div className={styles.formGroup}>
          <label>Country</label>
          <input name="country" value={form.country} onChange={handleChange} />
          {fieldError.country && <div className={styles.errorMsg}>{fieldError.country}</div>}
        </div>
        <div className={styles.formGroup}>
          <label>Business Address</label>
          <input name="address" value={form.address} onChange={handleChange} />
          {fieldError.address && <div className={styles.errorMsg}>{fieldError.address}</div>}
        </div>
        <div className={styles.formGroup}>
          <label>Phone Number</label>
          <input name="phone" value={form.phone} onChange={handleChange} />
          {fieldError.phone && <div className={styles.errorMsg}>{fieldError.phone}</div>}
        </div>
        <div className={styles.formGroup}>
          <label>Business Type</label>
          <select name="businessType" value={form.businessType} onChange={handleChange}>
            <option value="">Select Type</option>
            <option value="manufacturer">Manufacturer</option>
            <option value="wholesaler">Wholesaler</option>
            <option value="retailer">Retailer</option>
            <option value="other">Other</option>
          </select>
          {fieldError.businessType && <div className={styles.errorMsg}>{fieldError.businessType}</div>}
        </div>
        <div className={styles.formGroup}>
          <label>Website (optional)</label>
          <input name="website" value={form.website} onChange={handleChange} />
        </div>
        <div className={styles.formGroup}>
          <label>Tax ID / Business Registration (optional)</label>
          <input name="taxId" value={form.taxId} onChange={handleChange} />
        </div>
        <div className={styles.formGroup}>
          <label>
            <input type="checkbox" name="agree" checked={form.agree} onChange={handleChange} />
            I agree to the terms and conditions
          </label>
          {fieldError.agree && <div className={styles.errorMsg}>{fieldError.agree}</div>}
        </div>
        <button type="submit" className={styles.submitButton} disabled={isLoading}>
          {isLoading ? '...' : 'Register as Vendor'}
        </button>
      </form>
    </div>
  );
}
