// Centralized route constants and helpers
// @allow-hardcode - Route constant strings are source of truth and may include legacy paths like '/shop'
// Keep paths aligned with App.js and E2E specs

export const ROUTES = {
  home: '/',
  shop: '/shop',
  discover: '/discover',
  search: '/search',
  category: '/c/:category',
  categorySub: '/c/:category/:subcat',
  deals: '/deals/:dealType',
  customers: '/customers',
  vendors: '/vendors',
  favorites: '/favorites',
  about: '/about',
  terms: '/terms',
  privacy: '/privacy',
  contact: '/contact',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  editProfile: '/edit-profile',
  upload: '/upload',
  cart: '/cart',
  checkout: '/checkout',
  checkoutSuccess: '/checkout-success',
  orderConfirmation: '/order-confirmation',
  productDetail: '/product/:id',
  support: '/support',
  codex: '/codex',
  tasks: '/tasks',
  account: '/account',
  accountDashboard: '/account/dashboard',
  accountOrders: '/account/orders',
  accountGuide: '/account/guide',
  accountInbox: '/account/inbox',
  accountChat: '/account/chat/:userId',
  accountAddresses: '/account/addresses',
  accountWallet: '/account/wallet',
  accountRewards: '/account/rewards',
  accountNotifications: '/account/notifications',
  vendor: '/vendor',
  vendorDashboard: '/vendor/dashboard',
  vendorAccount: '/vendor/account',
  vendorOnboarding: '/vendor/onboarding',
  vendorOrders: '/vendor/orders',
  vendorProducts: '/vendor/products',
  vendorProductUpload: '/vendor/products/upload',
  vendorGuide: '/vendor/guide',
  vendorAnalytics: '/vendor/analytics',
  vendorInvoices: '/vendor/invoices',
  vendorMarketing: '/vendor/marketing',
  vendorChat: '/vendor/chat/:userId',
  vendorInbox: '/vendor/inbox',
  vendorQuestions: '/vendor/questions',
  admin: '/admin',
  adminDashboard: '/admin/dashboard',
  adminPromoCodes: '/admin/promo-codes',
  adminPromoManager: '/admin/promo-manager',
  adminVendors: '/admin/vendors',
  adminOrders: '/admin/orders',
  adminExpenses: '/admin/expenses',
  adminFeedback: '/admin/feedback',
  adminSupport: '/admin/support',
  adminAnalytics: '/admin/analytics',
  adminFlags: '/admin/flags',
  adminDiscount: '/admin/discount',
  adminReviewModeration: '/admin/review-moderation',
  adminDeliveryOptions: '/admin/delivery-options',
  adminInvoicesReport: '/admin/invoices/report',
  adminInvoices: '/admin/invoices',
  adminMegaMenu: '/admin/mega-menu',
  adminMarketing: '/admin/marketing',
  adminRailsMetrics: '/admin/marketing/rails',
  adminHeroBanners: '/admin/hero-banners',
  vendorStore: '/vendor/:id',
  vendorStorefront: '/v/:slug',
};

export const buildRoute = {
  productDetail: (id) => `/product/${id}`,
  vendorStore: (id) => `/vendor/${id}`,
  vendorStorefront: (slug) => `/v/${slug}`,
  accountChat: (userId) => `/account/chat/${userId}`,
  vendorChat: (userId) => `/vendor/chat/${userId}`,
  category: (category, subcat) => subcat ? `/c/${category}/${subcat}` : `/c/${category}`,
  deals: (dealType) => `/deals/${dealType}`,
};

// --- Canonical routing helpers (LinkBuilder) ---
// Slugify utility: lowercase, trim, replace spaces/underscores with hyphens, drop invalid chars, collapse hyphens
export const slugify = (s) => {
  return String(s || '')
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

// Alias maps for taxonomy normalization (extend as needed)
const CATEGORY_ALIASES = {
  electronics: 'electronics',
  electronic: 'electronics',
  'consumer-electronics': 'electronics',
  fashion: 'fashion',
  apparel: 'fashion',
  beauty: 'beauty',
  'home-kitchen': 'home',
  home: 'home',
  'sports-outdoors': 'sports',
  sports: 'sports',
};

const SUBCATEGORY_ALIASES = {
  electronics: {
    'mobile-phones': 'mobile-phones',
    phones: 'mobile-phones',
    phone: 'mobile-phones',
    smartphones: 'mobile-phones',
    smartphone: 'mobile-phones',
    laptop: 'laptops',
    laptops: 'laptops',
    notebook: 'laptops',
    notebooks: 'laptops',
    audio: 'audio',
  },
  fashion: {
    men: 'men',
    women: 'women',
    'mens-clothing': 'men',
    'womens-clothing': 'women',
    shoes: 'shoes',
  },
  home: {
    'kitchen-tools': 'kitchen-tools',
    furniture: 'furniture',
    decor: 'decor',
    storage: 'storage',
    bedding: 'bedding',
  },
};

export const normalizeCategorySlug = (category) => {
  const s = slugify(category);
  return CATEGORY_ALIASES[s] || s;
};

export const normalizeSubcategorySlug = (category, subcat) => {
  const c = normalizeCategorySlug(category);
  const s = slugify(subcat);
  const table = SUBCATEGORY_ALIASES[c] || {};
  return table[s] || s;
};

export const LinkBuilder = {
  toPdp: (idOrSlug) => {
    const v = idOrSlug != null && String(idOrSlug).trim() !== '' ? String(idOrSlug) : '';
    if (!v) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[LinkBuilder.toPdp] missing id/slug');
      }
      return null;
    }
    return `/product/${v}`;
  },
  toVendor: (vendorSlug) => {
    const v = slugify(vendorSlug);
    if (!v) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[LinkBuilder.toVendor] missing vendor slug');
      }
      return null;
    }
    return `/v/${v}`;
  },
  toCategory: (category, opts = {}) => {
    const c = normalizeCategorySlug(category);
    if (!c) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[LinkBuilder.toCategory] missing category');
      }
      return null;
    }
    const qp = new URLSearchParams();
    const sort = opts.sort || 'best';
    if (sort) qp.set('sort', sort);
    const qs = qp.toString();
    return `/c/${c}${qs ? `?${qs}` : ''}`;
  },
  toSubcategory: (category, subcat, opts = {}) => {
    const c = normalizeCategorySlug(category);
    const s = normalizeSubcategorySlug(category, subcat);
    if (!c || !s) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[LinkBuilder.toSubcategory] missing category/subcategory');
      }
      return null;
    }
    const qp = new URLSearchParams();
    const sort = opts.sort || 'best';
    if (sort) qp.set('sort', sort);
    const qs = qp.toString();
    return `/c/${c}/${s}${qs ? `?${qs}` : ''}`;
  },
  toDeals: (dealType, q = {}) => {
    const t = slugify(dealType);
    if (!t) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[LinkBuilder.toDeals] missing dealType');
      }
      return null;
    }
    const qp = new URLSearchParams();
    Object.entries(q || {}).forEach(([k, v]) => {
      if (v != null && v !== '') qp.set(k, String(v));
    });
    const qs = qp.toString();
    return `/deals/${t}${qs ? `?${qs}` : ''}`;
  },
  // Alias for spec naming
  toDeal: (dealType, q = {}) => {
    return LinkBuilder.toDeals(dealType, q);
  },
  toSearch: (q) => `/search?q=${encodeURIComponent(String(q || ''))}`,
};

export default ROUTES;
