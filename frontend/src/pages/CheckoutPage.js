
import React, { useEffect, useState } from 'react';
import GuestCheckoutForm from '../components/GuestCheckoutForm';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';


const CheckoutPage = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [orderMsg, setOrderMsg] = useState('');
  const [orderError, setOrderError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(true);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('merkato-cart'));
      setCart(Array.isArray(data) ? data : []);
    } catch {
      setCart([]);
    }
    // Check for logged-in user
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setUser(res.data.user || res.data))
        .catch(() => setUser(null))
        .finally(() => setCheckingUser(false));
    } else {
      setCheckingUser(false);
    }
  }, []);

  if (checkingUser) {
    return <div>Loading checkout...</div>;
  }
  if (!cart.length) {
    return <div>Your cart is empty</div>;
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Handler for guest checkout form submit
  const handleGuestCheckout = async (guestInfo) => {
    setIsSubmitting(true);
    setOrderMsg('');
    setOrderError('');
    try {
      const payload = {
        items: cart,
        guestName: guestInfo.name,
        guestEmail: guestInfo.email,
        guestPhone: guestInfo.phone,
        guestAddress: guestInfo.address,
        guestCountry: guestInfo.country,
        total
      };
      const res = await axios.post('/api/orders', payload);
      setOrderMsg('Order placed successfully!');
      setCart([]);
      localStorage.removeItem('merkato-cart');
      setTimeout(() => navigate('/order-confirmation', { state: { order: res.data } }), 800);
    } catch (err) {
      setOrderError(err.response?.data?.message || 'Order failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for logged-in user checkout
  const handleUserCheckout = async () => {
    setIsSubmitting(true);
    setOrderMsg('');
    setOrderError('');
    try {
      const token = localStorage.getItem('token');
      const payload = {
        items: cart,
        total
      };
      const res = await axios.post('/api/orders', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrderMsg('Order placed successfully!');
      setCart([]);
      localStorage.removeItem('merkato-cart');
      setTimeout(() => navigate('/order-confirmation', { state: { order: res.data } }), 800);
    } catch (err) {
      setOrderError(err.response?.data?.message || 'Order failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <ul>
        {cart.map(item => (
          <li key={item._id}>
            <span>{item.name}</span>
            <span>{item.quantity}</span>
            <span>${item.price}</span>
          </li>
        ))}
      </ul>
      <div>Total: ${total}</div>
      <hr />
      {user ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Logged in as:</strong> {user.name} ({user.email})
          </div>
          <button onClick={handleUserCheckout} disabled={isSubmitting} style={{ marginTop: 8 }}>
            {isSubmitting ? 'Placing Order...' : 'Place Order as Registered User'}
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 8 }}>
            <a href="/login" style={{ marginRight: 12 }}>Log in for faster checkout</a>
            <span>or continue as guest:</span>
          </div>
          <GuestCheckoutForm onSubmit={handleGuestCheckout} isSubmitting={isSubmitting} />
        </>
      )}
      {orderMsg && <div style={{ color: 'green', marginTop: 10 }}>{orderMsg}</div>}
      {orderError && <div style={{ color: 'red', marginTop: 10 }}>{orderError}</div>}
    </div>
  );
};

export default CheckoutPage;
