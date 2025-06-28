import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../../src/pages/LoginPage'; // Adjust if needed
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

jest.mock('axios');

describe('🔐 Login Page', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('renders login form', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('shows error on empty submission', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument(); // adjust based on validation
  });

  test('logs in with valid credentials', async () => {
    axios.post.mockResolvedValueOnce({
      data: { token: 'mocked-token', user: { role: 'customer' } }
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password123!' }
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('mocked-token');
    });
    // Optionally, check for redirect:
    // expect(window.location.pathname).toMatch(/dashboard|account/i);
  });

  test('shows error on invalid credentials', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { error: 'Invalid email or password' } }
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'wrong@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'WrongPass123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  test('shows loading indicator while submitting', async () => {
    let resolvePromise;
    axios.post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
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
      data: { token: 'mocked-token', user: { role: 'customer' } }
    });
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('mocked-token');
    });
  });

  test('disables login button while submitting', async () => {
    let resolvePromise;
    axios.post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
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
      data: { token: 'mocked-token', user: { role: 'customer' } }
    });
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('mocked-token');
    });
  });

  test('matches snapshot', () => {
    const { asFragment } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });
});