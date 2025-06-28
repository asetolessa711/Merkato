import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CartSidebar from '../../src/components/CartSidebar'; // Adjust if needed
import '@testing-library/jest-dom';

const mockItems = [
  { id: '1', name: 'Test Product 1', quantity: 2, price: 10 },
  { id: '2', name: 'Test Product 2', quantity: 1, price: 20 }
];

describe('🛒 CartSidebar', () => {
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

  test('matches snapshot', () => {
    const { asFragment } = render(<CartSidebar isOpen={true} items={mockItems} onClose={() => {}} />);
    expect(asFragment()).toMatchSnapshot();
  });
});