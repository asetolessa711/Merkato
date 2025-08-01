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
  setupMockAxios();
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
    // Optionally, check for tagline or a unique element
    expect(screen.getByText(/trusted marketplace for all/i)).toBeInTheDocument();
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

  test('renders navigation bar or "Shop" link', () => {
    renderWithRoute('/');
    // Use button role for the Shop dropdown
    expect(screen.getByRole('button', { name: /shop/i })).toBeInTheDocument();
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
    // Find the logout button by role and emoji (matches AdminLayout and others)
    const logoutBtn = await screen.findByRole('button', { name: /logout|🚪/i });
    fireEvent.click(logoutBtn);
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBeNull();
      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    });
  });
});
