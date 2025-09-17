import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import getOnboardingStep from '../utils/onboardingProgress';
import axios from 'axios';

export default function VendorOnboardInvite() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { step, total, percent, label } = getOnboardingStep('/vendor/onboard');
  const [status, setStatus] = useState('Verifying invite...');
  const token = new URLSearchParams(search).get('token');

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.post('/api/vendor/invite/verify', { token });
        setStatus('Invite verified. Redirecting you to onboarding...');
        setTimeout(() => navigate('/vendor/onboarding'), 1000);
      } catch (e) {
        setStatus('Invalid or expired invite. Please request a new link.');
      }
    })();
  }, [token]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <div aria-hidden style={{ height: 6, background: '#eef2ff', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${percent}%`, background: 'var(--color-primary)' }} />
        </div>
        <small style={{ color: '#555' }}>Step {step} of {total}: {label}</small>
      </div>
      <h2>Vendor Invite</h2>
      <p>{status}</p>
    </div>
  );
}
