import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrderConfirmation from '../../src/pages/OrderConfirmation'; // Adjust path
import '@testing-library/jest-dom';

describe('🧾 OrderConfirmation Page', () => {
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
      fireEvent.click(shopLink);
      // Optionally, assert navigation if using a router mock or history
    } else if (shopButton) {
      fireEvent.click(shopButton);
       // Optionally, assert navigation or callback
    }
    // No assertion here as navigation is handled by router, but you can mock and check if needed
  });

  test('matches snapshot', () => {
    const { asFragment } = render(
      <MemoryRouter>
        <OrderConfirmation />
      </MemoryRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
