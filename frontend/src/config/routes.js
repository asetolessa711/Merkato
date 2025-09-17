// Centralized route constants and helpers
// Keep paths aligned with App.js and E2E specs

export const ROUTES = {
  home: '/',
  shop: '/shop',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  upload: '/upload',
  cart: '/cart',
  checkout: '/checkout',
  checkoutSuccess: '/checkout-success',
  orderConfirmation: '/order-confirmation',
  account: '/account',
  accountDashboard: '/account/dashboard',
  accountOrders: '/account/orders',
  vendor: '/vendor',
  vendorDashboard: '/vendor/dashboard',
  vendorProducts: '/vendor/products',
  vendorUpload: '/vendor/upload',
  vendorProductUpload: '/vendor/products/upload',
  admin: '/admin',
  adminDashboard: '/admin/dashboard',
};

export const buildRoute = {
  productDetail: (id) => `/product/${id}`,
  vendorStore: (id) => `/vendor/${id}`,
};

export default ROUTES;
