
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutPage from '../../src/pages/CheckoutPage';
import { MemoryRouter } from 'react-router-dom';
import { MessageProvider } from '../../src/context/MessageContext';
import '@testing-library/jest-dom';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock axios
jest.mock('axios');
const axios = require('axios');

const mockCart = [
  { _id: '1', name: 'Item A', price: 20, quantity: 2 },
  { _id: '2', name: 'Item B', price: 10, quantity: 1 },
];

describe('💳 CheckoutPage', () => {

  beforeEach(() => {
    localStorage.setItem('merkato-cart', JSON.stringify(mockCart));
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  function setup() {
    return render(
      <MemoryRouter>
        <MessageProvider>
          <CheckoutPage />
        </MessageProvider>
      </MemoryRouter>
    );
  }

  test('renders cart items and total', () => {
    setup();
    expect(screen.getByText(/item a/i)).toBeInTheDocument();
    expect(screen.getByText(/item b/i)).toBeInTheDocument();
    // Match total with optional whitespace and $ sign
    expect(screen.getByText((content) => /\$?\s*50/.test(content))).toBeInTheDocument();
    // Match price and quantity robustly (allow whitespace, $)
    expect(screen.getByText((content) => /\b2\b/.test(content))).toBeInTheDocument(); // Quantity for Item A
    expect(screen.getByText((content) => /\$?\s*20/.test(content))).toBeInTheDocument(); // Price for Item A
    expect(screen.getByText((content) => /\b1\b/.test(content))).toBeInTheDocument(); // Quantity for Item B
    expect(screen.getByText((content) => /\$?\s*10/.test(content))).toBeInTheDocument(); // Price for Item B
  });

  test('renders empty message if cart is empty', () => {
    localStorage.setItem('merkato-cart', JSON.stringify([]));
    setup();
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  test('handles corrupted cart data gracefully', () => {
    localStorage.setItem('merkato-cart', '{bad json');
    setup();
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  test('shows loading state while checking user', () => {
    // Simulate slow user check by not resolving axios.get
    axios.get.mockImplementation(() => new Promise(() => {}));
    setup();
    expect(screen.getByText(/loading checkout/i)).toBeInTheDocument();
  });

  test('guest checkout success shows global message and clears cart', async () => {
    axios.post.mockResolvedValue({ data: { orderId: '123' } });
    setup();
    // Fill guest form (use placeholder as fallback if label fails)
    fireEvent.change(screen.getByPlaceholderText(/full name/i), { target: { value: 'Guest User' } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'guest@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/phone/i), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByPlaceholderText(/shipping address/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByPlaceholderText(/country/i), { target: { value: 'Ethiopia' } });
    fireEvent.click(screen.getByRole('button', { name: /place order as guest/i }));
    expect(await screen.findByText(/order placed successfully/i)).toBeInTheDocument();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/order-confirmation', expect.anything()));
    expect(localStorage.getItem('merkato-cart')).toBeNull();
  });

  test('guest checkout backend error shows global error message', async () => {
    axios.post.mockRejectedValue({ response: { data: { message: 'Backend error' } } });
    setup();
    fireEvent.change(screen.getByPlaceholderText(/full name/i), { target: { value: 'Guest User' } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'guest@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/phone/i), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByPlaceholderText(/shipping address/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByPlaceholderText(/country/i), { target: { value: 'Ethiopia' } });
    fireEvent.click(screen.getByRole('button', { name: /place order as guest/i }));
    expect(await screen.findByText(/backend error/i)).toBeInTheDocument();
  });

  test('guest checkout disables button during loading', async () => {
    let resolvePost;
    axios.post.mockImplementation(() => new Promise((resolve) => { resolvePost = resolve; }));
    setup();
    fireEvent.change(screen.getByPlaceholderText(/full name/i), { target: { value: 'Guest User' } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'guest@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/phone/i), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByPlaceholderText(/shipping address/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByPlaceholderText(/country/i), { target: { value: 'Ethiopia' } });
    fireEvent.click(screen.getByRole('button', { name: /place order as guest/i }));
    expect(screen.getByRole('button', { name: /\.{3}/i })).toBeDisabled();
    resolvePost({ data: { orderId: '123' } });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });

  test('registered user checkout success shows global message and clears cart', async () => {
    // Simulate user in localStorage
    localStorage.setItem('token', 'abc');
    axios.get.mockResolvedValue({ data: { user: { name: 'Test User', email: 'test@example.com' } } });
    axios.post.mockResolvedValue({ data: { orderId: '123' } });
    setup();
    await waitFor(() => expect(screen.getByText(/logged in as/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /place order as registered user/i }));
    expect(await screen.findByText(/order placed successfully/i)).toBeInTheDocument();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/order-confirmation', expect.anything()));
    expect(localStorage.getItem('merkato-cart')).toBeNull();
  });

  test('registered user checkout backend error shows global error message', async () => {
    localStorage.setItem('token', 'abc');
    axios.get.mockResolvedValue({ data: { user: { name: 'Test User', email: 'test@example.com' } } });
    axios.post.mockRejectedValue({ response: { data: { message: 'Order failed for user' } } });
    setup();
    await waitFor(() => expect(screen.getByText(/logged in as/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /place order as registered user/i }));
    expect(await screen.findByText(/order failed for user/i)).toBeInTheDocument();
  });

  test('registered user checkout disables button during loading', async () => {
    localStorage.setItem('token', 'abc');
    axios.get.mockResolvedValue({ data: { user: { name: 'Test User', email: 'test@example.com' } } });
    let resolvePost;
    axios.post.mockImplementation(() => new Promise((resolve) => { resolvePost = resolve; }));
    setup();
    await waitFor(() => expect(screen.getByText(/logged in as/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /place order as registered user/i }));
    expect(screen.getByRole('button', { name: /placing order/i })).toBeDisabled();
    resolvePost({ data: { orderId: '123' } });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });

  test('guest checkout shows field errors for missing values', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /place order as guest/i }));
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/valid email required|valid email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/phone is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/shipping address is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/country is required/i)).toBeInTheDocument();
  });

  // Optional: If you have a "Clear Cart" or "Remove" button
  // test('removes item from cart', () => {
  //   render(
  //     <MemoryRouter>
  //       <CheckoutPage />
  //     </MemoryRouter>
  //   );
  //   const removeBtn = screen.getAllByRole('button', { name: /remove/i })[0];
  //   fireEvent.click(removeBtn);
  //   expect(screen.queryByText(/item a/i)).not.toBeInTheDocument();
  // });

  test('matches snapshot', () => {
    const { asFragment } = setup();
    expect(asFragment()).toMatchSnapshot();
  });
});