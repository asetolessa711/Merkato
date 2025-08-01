import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CheckoutPage from '../../pages/CheckoutPage';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const mockCart = [
  { _id: '1', name: 'Item A', price: 20, quantity: 2 },
  { _id: '2', name: 'Item B', price: 10, quantity: 1 },
];

describe('\ud83d\udcb3 CheckoutPage', () => {
  beforeEach(() => {
    localStorage.setItem('merkato-cart', JSON.stringify(mockCart));
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('renders cart items and total', () => {
    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/item a/i)).toBeInTheDocument();
    expect(screen.getByText(/item b/i)).toBeInTheDocument();
    expect(screen.getByText(/\$?50/i)).toBeInTheDocument(); // Total: 20×2 + 10×1
    // Use getAllByText to avoid ambiguity
    expect(screen.getAllByText('2')[0]).toBeInTheDocument(); // Quantity for Item A
    expect(screen.getAllByText('20')[0]).toBeInTheDocument(); // Price for Item A
    expect(screen.getAllByText('1')[0]).toBeInTheDocument(); // Quantity for Item B
    expect(screen.getAllByText('10')[0]).toBeInTheDocument(); // Price for Item B
  });

  test('renders empty message if cart is empty', () => {
    localStorage.setItem('merkato-cart', JSON.stringify([]));
    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  test('handles corrupted cart data gracefully', () => {
    localStorage.setItem('merkato-cart', '{bad json');
    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );
    // ...rest of the test code...
  });
});
