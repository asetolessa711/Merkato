// Hoist all mocks to the very top
const mockRedirectToCheckout = jest.fn(() => Promise.resolve({}));
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => ({
    redirectToCheckout: mockRedirectToCheckout
  }))
}));
jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(() => mockAxios),
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
  };
  mockAxios.default = mockAxios;
  return mockAxios;
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StripeCheckoutButton from '../../components/StripeCheckoutButton';
import '@testing-library/jest-dom';
import axios from 'axios';

describe('\ud83d\udcb3 StripeCheckoutButton', () => {
  const mockItems = [{ productId: '123', quantity: 1 }];

  beforeEach(() => {
    axios.post.mockClear();
    mockRedirectToCheckout.mockClear();
  });

  test('renders button and calls checkout on click', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: 'test-session-id' } });

    render(<StripeCheckoutButton items={mockItems} />);
    const button = screen.getByRole('button', { name: /checkout/i });
    expect(button).toBeInTheDocument();

    // Use act to flush all effects
    await (await import('react-dom/test-utils')).act(async () => {
      fireEvent.click(button);
    });

    // Debug output
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/stripe/create-checkout-session',
        expect.any(Object),
        expect.any(Object)
      );
    });
    // Add debug log to see if redirectToCheckout is called
    await waitFor(() => {
      // eslint-disable-next-line no-console
      console.log('mockRedirectToCheckout calls:', mockRedirectToCheckout.mock.calls);
      expect(mockRedirectToCheckout).toHaveBeenCalledWith({ sessionId: 'test-session-id' });
    });
  });

  test('disables button if items are empty', () => {
    render(<StripeCheckoutButton items={[]} />);
    const button = screen.getByRole('button', { name: /checkout/i });
    expect(button).toBeDisabled();
  });

  test('shows loading indicator while processing', async () => {
    // ...rest of the test code...
  });
});
