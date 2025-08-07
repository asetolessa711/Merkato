import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock useNavigate for vendor redirect test
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});
import RegisterPage from '../RegisterPage';
import { MessageProvider } from '../../context/MessageContext';

// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('RegisterPage (customer)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  function setup() {
    return render(
      <MemoryRouter>
        <MessageProvider>
          <RegisterPage />
        </MessageProvider>
      </MemoryRouter>
    );
  }

  it('shows error message for missing fields', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    // Use getAllByText for duplicate error messages
    expect((await screen.findAllByText(/valid email required/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/password must be at least 6/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/country is required/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/please select a role/i)).length).toBeGreaterThan(0);
  });

  it('shows global error message if registration fails', async () => {
    axios.post.mockRejectedValue({ response: { status: 500 } });
    setup();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: 'Ethiopia' } });
    fireEvent.change(screen.getByLabelText(/register as/i), { target: { value: 'customer' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findByTestId('global-message')).toHaveTextContent(/registration failed/i);
  });

  it('shows global duplicate message if email exists', async () => {
    axios.post.mockRejectedValue({ response: { status: 409 } });
    setup();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: 'Ethiopia' } });
    fireEvent.change(screen.getByLabelText(/register as/i), { target: { value: 'customer' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findByTestId('global-message')).toHaveTextContent(/email already exists/i);
  });

  it('navigates on successful registration', async () => {
    axios.post.mockResolvedValue({ data: { token: 'abc', user: { name: 'Test', email: 'test@example.com', roles: ['customer'] } } });
    const { container } = setup();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: 'Ethiopia' } });
    fireEvent.change(screen.getByLabelText(/register as/i), { target: { value: 'customer' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => {
      expect(container).toHaveTextContent(/you're already registered/i);
    });
  });


  // No global success message is shown after registration, user is redirected to profile page.


  // Field reset after registration is not applicable, user is redirected to profile page.

  it('shows loading state during registration', async () => {
    jest.useFakeTimers();
    axios.post.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { token: 'abc', user: {} } }), 1000)));
    setup();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: 'Ethiopia' } });
    fireEvent.change(screen.getByLabelText(/register as/i), { target: { value: 'customer' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    // Assert loading spinner or disabled button
    expect(screen.getByRole('button', { name: /\.\.\./i })).toBeDisabled();
    jest.runAllTimers();
    jest.useRealTimers();
  });

  it('shows field-specific error from backend', async () => {
    axios.post.mockRejectedValue({ response: { status: 400, data: { errors: { email: 'Invalid email address.' } } } });
    setup();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
    // Use a valid email so frontend validation passes and backend error is shown
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: 'Ethiopia' } });
    fireEvent.change(screen.getByLabelText(/register as/i), { target: { value: 'customer' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findByTestId('email-error')).toHaveTextContent(/invalid email address/i);
  });

  it('global message has role alert for accessibility', async () => {
    axios.post.mockRejectedValue({ response: { status: 500 } });
    setup();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: 'Ethiopia' } });
    fireEvent.change(screen.getByLabelText(/register as/i), { target: { value: 'customer' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    const msg = await screen.findByTestId('global-message');
    expect(msg).toHaveAttribute('role', 'alert');
  });

  it('shows errors for whitespace-only values', async () => {
    setup();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/valid email required/i)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/password must be at least 6/i)).toBeInTheDocument();
    expect(await screen.findByText(/country is required/i)).toBeInTheDocument();
  });

  it('prevents double submit (only one request sent)', async () => {
    const postSpy = jest.spyOn(axios, 'post').mockResolvedValue({ data: { token: 'abc', user: { name: 'Test', email: 'test@example.com', roles: ['customer'] } } });
    setup();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: 'Ethiopia' } });
    fireEvent.change(screen.getByLabelText(/register as/i), { target: { value: 'customer' } });
    const button = screen.getByRole('button', { name: /register/i });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledTimes(1);
    });
  });
  it('shows multiple field-specific errors from backend', async () => {
    axios.post.mockRejectedValue({ response: { status: 400, data: { errors: { email: 'Invalid email address.', password: 'Weak password.' } } } });
    setup();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: 'Ethiopia' } });
    fireEvent.change(screen.getByLabelText(/register as/i), { target: { value: 'customer' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findByTestId('email-error')).toHaveTextContent(/invalid email address/i);
    expect(await screen.findByText(/weak password/i)).toBeInTheDocument();
  });

  it('prevents duplicate backend requests on rapid submit', async () => {
    const postSpy = jest.spyOn(axios, 'post').mockResolvedValue({ data: { token: 'abc', user: { name: 'Test', email: 'test@example.com', roles: ['customer'] } } });
    setup();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: 'Ethiopia' } });
    fireEvent.change(screen.getByLabelText(/register as/i), { target: { value: 'customer' } });
    const button = screen.getByRole('button', { name: /register/i });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('disables all inputs and button during loading', async () => {
    jest.useFakeTimers();
    axios.post.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { token: 'abc', user: {} } }), 1000)));
    setup();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: 'Ethiopia' } });
    fireEvent.change(screen.getByLabelText(/register as/i), { target: { value: 'customer' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(screen.getByLabelText(/full name/i)).toBeDisabled();
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText('Password', { selector: 'input' })).toBeDisabled();
    expect(screen.getByLabelText(/country/i)).toBeDisabled();
    expect(screen.getByLabelText(/register as/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /\.{3}/i })).toBeDisabled();
    jest.runAllTimers();
    jest.useRealTimers();
  });

  it('toggles password visibility', async () => {
    setup();
    const passwordInput = screen.getByLabelText('Password', { selector: 'input' });
    const toggleBtn = screen.getByLabelText(/toggle password visibility/i);
    // Initially type is password
    expect(passwordInput.type).toBe('password');
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('text');
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('password');
  });

  it('redirects to vendor registration when vendor is selected', async () => {
    mockNavigate.mockClear();
    setup();
    fireEvent.change(screen.getByLabelText(/register as/i), { target: { value: 'vendor' } });
    expect(mockNavigate).toHaveBeenCalledWith('/vendor-register');
  });
});
