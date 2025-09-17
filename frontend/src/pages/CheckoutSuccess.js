// CheckoutSuccess.js
import React from 'react';
import { Link } from 'react-router-dom';

function CheckoutSuccess() {
  return (
    <div style={{ maxWidth: 600, margin: '60px auto', padding: '40px 20px', backgroundColor: '#fff', textAlign: 'center', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', fontFamily: 'Poppins, sans-serif' }}>
  <h1 style={{ fontSize: '2rem', color: 'var(--color-primary)' }}>🎉 Order Successful!</h1>
      <p style={{ fontSize: '1.1rem', marginTop: 20, color: '#444' }}>
        Thank you for your purchase. You’ll receive an email confirmation shortly.
      </p>
      <div style={{ marginTop: 30, display: 'flex', justifyContent: 'center', gap: 20 }}>
        <Link to="/shop" style={{ backgroundColor: '#0984e3', color: 'white', padding: '10px 20px', borderRadius: 6, textDecoration: 'none' }}>
          Continue Shopping
        </Link>
  <Link to="/account/orders" style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '10px 20px', borderRadius: 6, textDecoration: 'none' }}>
          View My Orders
        </Link>
      </div>
    </div>
  );
}

export default CheckoutSuccess;
