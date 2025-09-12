// Tags: @thread:vendor-products-manage
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import VendorProducts from '../../pages/VendorProducts';

jest.mock('axios', () => ({ get: jest.fn(() => Promise.resolve({ data: [
  { _id: 'p1', name: 'Prod A', price: 10, stock: 5, category: 'Cat' },
  { _id: 'p2', name: 'Prod B', price: 20, stock: 2, category: 'Cat' }
] })) }));

describe('VendorProducts integration', () => {
  beforeEach(() => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', JSON.stringify({ _id: 'vendor123', name: 'Vendor User' }));
  });
  test('renders product table', async () => {
    render(<MemoryRouter><VendorProducts /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText(/Prod A/)).toBeInTheDocument();
      expect(screen.getByText(/Prod B/)).toBeInTheDocument();
      expect(screen.getByText(/My Products/)).toBeInTheDocument();
    });
  });
});
