import React from 'react';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { MessageContext } from '../src/context/MessageContext';

// Polyfills / environment stubs for Chromatic rendering (headless Chrome)
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  }
  if (!window.scrollTo) {
    window.scrollTo = () => {};
  }
  if (!window.fetch) {
    window.fetch = async () => ({ ok: true, json: async () => ({}), text: async () => '' });
  }
}

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
  chromatic: { delay: 400 }
};

// Broader axios mocks to prevent hanging requests in stories
axios.get = async (url) => {
  try {
    // Auth
    if (url.includes('/api/auth/me')) {
      const stored = JSON.parse(localStorage.getItem('user') || 'null');
      return { data: { user: stored || { email: 'story@example.com', roles: ['customer'], name: 'Story User' } } };
    }
    // Customer orders
    if (url.includes('/api/orders/my')) {
      const injected = JSON.parse(localStorage.getItem('e2e-orders') || '[]');
      return { data: { orders: injected } };
    }
    // Vendor orders
    if (url.includes('/api/orders/vendor-orders')) {
      const injected = JSON.parse(localStorage.getItem('e2e-vendor-orders') || '[]');
      return { data: { orders: injected } };
    }
    // Addresses / delivery settings
    if (url.includes('/api/customer/addresses')) return { data: { addresses: [{ _id: 'addr1', street: '123 Story St', city: 'Town', country: 'US' }] } };
    if (url.includes('/api/products/delivery-settings')) return { data: { methods: [{ _id: 'm1', name: 'Standard', days: 5 }] } };
    if (url.includes('/api/products')) return { data: { products: [] } };
    if (url.includes('/api/stripe/create-checkout-session')) return { data: { id: 'sess_test_123' } };
  } catch {}
  return { data: {} };
};
axios.post = async (url) => {
  if (url.includes('/api/auth/register')) {
    const fakeUser = { _id: 'u-new', name: 'New User', email: 'new@example.com', roles: ['customer'] };
    return { data: { token: 't-new', user: fakeUser } };
  }
  if (url.includes('/api/stripe/create-checkout-session')) return { data: { id: 'sess_test_123' } };
  return { data: {} };
};

// Ensure numeric safety for any order arrays to prevent .toFixed on undefined
function sanitizeOrders(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const fixed = parsed.map(o => ({
      discount: 0,
      totalAfterDiscount: o.total,
      ...o,
      total: typeof o.total === 'number' ? o.total : 0,
      vendors: (o.vendors || []).map(v => ({
        subtotal: v.subtotal ?? 0,
        tax: v.tax ?? 0,
        shipping: v.shipping ?? 0,
        total: v.total ?? (v.subtotal ?? 0) + (v.tax ?? 0) + (v.shipping ?? 0),
        ...v,
        products: (v.products || []).map(p => ({
          price: p.price ?? p.product?.price ?? 0,
          quantity: p.quantity ?? 1,
          tax: p.tax ?? 0,
          subtotal: p.subtotal ?? ((p.price ?? p.product?.price ?? 0) * (p.quantity ?? 1)),
          ...p
        }))
      }))
    }));
    localStorage.setItem(key, JSON.stringify(fixed));
  } catch {}
}

sanitizeOrders('e2e-orders');
sanitizeOrders('e2e-vendor-orders');

// Global decorator to wrap stories if needed later (router, providers)
// Avoid JSX here so preview.js doesn't require Babel transpilation
export const decorators = [
  (Story, context) => {
    const messageApi = { message: null, type: 'success', showMessage: () => {} };
    const storyElement = React.createElement(Story);
    // Allow stories that manage their own router to opt out
    if (context?.parameters?.skipGlobalRouter) {
      return React.createElement(MessageContext.Provider, { value: messageApi }, storyElement);
    }
    return React.createElement(
      MemoryRouter,
      { initialEntries: ['/'] },
      React.createElement(MessageContext.Provider, { value: messageApi }, storyElement)
    );
  }
];
