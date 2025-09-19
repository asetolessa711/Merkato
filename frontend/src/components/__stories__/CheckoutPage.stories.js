// @trust-ui @persona-ui:customer
import React from 'react';
import CheckoutPage from '../../pages/CheckoutPage';

export default {
  title: 'Flows/CheckoutPage',
  component: CheckoutPage,
  parameters: {
    tags: ['@trust-ui', '@persona-ui:customer', '@visual']
  }
};

const seedCart = () => {
  try {
    window.localStorage.setItem('merkato-cart', JSON.stringify([
      { _id: 'p1', name: 'Sample Product', price: 25, quantity: 2 }
    ]));
  } catch (_) {}
};

export const GuestBasic = () => {
  seedCart();
  // Ensure guest (no token)
  try { window.localStorage.removeItem('token'); } catch(_) {}
  return <CheckoutPage />;
};
GuestBasic.storyName = 'Guest – Basic Cart';

export const CustomerWithSavedAddress = () => {
  seedCart();
  try {
    window.localStorage.setItem('token', 'fake-jwt');
    window.localStorage.setItem('user', JSON.stringify({ _id: 'u1', name: 'Jane Customer' }));
    window.localStorage.setItem('merkato-cart', JSON.stringify([{ _id: 'p2', name: 'Second Item', price: 10, quantity: 1 }]));
  } catch(_) {}
  return <CheckoutPage />;
};
CustomerWithSavedAddress.parameters = { tags: ['@trust-ui', '@persona-ui:customer', '@visual'] };
CustomerWithSavedAddress.storyName = 'Customer – With Saved Address (mock)';
