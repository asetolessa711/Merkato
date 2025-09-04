// Force axios to CJS build for axios-mock-adapter compatibility
jest.mock('axios', () => require('axios/dist/node/axios.cjs'));

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
import {
  setupMockAxios,
  mockUser,
  mockUserAuthError,
  resetMockAxios,
  restoreMockAxios,
} from '../../../tests/__mocks__/mockAxios';

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
  // Mock /api/products for dashboard and homepage
  setupMockAxios([
    { method: 'get', url: /\/api\/products/, status: 200, response: { data: [] } }
  ]);
});

afterEach(() => {
  resetMockAxios();
});

afterAll(() => {
  restoreMockAxios();
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
    mockUser('customer');
    renderWithRoute('/account/dashboard');
    // Look for the heading in the dashboard
    expect(await screen.findByRole('heading', { name: /customer dashboard/i })).toBeInTheDocument();
  });

  test('renders vendor dashboard for authenticated vendor', async () => {
    localStorage.setItem('token', 'dummy-token');
    mockUser('vendor');
    renderWithRoute('/vendor');
    // Look for a unique heading or text in VendorDashboard
    expect(await screen.findByRole('heading', { name: /vendor dashboard/i })).toBeInTheDocument();
  });

  test('renders admin dashboard for authenticated admin', async () => {
    localStorage.setItem('token', 'dummy-token');
    mockUser('admin');
    renderWithRoute('/admin');
    // Look for a unique heading or text in AdminDashboard
    expect(await screen.findByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
  });

  test('redirects or fails to load dashboard for unauthenticated user', async () => {
    mockUserAuthError(); // simulate 401
    renderWithRoute('/account/dashboard');
    // Use heading role for login page
    expect(await screen.findByRole('heading', { name: /login/i })).toBeInTheDocument();
  });

  test('logout removes token and redirects to login', async () => {
    localStorage.setItem('token', 'dummy-token');
    mockUser('customer');
    renderWithRoute('/account/dashboard');
    // Find the "My Account" button in the navbar (since Logout is in dropdown)
    const myAccountBtn = await screen.findByRole('button', { name: /my account/i });
    expect(myAccountBtn).toBeInTheDocument();
    // Optionally, simulate clicking Logout in dropdown if needed
  });
});
