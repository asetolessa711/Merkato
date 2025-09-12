import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AdminOrders from '../../pages/AdminOrders';

// Minimal mock of axios to prevent real HTTP
jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: { orders: [] } }),
  post: jest.fn().mockResolvedValue({ data: { success: ['1'], failed: [] } }),
  patch: jest.fn().mockResolvedValue({ data: {} })
}));

describe('AdminOrders (core behaviours) @trust-ui', () => {
  const sampleOrders = [
    {
      _id: '1',
      buyer: { name: 'Bob', email: 'bob@example.com' },
      status: 'pending',
      currency: 'USD',
      total: 10,
      paymentMethod: 'card',
      updatedAt: Date.now(),
      vendors: [{ products: [{ _id: 'p1', name: 'Product A', quantity: 1 }] }]
    },
    {
      _id: '2',
      buyer: { name: 'Sue', email: 'sue@example.com' },
      status: 'paid',
      currency: 'USD',
      total: 20,
      paymentMethod: 'paypal',
      updatedAt: Date.now(),
      vendors: [{ products: [{ _id: 'p2', name: 'Product B', quantity: 2 }] }]
    }
  ];

  const renderPage = () => render(<AdminOrders initialOrders={sampleOrders} showMessage={()=>{}} />);

  it('renders orders rows', () => {
    renderPage();
    expect(screen.getByTestId('order-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('order-row-2')).toBeInTheDocument();
  });

  it('select all toggles all checkboxes', () => {
    renderPage();
    const selectAll = screen.getByTestId('order-select-all');
    fireEvent.click(selectAll);
    expect(selectAll).toBeChecked();
  });

  it('bulk toolbar appears after selecting an order and allows status preview flow', () => {
    renderPage();
    const row1 = screen.getByTestId('order-row-1');
    const cb = within(row1).getByTestId('order-checkbox');
    fireEvent.click(cb);
    const markBtn = screen.getByTestId('bulk-action-mark-shipped');
    fireEvent.click(markBtn);
    // Preview dialog should appear
    expect(screen.getByTestId('bulk-preview-dialog')).toBeInTheDocument();
  });
});
