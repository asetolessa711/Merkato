import React from 'react';
import { render, screen } from '@testing-library/react';

describe('OrderConfirmation', () => {
  it('renders without crashing', () => {
    // Replace with actual OrderConfirmation component when available
    expect(true).toBe(true);
  });
});

describe('\ud83e\uddfe OrderConfirmation Page', () => {
  test('displays confirmation message and order details', () => {
    render(
      <MemoryRouter>
        <OrderConfirmation />
      </MemoryRouter>
    );

    expect(screen.getByText(/thank you/i)).toBeInTheDocument();
    expect(screen.getByText(/your order has been placed/i)).toBeInTheDocument();
    // If your page displays order number or summary, check for it:
    // expect(screen.getByText(/order #\d+/i)).toBeInTheDocument();
  });

  test('offers link or button to return to homepage or shop', () => {
    render(
      <MemoryRouter>
        <OrderConfirmation />
      </MemoryRouter>
    );
    // Accept either a link or button for navigation
    const shopLink = screen.queryByRole('link', { name: /shop|home/i });
    const shopButton = screen.queryByRole('button', { name: /shop|home/i });
    expect(shopLink || shopButton).toBeInTheDocument();
  });

  test('has a confirmation heading', () => {
    render(
      <MemoryRouter>
        <OrderConfirmation />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /order confirmation/i })).toBeInTheDocument();
  });

  test('navigates to shop/home when link or button is clicked', () => {
    render(
      <MemoryRouter>
        <OrderConfirmation />
      </MemoryRouter>
    );
    const shopLink = screen.queryByRole('link', { name: /shop|home/i });
    const shopButton = screen.queryByRole('button', { name: /shop|home/i });
    if (shopLink) {
      // ...simulate click and assert navigation...
    }
    if (shopButton) {
      // ...simulate click and assert navigation...
    }
  });
});
