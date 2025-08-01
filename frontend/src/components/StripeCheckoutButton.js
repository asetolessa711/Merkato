
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

function StripeCheckoutButton({ items = [], onSuccess, onError }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!items.length) return;
    setLoading(true);
    try {
      await axios.post('/api/stripe/create-checkout-session', { items }, {});
      const stripe = await loadStripe('pk_test_dummy');
      await stripe.redirectToCheckout({ sessionId: undefined });
      if (onSuccess) onSuccess();
    } catch (err) {
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Stripe Checkout"
      disabled={loading || !items.length}
    >
      {loading ? 'Processing...' : 'Checkout'}
    </button>
  );
}

StripeCheckoutButton.propTypes = {
  items: PropTypes.array.isRequired,
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
};

export default StripeCheckoutButton;
