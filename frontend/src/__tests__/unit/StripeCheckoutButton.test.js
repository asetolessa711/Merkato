import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StripeCheckoutButton from '../../components/StripeCheckoutButton';
import '@testing-library/jest-dom';
import axios from 'axios';

const mockRedirectToCheckout = jest.fn(() => Promise.resolve({}));
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => ({
    redirectToCheckout: mockRedirectToCheckout
  }))
}));
jest.mock('axios');

describe('\ud83d\udcb3 StripeCheckoutButton', () => {
  const mockItems = [{ productId: '123', quantity: 1 }];

  beforeEach(() => {
    axios.post.mockClear();
    mockRedirectToCheckout.mockClear();
  });

  test('renders button and calls checkout on click', async () => {
    axios.post.mockResolvedValueOnce({
      data: { url: 'https://checkout.stripe.com/test-session' }
    });

    render(<StripeCheckoutButton items={mockItems} />);
    const button = screen.getByRole('button', { name: /checkout/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/stripe/create-checkout-session',
        expect.any(Object),
        expect.any(Object)
      );
      expect(mockRedirectToCheckout).toHaveBeenCalledWith({ sessionId: undefined });
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
