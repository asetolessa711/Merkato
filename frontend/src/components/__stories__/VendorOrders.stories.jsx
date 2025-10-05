// @persona-ui:vendor
import React from 'react';
import VendorOrders from '../../pages/VendorOrders'';

export default {
  title: 'Orders/VendorOrders',
  component: VendorOrders,
  parameters: {
    tags: ['@persona-ui:vendor', '@visual']
  }
};

const injectOrders = (overrides = {}) => {
  const base = [{
    _id: 'ord1',
    status: 'delivered',
    currency: 'USD',
    total: 120.5,
    paymentMethod: 'card',
    buyer: { name: 'Buyer A', email: 'buyerA@example.com' },
    shippingAddress: { fullName: 'Buyer A', street: '1 Main', city: 'Town', country: 'US' },
    vendors: [
      {
        vendorId: 'v1',
        subtotal: 100,
        tax: 10,
        shipping: 10.5,
        total: 120.5,
        products: [ { name: 'Vendor Widget', quantity: 2, price: 50, tax: 5, subtotal: 100, product: { vendor: 'v1', name: 'Vendor Widget', price: 50 } } ]
      }
    ],
    createdAt: new Date().toISOString()
  }];
  try {
    window.localStorage.setItem('e2e-vendor-orders', JSON.stringify(overrides.orders || base));
    window.localStorage.setItem('token', 'vendor-token');
    window.localStorage.setItem('user', JSON.stringify({ _id: 'v1', role: 'vendor', name: 'Vendor One' }));
  } catch(_) {}
};

export const Default = () => {
  injectOrders();
  return <VendorOrders />;
};
Default.storyName = 'Default – Single Delivered Order';

export const WithReturnApproved = () => {
  injectOrders({ orders: [{
    _id: 'ord2',
    status: 'delivered',
    currency: 'USD',
    total: 85,
    paymentMethod: 'paypal',
    buyer: { name: 'Buyer B', email: 'buyerB@example.com' },
    shippingAddress: { fullName: 'Buyer B', street: '2 Main', city: 'Town', country: 'US' },
    vendors: [ { vendorId: 'v1', subtotal: 75, tax: 5, shipping: 5, total: 85, products: [ { name: 'Returnable Item', quantity: 1, price: 75, tax: 5, subtotal: 75, product: { vendor: 'v1', name: 'Returnable Item', price: 75 } } ] } ],
    createdAt: new Date().toISOString(),
    returnStatus: 'approved'
  }] });
  return <VendorOrders />;
};
WithReturnApproved.parameters = { tags: ['@persona-ui:vendor', '@visual'] };
WithReturnApproved.storyName = 'Order – Return Approved';
