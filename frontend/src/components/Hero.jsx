import React from 'react';

function Hero({
  title = 'Discover Daily Deals',
  subtitle = 'Big savings across fashion, electronics, home, and more.',
  ctaText = 'Shop Now',
  onCtaClick,
  imageSrc = '/images/hero-default.jpg',
  imageAlt = 'Featured promotion',
}) {
  return (
    <section
      aria-label="Featured promotions"
      style={{
        display: 'grid',
        gridTemplateColumns: '1.3fr 1fr',
        gap: 16,
        alignItems: 'center',
        background: 'linear-gradient(90deg, #0b1020 0%, #121a35 100%)',
        color: '#fff',
        padding: '24px 16px',
        borderRadius: 12,
        margin: '16px auto',
        maxWidth: 1280,
      }}
    >
      <div>
        <h1 style={{ fontSize: 32, margin: '0 0 8px 0' }}>{title}</h1>
        <p style={{ opacity: 0.85, margin: '0 0 16px 0' }}>{subtitle}</p>
        <button
          data-testid="hero-cta"
          onClick={onCtaClick}
          style={{
            background: '#22c55e',
            color: '#111827',
            fontWeight: 800,
            border: 0,
            padding: '10px 14px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          {ctaText}
        </button>
      </div>
      <div>
        <img
          src={imageSrc}
          alt={imageAlt}
          style={{ width: '100%', height: 'auto', borderRadius: 12 }}
        />
      </div>
    </section>
  );
}

export default React.memo(Hero);
