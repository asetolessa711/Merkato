import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../src/App';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import {
  setupMockAxios,
  mockUser,
  mockUserAuthError,
  resetMockAxios,
  restoreMockAxios,
} from '../__mocks__/mockAxios';

function renderWithRoute(route = '/') {
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  );
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
    expect(screen.getByText(/merkato/i)).toBeInTheDocument();
  });

  test('renders login page on "/login"', () => {
    renderWithRoute('/login');
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  test('renders 404 page on unknown route', () => {
    renderWithRoute('/some/unknown/route');
    expect(screen.getByText(/404/i)).toBeInTheDocument();
  });

  test('renders navigation bar or "Shop" link', () => {
    renderWithRoute('/');
    expect(screen.getByText(/shop/i)).toBeInTheDocument();
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
    expect(await screen.findByText(/dashboard/i)).toBeInTheDocument();
  });

  test('renders vendor dashboard for authenticated vendor', async () => {
    localStorage.setItem('token', 'dummy-token');
    mockUser('vendor');
    renderWithRoute('/vendor');
    expect(await screen.findByText(/vendor/i)).toBeInTheDocument();
  });

  test('renders admin dashboard for authenticated admin', async () => {
    localStorage.setItem('token', 'dummy-token');
    mockUser('admin');
    renderWithRoute('/admin');
    expect(await screen.findByText(/admin/i)).toBeInTheDocument();
  });

  test('redirects or fails to load dashboard for unauthenticated user', async () => {
    mockUserAuthError(); // simulate 401
    renderWithRoute('/account/dashboard');
    expect(await screen.findByText(/login/i)).toBeInTheDocument(); // or error message
  });

    test('logout removes token and redirects to login', async () => {
    localStorage.setItem('token', 'dummy-token');
    mockUser('customer');
    renderWithRoute('/account/dashboard');
    // Adjust selector to match your logout button/link
    const logoutBtn = await screen.findByText(/logout/i);
    fireEvent.click(logoutBtn);
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBeNull();
      expect(screen.getByText(/login/i)).toBeInTheDocument();
    });
  });
}); // 