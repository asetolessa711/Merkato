import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../../src/components/ProtectedRoute'; // Adjust path
import '@testing-library/jest-dom';

const DummyProtectedPage = () => <h1>Protected Page</h1>;
const LoginPage = () => <h1>Login</h1>;

describe('🔒 ProtectedRoute', () => {
  afterEach(() => {
    localStorage.clear();
  });

  test('redirects to login if not authenticated', () => {
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

  // Optional: If you support role-based access
  // test('denies access for insufficient role', () => {
  //   localStorage.setItem('token', 'mocked-jwt-token');
  //   localStorage.setItem('user', JSON.stringify({ role: 'customer' }));
  //   render(
  //     <MemoryRouter initialEntries={['/admin']}>
  //       <Routes>
  //         <Route path="/login" element={<LoginPage />} />
  //         <Route path="/admin" element={
  //           <ProtectedRoute allowedRoles={['admin']}>
  //             <DummyProtectedPage />
  //           </ProtectedRoute>
  //         } />
  //       </Routes>
  //     </MemoryRouter>
  //   );
  //   expect(screen.getByText(/login/i)).toBeInTheDocument();
  // });

  test('matches snapshot for protected content', () => {
    localStorage.setItem('token', 'mocked-jwt-token');
    const { asFragment } = render(
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
    expect(asFragment()).toMatchSnapshot();
  });
});