import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CheckoutPage from '../../src/pages/CheckoutPage'; // Adjust if needed
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const mockCart = [
  { _id: '1', name: 'Item A', price: 20, quantity: 2 },
  { _id: '2', name: 'Item B', price: 10, quantity: 1 },
];

describe('💳 CheckoutPage', () => {
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
    expect(screen.getByText(/2/)).toBeInTheDocument(); // Quantity for Item A
    expect(screen.getByText(/20/)).toBeInTheDocument(); // Price for Item A
    expect(screen.getByText(/1/)).toBeInTheDocument(); // Quantity for Item B
    expect(screen.getByText(/10/)).toBeInTheDocument(); // Price for Item B
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
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  // Optional: If you have a "Clear Cart" or "Remove" button
  // test('removes item from cart', () => {
  //   render(
  //     <MemoryRouter>
  //       <CheckoutPage />
  //     </MemoryRouter>
  //   );
  //   const removeBtn = screen.getAllByRole('button', { name: /remove/i })[0];
  //   fireEvent.click(removeBtn);
  //   expect(screen.queryByText(/item a/i)).not.toBeInTheDocument();
  // });

  test('matches snapshot', () => {
    const { asFragment } = render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });
});