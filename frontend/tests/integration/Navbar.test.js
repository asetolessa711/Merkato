import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '../../src/components/Navbar'; // Adjust if your file structure differs
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock localStorage helper
function mockAuth(role = null) {
  if (role) {
    localStorage.setItem('token', 'mocked-jwt-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Test User', role }));
  } else {
    localStorage.clear();
  }
}

describe('🔗 Navbar Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders navigation links for public user', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /shop/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
    expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument();
  });

  test('renders dashboard link for logged-in customer', () => {
    mockAuth('customer');
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/logout/i)).toBeInTheDocument();
  });

  test('renders vendor dashboard link for vendor user', () => {
    mockAuth('vendor');
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /vendor/i })).toBeInTheDocument();
    expect(screen.getByText(/logout/i)).toBeInTheDocument();
  });

  test('renders admin panel link for admin user', () => {
    mockAuth('admin');
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument(); // Adjust label if needed
    expect(screen.getByText(/logout/i)).toBeInTheDocument();
  });

  test('logout button logs out user and clears user data', () => {
    mockAuth('customer');
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    const logoutBtn = screen.getByText(/logout/i);
    fireEvent.click(logoutBtn);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  test('does not crash if localStorage user is malformed', () => {
    localStorage.setItem('token', 'mocked-token');
    localStorage.setItem('user', '{bad json'); // intentionally broken
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /shop/i })).toBeInTheDocument();
  });

  test('does not render dashboard/vendor/admin links if token is missing', () => {
    localStorage.removeItem('token');
    localStorage.setItem('user', JSON.stringify({ name: 'Test User', role: 'admin' }));
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/vendor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/admin/i)).not.toBeInTheDocument();
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  test('navigation links are accessible', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });

  test('matches snapshot for public user', () => {
    const { asFragment } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });
});