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

// Wire API base URL for both axios and fetch when running a static build served on a different port
const API_BASE_URL = process.env.REACT_APP_API_URL || '';
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
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);