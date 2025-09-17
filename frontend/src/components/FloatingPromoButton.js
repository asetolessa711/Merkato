import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

function FloatingPromoButton({ setShowFeedback }) {
  const navigate = useNavigate();
  const isAdmin = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u?.role === 'admin' || (Array.isArray(u?.roles) && u.roles.includes('admin'));
    } catch (_) { return false; }
  }, []);

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
      {isAdmin && (
        <button
          onClick={() => navigate('/admin/promo-manager')}
          style={{
            backgroundColor: '#6c5ce7',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: 44,
            height: 44,
            fontSize: 20,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
          }}
          title="Promo Manager"
          aria-label="Open Promo Manager"
        >
          🎁
        </button>
      )}
    </div>
  );
}

export default FloatingPromoButton;
