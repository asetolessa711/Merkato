import React from 'react';
import { useNavigate } from 'react-router-dom';

function FloatingPromoButton({ setShowFeedback }) {
  const navigate = useNavigate();

  return (
  <div data-testid="floating-ui" style={{
      position: 'fixed',
      bottom: 30,
      right: 30,
      zIndex: 999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }}>
      <button
        onClick={() => setShowFeedback(true)}
        style={{
          backgroundColor: '#00B894',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: 50,
          height: 50,
          fontSize: 24,
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
        }}
        title="Send Feedback"
      >
        ✉️
      </button>

      <button
        onClick={() => navigate('/admin/promo-manager')}
        style={{
          backgroundColor: '#6c5ce7',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          padding: '8px 12px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
        }}
      >
        🎁 Promo Manager
      </button>
    </div>
  );
}

export default FloatingPromoButton;
