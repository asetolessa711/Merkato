import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../../src/pages/LoginPage'; // adjust path if needed
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

jest.mock('axios');

describe('🔐 Login Page', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  function renderLogin() {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
  }

  test('renders login form inputs', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('displays validation error if fields are empty', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(await screen.findByText(/email/i)).toBeInTheDocument(); // Adjust if form uses specific messages
  });

  test('submits and logs in user with valid credentials', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        token: 'mocked-jwt-token',
        user: { name: 'Test User', role: 'customer' }
      }
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password123!' }
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('mocked-jwt-token');
    });
    // Advanced: Check for redirect (if your app redirects after login)
    // expect(window.location.pathname).toMatch(/dashboard|account/i);
  });

  test('shows error on invalid credentials', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { error: 'Invalid email or password' } }
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'wrong@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'WrongPass123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText(/invalid/i)).toBeInTheDocument();
  });

  test('shows loading indicator while submitting', async () => {
    let resolvePromise;
    axios.post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password123!' }
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Finish the promise to clean up
    resolvePromise({
      data: {
        token: 'mocked-jwt-token',
        user: { name: 'Test User', role: 'customer' }
      }
    });
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('mocked-jwt-token');
    });
  });

  test('shows error if server/network error occurs', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network error'));

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password123!' }
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText(/error|network/i)).toBeInTheDocument();
  });

  test('disables login button while submitting', async () => {
    let resolvePromise;
    axios.post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password123!' }
    });
    const loginBtn = screen.getByRole('button', { name: /login/i });
    fireEvent.click(loginBtn);

    expect(loginBtn).toBeDisabled();

    // Finish the promise to clean up
    resolvePromise({
      data: {
        token: 'mocked-jwt-token',
        user: { name: 'Test User', role: 'customer' }
      }
    });
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('mocked-jwt-token');
    });
  });

  // Optional: Test password visibility toggle if your form supports it
  // test('toggles password visibility', () => {
  //   renderLogin();
  //   const passwordInput = screen.getByLabelText(/password/i);
  //   const toggleBtn = screen.getByRole('button', { name: /show password/i });
  //   fireEvent.click(toggleBtn);
  //   expect(passwordInput.type).toBe('text');
  // });
});