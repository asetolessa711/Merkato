/**
 * Tier 2 Integration: CustomerOrders (@persona:customer @integration)
 * Uses deterministic injected orders path (window.Cypress + localStorage key) to avoid network.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomerOrders from '../../pages/CustomerOrders'';
import { MemoryRouter } from 'react-router-dom';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('../../components/Invoice', () => () => <div data-testid="invoice-stub" />);

function renderPage() {
  return render(
    <MemoryRouter>
      <CustomerOrders />
    </MemoryRouter>
  );
}

describe('CustomerOrders integration (@persona:customer)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
    // Simulate auth + Cypress deterministic injection branch
    window.Cypress = true;
    localStorage.setItem('token', 't');
    const injectedOrders = [
      {
        _id: 'order1', status: 'delivered', currency: 'USD', total: 150,
        buyer: { name: 'Buyer One', email: 'b1@test.com' },
        vendors: [
          { products: [ { name: 'Alpha Gadget', quantity: 1 }, { name: 'Beta Widget', quantity: 2 } ] }
        ],
        updatedAt: new Date().toISOString()
      }
    ];
    localStorage.setItem('e2e-customer-orders', JSON.stringify(injectedOrders));
  });

  test('renders injected order items list', async () => {
    renderPage();
  // Heading updated in UI to "Order History"
  await screen.findByText(/Order History/i);
    await screen.findByTestId('order-products');
    const itemNames = await screen.findAllByTestId('order-item-name');
    const texts = itemNames.map(n => n.textContent);
    expect(texts).toEqual(expect.arrayContaining(['Alpha Gadget', 'Beta Widget']));
  });

  test('request return updates UI state', async () => {
    renderPage();
    const btn = await screen.findByTestId('request-return-btn-order1');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByTestId('return-status-order1')).toHaveTextContent(/Return Requested/i);
    });
  });
});
