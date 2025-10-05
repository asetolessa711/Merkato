import axios from 'axios';
import { ENV } from '../config/env'';

// Configure global axios base URL if provided; tests often mock axios directly.
try {
  if (ENV && ENV.API_BASE_URL) {
    axios.defaults.baseURL = ENV.API_BASE_URL;
  }
} catch {}

// Use the default axios export as our client to play nicely with jest mocks
const client = axios;

// Request: attach Authorization if token exists
// In some tests axios may be mocked without interceptors; guard accordingly
if (client && client.interceptors && client.interceptors.request && typeof client.interceptors.request.use === 'function') {
  client.interceptors.request.use((config) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('merkato-token');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
    return config;
  });
}

// Response: surface a standard error shape
if (client && client.interceptors && client.interceptors.response && typeof client.interceptors.response.use === 'function') {
  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const message = err?.response?.data?.message || err.message || 'Request failed';
      return Promise.reject({ ...err, message });
    }
  );
}

// For compatibility, export the axios instance itself
export const apiClient = client;
export default client;
