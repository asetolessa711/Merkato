// src/pages/VendorOnboarding.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MerkatoFooter from '../components/MerkatoFooter';
import styles from '../layouts/VendorLayout.module.css';

function VendorOnboarding() {
  const navigate = useNavigate();
  const [steps, setSteps] = useState([
    { key: 'storeInfo', label: 'Complete Store Information', done: false },
    { key: 'uploadProduct', label: 'Upload Your First Product', done: false },
    { key: 'readGuidelines', label: 'Review Vendor Guidelines', done: false },
    { key: 'joinGroup', label: 'Join the Merkato Vendor Group', done: false }
  ]);

  useEffect(() => {
    const stored = localStorage.getItem('onboarding');
    if (stored) {
      const completed = JSON.parse(stored);
      setSteps(prev =>
        prev.map(step => ({
          ...step,
          done: completed.includes(step.key)
        }))
      );
    }
  }, []);

  const toggleStep = (key) => {
    setSteps(prev => {
      const updated = prev.map(step =>
        step.key === key ? { ...step, done: !step.done } : step
      );
      const completedKeys = updated.filter(s => s.done).map(s => s.key);
      localStorage.setItem('onboarding', JSON.stringify(completedKeys));
      return updated;
    });
  };

  return (
    <div className={styles.contentArea}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2.2rem', color: '#00B894', fontWeight: 'bold' }}>
          Welcome to Merkato Vendor Center 🚀
        </h1>
        <p style={{ fontSize: '1rem', color: '#555', marginTop: '10px' }}>
          Let's launch your store in just 4 quick steps. Start selling and reaching new buyers today!
        </p>
      </div>

      {/* Steps List */}
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
              {step.key === 'storeInfo' && (
                <button
                  onClick={() => alert('Store Info Editing: Coming soon')}
                  style={{ marginTop: '8px', backgroundColor: '#3498DB', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Edit Store Info
                </button>
              )}
              {step.key === 'uploadProduct' && (
                <button
                  onClick={() => navigate('/upload')}
                  style={{ marginTop: '8px', backgroundColor: '#00B894', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Add Product
                </button>
              )}
              {step.key === 'readGuidelines' && (
                <button
                  onClick={() => window.open('https://example.com/guidelines', '_blank')}
                  style={{ marginTop: '8px', backgroundColor: '#FFA726', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Read Now
                </button>
              )}
              {step.key === 'joinGroup' && (
                <button
                  onClick={() => window.open('https://wa.me/123456789', '_blank')}
                  style={{ marginTop: '8px', backgroundColor: '#9B59B6', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Join WhatsApp
                </button>
              )}
            </div>
            <input
              type="checkbox"
              checked={step.done}
              onChange={() => toggleStep(step.key)}
              style={{ transform: 'scale(1.5)' }}
            />
          </li>
        ))}
      </ul>

      {/* Footer Info */}
      <p style={{ marginTop: '30px', fontSize: '0.9rem', textAlign: 'center', color: '#777' }}>
        You can return to this page anytime at <strong>/vendor/onboarding</strong> to continue your journey.
      </p>

      <MerkatoFooter />
    </div>
  );
}

export default VendorOnboarding;
