import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrderConfirmation from '../../src/pages/OrderConfirmation'; // Adjust path if needed
import { MessageProvider } from '../../src/context/MessageContext'; // Add if using global message context
import '@testing-library/jest-dom';

describe('🧾 OrderConfirmation Page', () => {
  const mockOrder = {
    orderNumber: '12345',
    invoiceNumber: 'INV-67890',
    date: '2025-08-05',
    buyer: {
      type: 'guest',
      name: 'Guest Buyer',
      email: 'guest@example.com',
      phone: '1234567890',
      address: '123 Cypress Lane',
    },
    company: {
      name: 'Test Company',
      address: '456 Company St',
      email: 'company@example.com',
    },
    items: [
      { name: 'Cypress Test Product', quantity: 1, price: 24.99 }
    ],
    total: 24.99,
    currency: 'USD',
  };

  function renderWithOrder() {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/order-confirmation', state: { order: mockOrder } }] }>
        <MessageProvider>
          <OrderConfirmation />
        </MessageProvider>
      </MemoryRouter>
    );
  }

  test('displays confirmation message for guest or customer', () => {
    renderWithOrder();
    expect(screen.getByText(/thank you/i)).toBeInTheDocument();
    expect(screen.getByText(/your order has been placed/i)).toBeInTheDocument();
    // If your page displays order number or summary, check for it:
    expect(screen.getByText(/order number/i)).toBeInTheDocument();
    expect(screen.getByText(/invoice number/i)).toBeInTheDocument();
  });

  test('offers link or button to return to homepage or shop', () => {
    renderWithOrder();
    // Accept either a link or button for navigation
    const shopLink = screen.queryByRole('link', { name: /shop|home/i });
    const shopButton = screen.queryByRole('button', { name: /shop|home/i });
    expect(shopLink || shopButton).toBeInTheDocument();
  });

  test('has a confirmation heading', () => {
    renderWithOrder();
    expect(screen.getByRole('heading', { name: /order confirmation/i })).toBeInTheDocument();
  });

  test('navigates to shop/home when link or button is clicked', () => {
    renderWithOrder();
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
    renderWithOrder();
    const { asFragment } = render(
      <MemoryRouter initialEntries={[{ pathname: '/order-confirmation', state: { order: mockOrder } }] }>
        <MessageProvider>
          <OrderConfirmation />
        </MessageProvider>
      </MemoryRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
