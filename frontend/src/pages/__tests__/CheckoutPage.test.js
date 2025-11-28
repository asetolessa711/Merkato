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
    // There may be multiple $10 elements (item price and formatted total)
    expect(screen.getAllByText(/\$10/).length).toBeGreaterThan(0);
    // The component shows subtotal, not "total"
    expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
  });

  it('shows buyer details form if not logged in', () => {
    localStorage.setItem('merkato-cart', JSON.stringify([
      { _id: '1', name: 'Test Product', price: 10, quantity: 1 }
    ]));
    render(<CheckoutPage />);
    // No explicit 'guest' copy — assert on presence of buyer inputs
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('validates promo code and applies discount in summary modal', async () => {
    localStorage.setItem('merkato-cart', JSON.stringify([
      { _id: '1', name: 'Test Product', price: 100, quantity: 1 }
    ]));
    render(<CheckoutPage />);
    // Fill buyer form
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByLabelText(/shipping address/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: 'USA' } });
    fireEvent.click(screen.getByTestId('guest-summary-btn'));
    // Modal should show - there are multiple "Order Summary" elements, use getAllByText
    await waitFor(() => expect(screen.getAllByText(/order summary/i).length).toBeGreaterThan(0));
    // Apply promo code - get all promo inputs and use the first one (or modal one)
    const promoInputs = screen.getAllByPlaceholderText(/promo code/i);
    fireEvent.change(promoInputs[0], { target: { value: 'SAVE10' } });
    const applyButtons = screen.getAllByText(/apply/i);
    fireEvent.click(applyButtons[0]);
    await waitFor(() => expect(screen.getAllByText(/promo applied/i).length).toBeGreaterThan(0));
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
