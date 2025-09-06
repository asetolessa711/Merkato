// File: index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Import global styles
import axios from 'axios';

// ✅ Import Google Fonts (Poppins) if not already in index.html
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap';
document.head.appendChild(fontLink);

const root = ReactDOM.createRoot(document.getElementById('root'));

// Wire API base URL for axios and (optionally) fetch
// Priority order:
// 1) Cypress env (CYPRESS_API_URL) when running e2e (available as Cypress.env('API_URL'))
// 2) REACT_APP_API_URL at build time (static builds served elsewhere)
// 3) Window origin (dev server) as a safe default
let API_BASE_URL = '';
try {
  const cyApi = (typeof window !== 'undefined' && window.Cypress && typeof window.Cypress.env === 'function')
    ? (window.Cypress.env('API_URL') || window.Cypress.env('apiUrl') || '')
    : '';
  API_BASE_URL = cyApi || process.env.REACT_APP_API_URL || '';
} catch (_) {
  API_BASE_URL = process.env.REACT_APP_API_URL || '';
}
if (API_BASE_URL) {
  // Route all axios relative calls like axios.get('/api/..') to the backend
  axios.defaults.baseURL = API_BASE_URL;
  // Patch fetch to rewrite "/api/*" to the backend absolute URL
  const origFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      if (typeof input === 'string' && input.startsWith('/api')) {
        return origFetch(`${API_BASE_URL}${input}`, init);
      }
      if (input && typeof input === 'object' && 'url' in input && typeof input.url === 'string' && input.url.startsWith('/api')) {
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
    const origin = (loc.origin && loc.origin !== 'null')
      ? loc.origin
      : (typeof loc.href === 'string' && /^https?:\/\//.test(loc.href) ? new URL(loc.href).origin : '');
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
    if (typeof url === 'string' && url.startsWith('/api')) {
      const origin = (API_BASE_URL && API_BASE_URL.trim()) || (window.location && (window.location.origin || (new URL(window.location.href)).origin)) || '';
      if (origin) {
        config.url = `${origin}${url}`;
        // Clear baseURL to prevent double-prefixing
        config.baseURL = undefined;
      }
    }
  } catch (_) { /* no-op */ }
  return config;
});

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);