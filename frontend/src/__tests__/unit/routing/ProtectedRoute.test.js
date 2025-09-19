import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import useUser from '../../../hooks/useUser';

jest.mock('../../../hooks/useUser', () => ({ __esModule: true, default: jest.fn() }));

function App({ element, initialEntries = ['/'] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={element} />
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/admin" element={<div>Admin</div>} />
        <Route path="/admin/dashboard" element={<div>Admin</div>} />
        <Route path="/account" element={<div>Account</div>} />
        <Route path="/account/dashboard" element={<div>Account</div>} />
        <Route path="/vendor" element={<div>Vendor</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    useUser.mockReset();
  });

  afterEach(() => {
    console.warn.mockRestore?.();
    console.error.mockRestore?.();
  });

  test('no token -> redirects to login', async () => {
    useUser.mockReturnValue({ user: null, loading: false });
    render(
      <App
        element={(
          <ProtectedRoute>
            <div>Secret</div>
          </ProtectedRoute>
        )}
      />
    );
    expect(await screen.findByText('Login')).toBeInTheDocument();
  });

  test('wrong role -> redirects to account/vendor/admin fallback', async () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', JSON.stringify({ roles: ['customer'] }));
    useUser.mockReturnValue({ user: { roles: ['customer'] }, loading: false });
    render(
      <App
        element={(
          <ProtectedRoute requiredRole="admin">
            <div>AdminOnly</div>
          </ProtectedRoute>
        )}
      />
    );
    // Will choose fallback by roles; with customer role, expect Account
    expect(await screen.findByText('Account')).toBeInTheDocument();
  });

  test('correct role -> renders children', async () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', JSON.stringify({ roles: ['admin'] }));
    useUser.mockReturnValue({ user: { roles: ['admin'] }, loading: false });
    render(
      <App
        element={(
          <ProtectedRoute requiredRole="admin">
            <div>AdminOK</div>
          </ProtectedRoute>
        )}
      />
    );
    // direct element rendered
    expect(await screen.findByText('AdminOK')).toBeInTheDocument();
  });
});
