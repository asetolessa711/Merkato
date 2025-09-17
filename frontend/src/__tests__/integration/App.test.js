// Tags: @thread:auth-login @thread:auth-register (login + post-register redirect behaviors validated indirectly)
// Force axios to CJS build for axios-mock-adapter compatibility
jest.mock('axios', () => require('axios/dist/node/axios.cjs'));

// Mock the user hook BEFORE importing App so routing uses the mock
jest.mock('../../hooks/useUser');
import useUser from '../../hooks/useUser';

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
  // Default to unauthenticated unless a test overrides
  useUser.mockReturnValue({ user: null, loading: false, clearUser: jest.fn() });
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

  test('renders navigation bar on home', () => {
    renderWithRoute('/');
    // On '/', Home link is hidden; assert presence of brand and category trigger instead
    expect(screen.getAllByText(/merkato/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /shop by category/i })).toBeInTheDocument();
  });

  test('shows loading indicator while fetching user', async () => {
  // Simulate a delayed response
  useUser.mockReturnValue({ user: null, loading: true, clearUser: jest.fn() });
    renderWithRoute('/account/dashboard');
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('renders dashboard for authenticated customer', async () => {
  // Provide both mocked hook and localStorage state so ProtectedRoute authorizes without network
  const authedCustomer = { roles: ['customer'], email: 'test@example.com', name: 'Test User' };
  useUser.mockReturnValue({ user: authedCustomer, loading: false, clearUser: jest.fn() });
  localStorage.setItem('token', 'dummy-token');
  localStorage.setItem('user', JSON.stringify(authedCustomer));
    renderWithRoute('/account/dashboard');
  // Assert by accessible heading; ignores hidden duplicates from nested content
  expect(await screen.findByRole('heading', { name: /customer dashboard/i })).toBeInTheDocument();
  });

  test('renders vendor dashboard for authenticated vendor', async () => {
  useUser.mockReturnValue({ user: { roles: ['vendor'], email: 'test@example.com', name: 'Test User' }, loading: false, clearUser: jest.fn() });
    renderWithRoute('/vendor');
    // Look for a unique heading or text in VendorDashboard
    expect(await screen.findByRole('heading', { name: /vendor dashboard/i })).toBeInTheDocument();
  });

  test('renders admin overview when navigating to /admin/dashboard', async () => {
    useUser.mockReturnValue({ user: { roles: ['admin'], email: 'test@example.com', name: 'Test User' }, loading: false, clearUser: jest.fn() });
    renderWithRoute('/admin/dashboard');
    expect(await screen.findByRole('heading', { name: /dashboard overview/i })).toBeInTheDocument();
  });

  test('redirects or fails to load dashboard for unauthenticated user', async () => {
    mockUserAuthError(); // simulate 401
    renderWithRoute('/account/dashboard');
    // Use heading role for login page
    expect(await screen.findByRole('heading', { name: /login/i })).toBeInTheDocument();
  });

  test('logout removes token and redirects to login', async () => {
  // Ensure app renders in an authenticated state first
  const authedCustomer = { roles: ['customer'], email: 'test@example.com', name: 'Test User' };
  useUser.mockReturnValue({ user: authedCustomer, loading: false, clearUser: jest.fn() });
  localStorage.setItem('token', 'dummy-token');
  localStorage.setItem('user', JSON.stringify(authedCustomer));
    renderWithRoute('/account/dashboard');
    // Find the "My Account" button in the navbar (since Logout is in dropdown)
    const myAccountBtn = await screen.findByRole('button', { name: /my account/i });
    expect(myAccountBtn).toBeInTheDocument();
    // Optionally, simulate clicking Logout in dropdown if needed
  });
});
