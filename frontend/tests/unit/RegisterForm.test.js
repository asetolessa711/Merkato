import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from '../../src/pages/RegisterPage'; // Adjust as needed
import '@testing-library/jest-dom';
import axios from 'axios';

jest.mock('axios');

describe('📝 Register Form Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows required field errors', async () => {
    render(<RegisterPage />);
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findAllByText(/required/i)).not.toHaveLength(0);
  });

  test('validates email format', async () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'invalidemail' }
    });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
  });

  test('validates password strength (if applied)', async () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: '123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findByText(/password must/i)).toBeInTheDocument(); // adjust per app rules
  });

  test('validates password confirmation mismatch', async () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password123!' }
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'Password321!' }
    });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  test('shows error if email already exists', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { error: 'Email already exists' } }
    });
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'existing@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password123!' }
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'Password123!' }
    });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findByText(/email already exists/i)).toBeInTheDocument();
  });

  test('registers successfully with valid data', async () => {
    axios.post.mockResolvedValueOnce({ data: { message: 'Registration successful' } });
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'newuser@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password123!' }
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'Password123!' }
    });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findByText(/registration successful/i)).toBeInTheDocument();
    // Optionally, check for redirect or clear form
  });

  test('matches snapshot', () => {
    const { asFragment } = render(<RegisterPage />);
    expect(asFragment()).toMatchSnapshot();
  });
});