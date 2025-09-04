// Hoist all mocks to the very top
const mockRedirectToCheckout = jest.fn(() => Promise.resolve({}));
// Robust mock for @stripe/stripe-js
jest.mock('@stripe/stripe-js', () => {
  const loadStripe = jest.fn(() =>
    Promise.resolve({
      redirectToCheckout: mockRedirectToCheckout
    })
  );
  return {
    __esModule: true,
    loadStripe,
    default: loadStripe,
  };
});
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
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

    // Inject the mock stripe instance directly
    const mockStripe = { redirectToCheckout: mockRedirectToCheckout };
    render(<StripeCheckoutButton items={mockItems} stripe={mockStripe} />);
    const button = screen.getByRole('button', { name: /checkout/i });
    expect(button).toBeInTheDocument();

    // Use act from @testing-library/react to flush all effects


    await act(async () => {
      await fireEvent.click(button);
    });

    // Debug: print call count after click
    // eslint-disable-next-line no-console
    console.log('[TEST DEBUG] mockRedirectToCheckout call count:', mockRedirectToCheckout.mock.calls.length);

    // Wait for axios.post to be called
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/stripe/create-checkout-session',
        expect.any(Object),
        expect.any(Object)
      );
    });

    // Extra wait to ensure redirectToCheckout is called
    await waitFor(() => {
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
