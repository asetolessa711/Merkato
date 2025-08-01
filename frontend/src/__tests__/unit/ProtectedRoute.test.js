import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';
jest.mock('../../hooks/useUser');
import useUser from '../../hooks/useUser';
import '@testing-library/jest-dom';

const DummyProtectedPage = () => <h1>Protected Page</h1>;
const LoginPage = () => <h1>Login</h1>;

describe('\ud83d\udd12 ProtectedRoute', () => {
  afterEach(() => {
    localStorage.clear();
  });

  test('redirects to login if not authenticated', () => {
    useUser.mockReturnValue({ user: null, loading: false });
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/protected" element={
            <ProtectedRoute>
              <DummyProtectedPage />
            </ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  test('renders protected content if token is present', () => {
    useUser.mockReturnValue({ user: { roles: ['user'], email: 'test@example.com' }, loading: false });
    localStorage.setItem('token', 'mocked-jwt-token');
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={
            <ProtectedRoute>
              <DummyProtectedPage />
            </ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /protected page/i })).toBeInTheDocument();
  });

  test('redirects to login if token is malformed', () => {
    useUser.mockReturnValue({ user: null, loading: false });
    localStorage.setItem('token', '{bad-token');
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/protected" element={
            <ProtectedRoute>
              <DummyProtectedPage />
            </ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });
});
