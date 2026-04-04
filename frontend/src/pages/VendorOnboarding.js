// src/pages/VendorOnboarding.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import MerkatoFooter from '../components/MerkatoFooter';
import styles from '../layouts/VendorLayout.module.css';

function VendorOnboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [productCount, setProductCount] = useState(0);
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchState = async () => {
      try {
        const [profileRes, productRes] = await Promise.all([
          axios.get('/api/vendor/profile/me', { headers }),
          axios.get('/api/vendor/products', { headers })
        ]);
        setProfile(profileRes.data);
        setProductCount(Array.isArray(productRes.data) ? productRes.data.length : 0);
      } catch (err) {
        setMessage('Failed to load onboarding state.');
      } finally {
        setLoading(false);
      }
    };

    fetchState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleComplete = async () => {
    setMessage('');
    try {
      await axios.post('/api/vendor/onboarding/complete', {}, { headers });
      setProfile((prev) => ({ ...(prev || {}), vendorStatus: 'onboarded' }));
      const existingUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (existingUser) {
        localStorage.setItem('user', JSON.stringify({ ...existingUser, vendorStatus: 'onboarded' }));
      }
      setMessage('Onboarding marked complete.');
    } catch (err) {
      setMessage('Failed to complete onboarding.');
    }
  };

  if (loading) {
    return <div className={styles.contentArea}>Loading onboarding state...</div>;
  }

  const storeInfoDone = Boolean(profile?.storeName && profile?.storeDescription);
  const firstProductDone = productCount > 0;
  const completionDone = ['onboarded', 'verified', 'active'].includes(String(profile?.vendorStatus || '').toLowerCase());

  const steps = [
    {
      key: 'storeInfo',
      label: 'Complete Store Information',
      done: storeInfoDone,
      actionLabel: 'Open Account Page',
      action: () => navigate('/vendor/account')
    },
    {
      key: 'uploadProduct',
      label: 'Upload Your First Product',
      done: firstProductDone,
      actionLabel: 'Add Product',
      action: () => navigate('/vendor/products/upload')
    },
    {
      key: 'complete',
      label: 'Mark Onboarding Complete',
      done: completionDone,
      actionLabel: 'Complete Onboarding',
      action: handleComplete,
      disabled: !storeInfoDone || !firstProductDone || completionDone
    }
  ];

  return (
    <div className={styles.contentArea}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2.2rem', color: '#00B894', fontWeight: 'bold' }}>Vendor Onboarding</h1>
        <p style={{ fontSize: '1rem', color: '#555', marginTop: '10px' }}>
          Complete your account and first listing to activate your vendor flow.
        </p>
        <p style={{ fontSize: '0.95rem', color: '#555' }}>
          Current status: <strong>{profile?.vendorStatus || 'new'}</strong>
        </p>
      </div>

      {message && <p style={{ textAlign: 'center' }}>{message}</p>}

      <ul style={{ padding: 0, listStyle: 'none' }}>
        {steps.map(step => (
          <li key={step.key} style={{
            marginBottom: '20px',
            background: '#f9f9f9',
            padding: '20px',
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
          }}>
            <div>
              <strong style={{ fontSize: '1.1rem' }}>{step.label}</strong><br />
              <button
                onClick={step.action}
                disabled={step.disabled}
                style={{
                  marginTop: '8px',
                  backgroundColor: step.disabled ? '#999' : '#00B894',
                  color: 'white',
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: step.disabled ? 'not-allowed' : 'pointer'
                }}
              >
                {step.actionLabel}
              </button>
            </div>
            <input
              type="checkbox"
              checked={step.done}
              readOnly
              style={{ transform: 'scale(1.5)' }}
            />
          </li>
        ))}
      </ul>

      <p style={{ marginTop: '30px', fontSize: '0.9rem', textAlign: 'center', color: '#777' }}>
        You can return to this page anytime at <strong>/vendor/onboarding</strong> to continue your journey.
      </p>

      <MerkatoFooter />
    </div>
  );
}

export default VendorOnboarding;
