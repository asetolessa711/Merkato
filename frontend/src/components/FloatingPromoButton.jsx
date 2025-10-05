import React from 'react';
import { useNavigate } from 'react-router-dom';

function FloatingPromoButton({ setShowFeedback }) {
  const navigate = useNavigate();

  // Gutter-aware fixed wrapper lives entirely outside the 1200px content column.
  // Children are aligned within the wrapper so they never cover the cards.
  return (
    <div
      aria-hidden="false"
      style={{
        position: 'fixed',
        right: 0,
        bottom: 30,
        width: 'max(16px, calc((100vw - 1320px)/2))', // width equals outer gutter
        pointerEvents: 'none', // let only inner stack receive events
        zIndex: 999
      }}
    >
      <div
        data-testid="floating-ui"
        className="promo-fab"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end', // hug viewport edge inside gutter
          gap: 10,
          paddingRight: 16,
          pointerEvents: 'auto',
          overflow: 'clip' // never bleed into the content column
        }}
      >
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
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            maxWidth: 'min(240px, max(120px, calc((100vw - 1320px)/2 - 24px)))',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
          title="Promo Manager"
        >
          🎁 Promo Manager
        </button>
      </div>
    </div>
  );
}

export default FloatingPromoButton;
