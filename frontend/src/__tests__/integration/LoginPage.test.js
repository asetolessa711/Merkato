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
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('displays validation error if fields are empty', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
  });

  test('submits and logs in user with valid credentials', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        token: 'mocked-jwt-token',
        user: { name: 'Test User', role: 'customer' }
      }
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Password123!' }
    });
    // ...rest of the test code...
  });
});
