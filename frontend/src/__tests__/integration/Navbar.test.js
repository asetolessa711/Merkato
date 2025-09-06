import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '../../components/Navbar';
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

describe('\ud83d\udd17 Navbar Component', () => {
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
    // ...rest of the test code...
  });
});
