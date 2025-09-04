import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutPage from '../CheckoutPage';

// Mock useNavigate from react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock useMessage context
jest.mock('../../context/MessageContext', () => ({
  useMessage: () => ({ showMessage: jest.fn() })
}));

// Mock Modal to render children directly
jest.mock('react-modal', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>
}));

describe('CheckoutPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows empty cart message if no items', () => {
    render(<CheckoutPage />);
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  it('renders cart items and total', () => {
    localStorage.setItem('merkato-cart', JSON.stringify([
      { _id: '1', name: 'Test Product', price: 10, quantity: 2 }
    ]));
    render(<CheckoutPage />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('$10')).toBeInTheDocument();
    expect(screen.getByText(/total: \$20/i)).toBeInTheDocument();
  });

  it('shows guest checkout form if not logged in', () => {
    localStorage.setItem('merkato-cart', JSON.stringify([
      { _id: '1', name: 'Test Product', price: 10, quantity: 1 }
    ]));
    render(<CheckoutPage />);
    expect(screen.getByText(/guest checkout/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('validates promo code and applies discount in summary modal', async () => {
    localStorage.setItem('merkato-cart', JSON.stringify([
      { _id: '1', name: 'Test Product', price: 100, quantity: 1 }
    ]));
    render(<CheckoutPage />);
    // Fill guest form
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByLabelText(/shipping address/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: 'USA' } });
    fireEvent.click(screen.getByText(/place order as guest/i));
    // Modal should show
    await waitFor(() => expect(screen.getByText(/order summary/i)).toBeInTheDocument());
    // Apply promo code
    fireEvent.change(screen.getByPlaceholderText(/promo code/i), { target: { value: 'SAVE10' } });
    fireEvent.click(screen.getByText(/apply/i));
    await waitFor(() => expect(screen.getByText(/promo applied/i)).toBeInTheDocument());
    // Use a custom matcher to handle split nodes for the discount line
    expect(
      screen.getByText((content, node) => {
        const hasText = (node) =>
          node.textContent && /discount:\s*-\$?10\.00/i.test(node.textContent.replace(/\s+/g, ''));
        const nodeHasText = hasText(node);
        const childrenDontHaveText = Array.from(node?.children || []).every(
          (child) => !hasText(child)
        );
        return nodeHasText && childrenDontHaveText;
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/final total: \$90.00/i)).toBeInTheDocument();
  });
});
