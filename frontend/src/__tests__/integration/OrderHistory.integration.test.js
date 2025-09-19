// Tags: @thread:order-history
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import CustomerOrders from '../../pages/CustomerOrders';

jest.mock('axios', () => ({ get: jest.fn(() => Promise.resolve({ data: { orders: [] } })) }));

describe('Order History', () => {
  beforeEach(() => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', JSON.stringify({ _id: 'u1', name: 'User' }));
  });
  test('renders empty orders', async () => {
    render(<MemoryRouter><CustomerOrders /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText(/orders/i)).toBeInTheDocument();
    });
  });
});
