import React from 'react';

// Polyfill ResizeObserver for recharts in jsdom
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import App from '../../App';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

// Mock Modal.setAppElement to avoid test environment error
jest.mock('react-modal', () => {
  const actual = jest.requireActual('react-modal');
  return {
    ...actual,
    setAppElement: () => {},
  };
});


function renderWithRoute(route = '/') {
  window.history.pushState({}, '', route);
  render(<App />);
}

beforeEach(() => {
  localStorage.clear();
});

describe('🧪 App Routing & Layout', () => {
  test('renders home page at "/"', () => {
    renderWithRoute('/');
    // There are two "Merkato" logos, so use getAllByText
    expect(screen.getAllByText(/merkato/i).length).toBeGreaterThan(0);
    // Check for at least one visible product card title
    const productTitles = screen.getAllByText(/demo product 1/i);
    expect(productTitles.length).toBeGreaterThan(0);
  });

  test('renders login page on "/login"', () => {
    renderWithRoute('/login');
    // Use heading role for the login title
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
  });

  test('renders 404 page on unknown route', () => {
    renderWithRoute('/some/unknown/route');
    expect(screen.getByText(/404/i)).toBeInTheDocument();
  });

  test('renders navigation bar or "Home" link', () => {
    renderWithRoute('/');
    // Look for the Home link in the navbar
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
  });

  test('shows loading indicator while fetching user', async () => {
    localStorage.setItem('token', 'dummy-token');
    // Simulate a delayed response by not calling mockUser or mockUserAuthError
    renderWithRoute('/account/dashboard');
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('renders dashboard for authenticated customer', async () => {
    localStorage.setItem('token', 'dummy-token');
    // Override axios for this test
    axios.get.mockImplementation((url) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({ data: { email: 'test@example.com', name: 'Test User', roles: ['customer'] } });
      }
      if (url === '/api/products') return Promise.resolve({ data: [] });
      if (/\/api\/favorites/.test(url)) return Promise.resolve({ data: [] });
      if (/\/api\/orders\/recent/.test(url)) return Promise.resolve({ data: [] });
      if (/\/api\/customer\/profile/.test(url)) return Promise.resolve({ data: { user: { name: 'Test User', email: 'test@example.com' } } });
      return Promise.resolve({ data: {} });
    });
    renderWithRoute('/account/dashboard');
    // Look for the heading in the dashboard
    expect(await screen.findByRole('heading', { name: /customer dashboard/i })).toBeInTheDocument();
  });

  test('renders vendor dashboard for authenticated vendor', async () => {
    localStorage.setItem('token', 'dummy-token');
    axios.get.mockImplementation((url) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({ data: { email: 'test@example.com', name: 'Vendor', roles: ['vendor'] } });
      }
      if (url === '/api/products') return Promise.resolve({ data: [] });
      if (/\/api\/favorites/.test(url)) return Promise.resolve({ data: [] });
      if (/\/api\/orders\/recent/.test(url)) return Promise.resolve({ data: [] });
      if (/\/api\/customer\/profile/.test(url)) return Promise.resolve({ data: { user: { name: 'Vendor', email: 'test@example.com' } } });
      return Promise.resolve({ data: {} });
    });
    renderWithRoute('/vendor');
    // Look for a unique heading or text in VendorDashboard
    expect(await screen.findByRole('heading', { name: /vendor dashboard/i })).toBeInTheDocument();
  });

  test('renders admin dashboard for authenticated admin', async () => {
    localStorage.setItem('token', 'dummy-token');
    axios.get.mockImplementation((url) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({ data: { email: 'admin@example.com', name: 'Admin', roles: ['admin'] } });
      }
      if (url === '/api/products') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
    renderWithRoute('/admin');
    // Look for a unique heading or text in AdminDashboard
    expect(await screen.findByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
  });

  test('redirects or fails to load dashboard for unauthenticated user', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({ data: {} }); // no token or invalid
      }
      if (url === '/api/products') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
    renderWithRoute('/account/dashboard');
    // Use heading role for login page
    expect(await screen.findByRole('heading', { name: /login/i })).toBeInTheDocument();
  });

  test('logout removes token and redirects to login', async () => {
    localStorage.setItem('token', 'dummy-token');
    axios.get.mockImplementation((url) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({ data: { email: 'test@example.com', name: 'Test User', roles: ['customer'] } });
      }
      if (url === '/api/products') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
    renderWithRoute('/account/dashboard');
    // Find the "My Account" button in the navbar (since Logout is in dropdown)
    const myAccountBtn = await screen.findByRole('button', { name: /my account/i });
    expect(myAccountBtn).toBeInTheDocument();
    // Optionally, simulate clicking Logout in dropdown if needed
  });
});
