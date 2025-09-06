import React, { useEffect, useState } from 'react';
import { useMessage } from '../context/MessageContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadCart, saveCart, isCartExpired } from '../utils/cartStorage';

function CartPage() {
  const [cart, setCart] = useState([]);
  const { showMessage } = useMessage();
  const navigate = useNavigate();
  // Allow guests to view cart; token only needed later at order time
  const token = localStorage.getItem('token') || localStorage.getItem('merkato-token');

  useEffect(() => {
    const authed = Boolean(token);
    if (isCartExpired(authed)) {
      localStorage.removeItem('merkato-cart');
  localStorage.removeItem('merkato-cart-ttl');
      setCart([]);
      return;
    }
    const { items } = loadCart();
    setCart(items || []);
  }, [navigate, token]);

  const updateAndSaveCart = (newCart, actionMsg = null, type = 'success') => {
    setCart(newCart);
    saveCart(newCart, Boolean(token));
    if (actionMsg) showMessage(actionMsg, type);
  };

  const updateQuantity = (index, amount) => {
    const updated = [...cart];
    updated[index].quantity += amount;
    if (updated[index].quantity < 1) updated[index].quantity = 1;
    updateAndSaveCart(updated, 'Cart updated!', 'success');
  };

  const removeItem = (index) => {
    const updated = cart.filter((_, i) => i !== index);
    updateAndSaveCart(updated, 'Item removed from cart.', 'success');
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = () => {
    // Frictionless checkout: allow navigation regardless of auth
    navigate('/checkout');
  };

  if (cart.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: 60 }}>
        <h2>Your cart is empty</h2>
        <p>Check out our newest products and deals below:</p>
        <Link to="/shop" style={{
          display: 'inline-block',
          marginTop: 20,
          padding: '10px 16px',
          backgroundColor: '#00B894',
          color: 'white',
          borderRadius: 6,
          textDecoration: 'none'
        }}>🛍️ Go back to Shop</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <Link to="/" style={{ textDecoration: 'none', fontSize: '2rem', fontWeight: 'bold' }}>
          <span style={{ color: '#00B894' }}>M</span>
          <span style={{ color: '#3498DB' }}>e</span>
          <span style={{ color: '#E67E22' }}>r</span>
          <span style={{ color: '#9B59B6' }}>k</span>
          <span style={{ color: '#E74C3C' }}>a</span>
          <span style={{ color: '#3498DB' }}>t</span>
          <span style={{ color: '#00B894' }}>o</span>
        </Link>
        <h2>Your Cart</h2>
      </div>

      {cart.map((item, index) => (
        <div key={index} style={{
          borderBottom: '1px solid #ccc',
          padding: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h4>{item.name}</h4>
            <p>${item.price} × {item.quantity}</p>
          </div>
          <div>
            <button onClick={() => updateQuantity(index, -1)} style={btn}>-</button>
            <button onClick={() => updateQuantity(index, 1)} style={btn}>+</button>
            <button onClick={() => removeItem(index)} style={{ ...btn, backgroundColor: '#e74c3c' }}>Remove</button>
          </div>
        </div>
      ))}

      <h3 style={{ textAlign: 'right', marginTop: 20 }}>Total: ${total.toFixed(2)}</h3>

      {/* Global message system now handles feedback */}

      <div style={{ textAlign: 'right' }}>
        <button
          data-testid="checkout-btn" // ✅ Add test id for Cypress
          onClick={handleCheckout}
          style={{
            backgroundColor: '#00B894',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: 6,
            fontWeight: 'bold',
            marginTop: 20
          }}
        >
          ✅ Proceed to Checkout
        </button>
      </div>
    </div>
  );
}

const btn = {
  margin: '0 5px',
  padding: '6px 10px',
  border: 'none',
  borderRadius: 4,
  backgroundColor: '#3498DB',
  color: 'white',
  fontWeight: 'bold',
  cursor: 'pointer'
};

export default CartPage;
