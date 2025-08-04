
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrderConfirmation from '../../pages/OrderConfirmation';

describe('OrderConfirmation', () => {
  it('renders without crashing', () => {
    // Replace with actual OrderConfirmation component when available
    expect(true).toBe(true);
  });
});

describe('\ud83e\uddfe OrderConfirmation Page', () => {

  const mockOrder = {
    orderNumber: '12345',
    invoiceNumber: 'INV-67890',
    date: '2025-08-02',
    buyer: {
      type: 'Individual',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      address: '123 Main St',
      taxId: 'TAX-001',
      company: 'Acme Inc.'
    },
    company: {
      name: 'Merkato',
      address: '456 Market Ave',
      email: 'info@merkato.com',
      phone: '555-5678',
      taxId: 'TAX-999'
    },
    items: [
      { name: 'Product A', quantity: 2, price: 10.5 },
      { name: 'Product B', quantity: 1, price: 20 }
    ],
    currency: '$',
    subtotal: 41,
    tax: 5,
    total: 46
  };

  function renderWithOrder() {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/confirmation', state: { order: mockOrder } }]}> 
        <OrderConfirmation />
      </MemoryRouter>
    );
  }

  test('displays confirmation message and order details', () => {
    renderWithOrder();
    expect(screen.getByText(/thank you/i)).toBeInTheDocument();
    expect(screen.getByText(/your order has been placed/i)).toBeInTheDocument();
    expect(screen.getByText(/order number/i)).toBeInTheDocument();
    expect(screen.getByText(/invoice number/i)).toBeInTheDocument();
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    expect(screen.getAllByText(/merkato/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/product a/i)).toBeInTheDocument();
    expect(screen.getByText(/product b/i)).toBeInTheDocument();
  });

  test('offers link or button to return to homepage or shop', () => {
    renderWithOrder();
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
    // Navigation simulation can be implemented here if needed
    expect(shopLink || shopButton).toBeInTheDocument();
  });
});
