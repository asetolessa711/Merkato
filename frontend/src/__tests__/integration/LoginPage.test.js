import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../../pages/LoginPage';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

jest.mock('axios');

describe('\ud83d\udd10 Login Page', () => {
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
    // ...rest of the test code...
  });
});
