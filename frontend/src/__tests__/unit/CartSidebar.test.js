import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CartSidebar from '../../components/CartSidebar';
import '@testing-library/jest-dom';

const mockItems = [
  { id: '1', name: 'Test Product 1', quantity: 2, price: 10 },
  { id: '2', name: 'Test Product 2', quantity: 1, price: 20 }
];

describe('\ud83d\uded2 CartSidebar', () => {
  test('renders cart items and calculates total', () => {
    render(<CartSidebar isOpen={true} items={mockItems} onClose={() => {}} />);
    expect(screen.getByText(/test product 1/i)).toBeInTheDocument();
    expect(screen.getByText(/test product 2/i)).toBeInTheDocument();
    expect(screen.getByText(/\$40/)).toBeInTheDocument(); // 2×10 + 1×20 = 40
  });

  test('calls onClose when close button is clicked', () => {
    const mockClose = jest.fn();
    render(<CartSidebar isOpen={true} items={mockItems} onClose={mockClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(mockClose).toHaveBeenCalled();
  });

  test('does not render if isOpen is false', () => {
    const { container } = render(<CartSidebar isOpen={false} items={mockItems} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders empty message if cart is empty', () => {
    render(<CartSidebar isOpen={true} items={[]} onClose={() => {}} />);
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  test('calls remove handler when remove button is clicked', () => {
    const mockRemove = jest.fn();
    render(
      <CartSidebar
        isOpen={true}
        items={mockItems}
        onClose={() => {}}
        onRemove={mockRemove}
      />
    );
    // Adjust selector if your remove button uses a different label
    const removeBtns = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeBtns[0]);
    expect(mockRemove).toHaveBeenCalledWith(mockItems[0].id);
  });

  test('checkout button disabled when cart is empty', () => {
    render(<CartSidebar isOpen={true} items={[]} onClose={() => {}} />);
    const btn = screen.getByTestId('checkout-btn');
    expect(btn).toBeDisabled();
  });

  test('clicking checkout navigates to /checkout', () => {
    const originalHref = window.location.href;
    delete window.location;
    // Provide a minimal window.location stub suitable for jsdom
    window.location = { href: 'http://localhost/' };
    try {
      render(<CartSidebar isOpen={true} items={mockItems} onClose={() => {}} />);
      const btn = screen.getByTestId('checkout-btn');
      fireEvent.click(btn);
      expect(window.location.href).toMatch(/\/checkout$/);
    } finally {
      // restore
      window.location = { href: originalHref };
    }
  });

  test('remove uses _id when provided', () => {
    const items = [
      { _id: 'abc', name: 'With Mongo _id', price: 5, quantity: 1 },
      { id: 'def', name: 'With id', price: 3, quantity: 1 },
    ];
    const mockRemove = jest.fn();
    render(<CartSidebar isOpen={true} items={items} onClose={() => {}} onRemove={mockRemove} />);
    const removeBtns = screen.getAllByRole('button', { name: /remove/i });
    // First item uses _id
    fireEvent.click(removeBtns[0]);
    expect(mockRemove).toHaveBeenCalledWith('abc');
  });

  test('defaults quantity to 1 when missing and totals correctly', () => {
    const items = [
      { id: 'a', name: 'No qty', price: 7 }, // quantity omitted -> 1
      { id: 'b', name: 'Has qty', price: 2, quantity: 3 },
    ];
    render(<CartSidebar isOpen={true} items={items} onClose={() => {}} />);
    // total = 1*7 + 3*2 = 13
    expect(screen.getByText(/Total: \$13/)).toBeInTheDocument();
  });
});
