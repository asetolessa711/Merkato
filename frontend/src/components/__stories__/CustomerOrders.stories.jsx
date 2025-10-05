// @persona-ui:customer
import React from 'react';
import CustomerOrders from '../../pages/CustomerOrders'';

export default {
  title: 'Orders/CustomerOrders',
  component: CustomerOrders,
  parameters: { tags: ['@persona-ui:customer', '@visual'] }
};

const injectOrders = (orders) => {
  try {
    window.localStorage.setItem('e2e-orders', JSON.stringify(orders));
    window.localStorage.setItem('token', 'cust-token');
    window.localStorage.setItem('user', JSON.stringify({ _id: 'c1', role: 'customer', name: 'Jane Shopper' }));
    window.localStorage.setItem('merkato-last-order-names', JSON.stringify(orders.flatMap(o => (o.vendors||[]).flatMap(v => (v.products||[]).map(p => p.name)))))
  } catch(_) {}
};

const baseOrder = {
  _id: 'c-ord1',
  status: 'delivered',
  currency: 'USD',
  total: 45.5,
  paymentMethod: 'card',
  buyer: { name: 'Jane Shopper', email: 'jane@example.com' },
  shippingAddress: { fullName: 'Jane Shopper', city: 'Metro', country: 'US' },
  vendors: [ { subtotal: 40, tax: 3, shipping: 2.5, total: 45.5, products: [ { name: 'Sample Item', quantity: 1, price: 40, tax: 3, subtotal: 40, product: { name: 'Sample Item', vendor: 'vX', price: 40 } } ] } ],
  updatedBy: { name: 'System' },
  updatedAt: new Date().toISOString()
};

export const Delivered = () => {
  injectOrders([baseOrder]);
  return <CustomerOrders />;
};
Delivered.storyName = 'Delivered Order';

export const WithReturnRequested = () => {
  injectOrders([{ ...baseOrder, _id: 'c-ord2', returnStatus: 'requested' }]);
  return <CustomerOrders />;
};
WithReturnRequested.parameters = { tags: ['@persona-ui:customer', '@visual'] };
WithReturnRequested.storyName = 'Order – Return Requested';
