// File: index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // Import global styles
import "./styles/tokens.css"; // Design tokens
import axios from "axios";
import { fetchActiveTheme, fetchThemes } from './api/theme';

// ✅ Import Google Fonts (Poppins) if not already in index.html
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap";
document.head.appendChild(fontLink);

const root = ReactDOM.createRoot(document.getElementById("root"));

// In E2E runs, hide any dev-server overlays that could block interactions
try {
  if (typeof window !== 'undefined' && window.Cypress) {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(`
      iframe#webpack-dev-server-client-overlay,
      #webpack-dev-server-client-overlay,
      .webpack-dev-server-client-overlay {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }
    `));
    document.head.appendChild(style);
  }
} catch (_) {}

// Wire API base URL for axios and (optionally) fetch
// Priority order:
// 1) Cypress env (CYPRESS_API_URL) when running e2e (available as Cypress.env('API_URL'))
// 2) REACT_APP_API_URL at build time (static builds served elsewhere)
// 3) Window origin (dev server) as a safe default
let API_BASE_URL = "";
try {
  const cyApi =
    typeof window !== "undefined" &&
    window.Cypress &&
    typeof window.Cypress.env === "function"
      ? window.Cypress.env("API_URL") || window.Cypress.env("apiUrl") || ""
      : "";
  API_BASE_URL = cyApi || process.env.REACT_APP_API_URL || "";
} catch (_) {
  API_BASE_URL = process.env.REACT_APP_API_URL || "";
}
if (API_BASE_URL) {
  // Route all axios relative calls like axios.get('/api/..') to the backend
  axios.defaults.baseURL = API_BASE_URL;
  // Patch fetch to rewrite "/api/*" to the backend absolute URL
  const origFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      if (typeof input === "string" && input.startsWith("/api")) {
        return origFetch(`${API_BASE_URL}${input}`, init);
      }
      if (
        input &&
        typeof input === "object" &&
        "url" in input &&
        typeof input.url === "string" &&
        input.url.startsWith("/api")
      ) {
        const req = new Request(`${API_BASE_URL}${input.url}`, input);
        return origFetch(req, init);
      }
    } catch (_) {
      // fall through to original fetch on any error
    }
    return origFetch(input, init);
  };
} else {
  try {
    const loc = window.location || {};
    const origin =
      loc.origin && loc.origin !== "null"
        ? loc.origin
        : typeof loc.href === "string" && /^https?:\/\//.test(loc.href)
          ? new URL(loc.href).origin
          : "";
    if (origin) {
      // Ensure axios composes absolute URLs (origin + "/api/..") in dev
      axios.defaults.baseURL = origin;
    }
  } catch (_) {
    // ignore; axios will use relative URLs and CRA proxy should handle /api
  }
}

// As an extra guard in Cypress/Electron contexts, coerce relative API URLs to absolute
// to avoid environments where axios cannot infer a valid base.
axios.interceptors.request.use((config) => {
  try {
    const url = config && config.url;
    if (typeof url === "string" && url.startsWith("/api")) {
      const origin =
        (API_BASE_URL && API_BASE_URL.trim()) ||
        (window.location &&
          (window.location.origin || new URL(window.location.href).origin)) ||
        "";
      if (origin) {
        config.url = `${origin}${url}`;
        // Clear baseURL to prevent double-prefixing
        config.baseURL = undefined;
      }
    }
  } catch (_) {
    /* no-op */
  }
  return config;
});

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Apply active theme on load and keep in sync
(async function initTheme() {
  function applyThemeVars(theme) {
    try {
      if (!theme || !theme.colors) return;
      const c = theme.colors;
      const root = document.documentElement;
      const mappings = {
        '--color-primary': c.primary,
        '--color-primary-600': c.primary600 || c.primary,
        '--color-primary-700': c.primary700 || c.primary,
        '--color-bg': c.bg,
        '--color-surface': c.surface || c.bg,
        '--color-text': c.text,
        '--color-text-muted': c.textMuted || c.text,
        '--color-nav': c.nav || '#2C2E43',
        '--color-footer': c.footer || c.nav || '#2C2E43',
        '--color-accent-red': c.accentRed || '#FF6B6B',
        '--color-success': c.success || '#A0E7E5',
        '--color-warning': c.warning || '#F4C430',
        '--color-danger': c.danger || c.accentRed || '#FF6B6B',
        '--color-info': c.info || c.primary,
      };
      Object.entries(mappings).forEach(([k, v]) => {
        if (v) root.style.setProperty(k, v);
      });
  // Zones -> CSS variables
  const z = theme.zones || {};
  const set = (k, v) => { if (v != null && v !== '') root.style.setProperty(k, String(v)); };
  // Header
  set('--header-bg', z.header?.bg || c.nav);
  set('--header-link', z.header?.link || '#ffffff');
  set('--header-hover', z.header?.hover || c.primary);
  set('--header-dropdown-bg', z.header?.dropdownBg || '#1f2236');
  // Footer
  set('--footer-bg', z.footer?.bg || c.footer || c.nav);
  set('--footer-text', z.footer?.text || '#ffffff');
  set('--footer-link', z.footer?.link || '#ffffff');
  set('--footer-link-hover', z.footer?.linkHover || c.primary || '#6C63FF');
  // Hero
  set('--hero-bg', z.hero?.bg || c.surface || c.bg);
  set('--hero-overlay', z.hero?.overlay || '');
  set('--hero-cta-bg', z.hero?.ctaBg || c.primary);
  set('--hero-cta-text', z.hero?.ctaText || '#ffffff');
  // Cards
  set('--card-radius', z.cards?.radius || '12px');
  set('--card-shadow', z.cards?.shadow || 'var(--shadow-sm)');
  set('--card-bg', z.cards?.bg || c.surface || '#ffffff');
  set('--card-badge-bg', z.cards?.badge || c.warning || '#F4C430');
  document.body.dataset.cardHoverAnim = z.cards?.hoverAnim ? 'on' : 'off';
  // Buttons
  set('--btn-primary-bg', z.buttons?.primary || c.primary);
  set('--btn-primary-hover', z.buttons?.primaryHover || c.primary700 || c.primary);
  set('--btn-secondary-bg', z.buttons?.secondary || c.accentRed || '#FF6B6B');
  set('--btn-secondary-hover', z.buttons?.secondaryHover || '#dc2626');
  // Typography
  set('--font-body', z.typography?.body || 'Poppins, sans-serif');
  set('--font-heading', z.typography?.heading || 'Poppins, sans-serif');
  set('--heading-weight', z.typography?.headingWeight || 600);
  set('--paragraph-spacing', z.typography?.paragraphSpacing || '0.5rem');
  // Backgrounds
  set('--page-bg', z.backgrounds?.page || c.bg);
  set('--section-divider', z.backgrounds?.sectionDivider || '#e5e7eb');
  set('--modal-overlay', z.backgrounds?.modalOverlay || 'rgba(0,0,0,0.5)');
  // Alerts & Banners
  set('--alert-bg', z.alerts?.alertBg || c.accentRed || '#F43F5E');
  set('--promo-bg', z.alerts?.promoBg || c.warning || '#F4C430');
  set('--urgency-color', z.alerts?.urgency || '#dc2626');
  // Forms & Inputs
  set('--input-border', z.forms?.border || '#d1d5db');
  set('--input-focus', z.forms?.focus || c.primary || '#6C63FF');
  set('--input-placeholder', z.forms?.placeholder || '#9ca3af');
  set('--input-error', z.forms?.error || c.danger || '#EF4444');
  // Dashboard
  set('--dashboard-sidebar-bg', z.dashboard?.sidebarBg || '#0f172a');
  set('--dashboard-tab-active-bg', z.dashboard?.tabActiveBg || c.primary || '#6C63FF');
      // Optional: animations flag could toggle a global class
      document.body.dataset.animations = theme.animations ? 'on' : 'off';
    } catch (_) {}
  }

  async function loadAndApplyFromApi() {
    try {
      const data = await fetchActiveTheme();
      let activeTheme = data && data.theme;
      // Optionally fetch all themes list for user selector and overrides
      const all = await fetchThemes().catch(() => []);
      try { localStorage.setItem('merkato-all-themes', JSON.stringify(all)); } catch {}
      // If personalization is enabled and user override exists, apply that theme
      try {
        if (data && data.personalizationEnabled) {
          const userKey = localStorage.getItem('merkato-user-theme-key');
          if (userKey) {
            const found = (Array.isArray(all) ? all : []).find(t => t.key === userKey);
            if (found) activeTheme = found;
          }
        }
      } catch (_) {}
      if (activeTheme) {
        applyThemeVars(activeTheme);
        localStorage.setItem('merkato-active-theme', JSON.stringify({ ...data, theme: activeTheme }));
      }
    } catch (_) {
      // Fallback to cached theme in localStorage
      try {
        const cached = JSON.parse(localStorage.getItem('merkato-active-theme') || 'null');
        if (cached && cached.theme) applyThemeVars(cached.theme);
      } catch (_) {}
    }
  }

  // Initial load
  loadAndApplyFromApi();

  // Listen to custom event from admin page
  window.addEventListener('theme:updated', () => {
    // Prefer pulling fresh state from storage first, then refetch API in background
    try {
      const cached = JSON.parse(localStorage.getItem('merkato-active-theme') || 'null');
      if (cached && cached.theme) applyThemeVars(cached.theme);
    } catch (_) {}
    loadAndApplyFromApi();
  });

  // Cross-tab storage sync
  window.addEventListener('storage', (e) => {
    if (e.key === 'merkato-active-theme') {
      try {
        const val = e.newValue && JSON.parse(e.newValue);
        if (val && val.theme) applyThemeVars(val.theme);
      } catch (_) {}
    }
    if (e.key === 'merkato-user-theme-key') {
      // Re-apply with user override when personalization is enabled
      loadAndApplyFromApi();
    }
  });
})();

