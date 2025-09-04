import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../../pages/LoginPage';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

// Manual mock for axios using CJS build to avoid ESM import error
jest.mock('axios', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const actualAxios = require('axios/dist/node/axios.cjs');
  return {
    ...actualAxios,
    post: jest.fn(),
    create: () => actualAxios,
  };
});

jest.mock('axios');

describe('\ud83d\udd10 Login Page', () => {
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
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('shows error on empty submission', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    // The UI shows 'Please enter your email address.' for empty email
    expect(await screen.findByText(/please enter your email address/i)).toBeInTheDocument();
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

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' }
    });
    // ...rest of the test code...
  });
});
