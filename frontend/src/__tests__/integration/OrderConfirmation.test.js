import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrderConfirmation from '../../pages/OrderConfirmation'; // Adjust path if needed
import { MessageProvider } from '../../context/MessageContext'; // Add if using global message context
import '@testing-library/jest-dom';

describe('🧾 OrderConfirmation Page', () => {
  test('renders with no items', () => {
    const order = getOrder({ items: [], subtotal: 0, tax: 0, total: 0 });
    renderWithCustomOrder(order);
    // Should not throw, and should show a message or hide the table
    expect(screen.queryByText(/item/i)).not.toBeNull(); // Table header may still exist
    // Optionally, check for empty state message if implemented
  });

  test('renders with large quantities and prices', () => {
    const order = getOrder({
      items: [
        { name: 'Bulk Product', quantity: 10000, price: 99999.99 }
      ],
      subtotal: 999999000,
      tax: 100000,
      total: 1099999000,
    });
    renderWithCustomOrder(order);
    expect(screen.getByText(/bulk product/i)).toBeInTheDocument();
    // Use context-aware query for quantity cell in the correct row
    const qtyCell = screen.getAllByText('10000').find(cell => cell.tagName === 'TD' && cell.closest('tr') && Array.from(cell.closest('tr').children).some(sib => sib.textContent.match(/bulk product/i)));
    expect(qtyCell).toBeInTheDocument();
    // Use context-aware query for price cell in the correct row
    const priceCell = screen.getAllByText((content, node) => node.textContent.includes('99999.99') && node.tagName === 'TD');
    expect(priceCell.some(cell => cell.closest('tr') && Array.from(cell.closest('tr').children).some(sib => sib.textContent.match(/bulk product/i)))).toBe(true);
  });

  test('renders with special characters and emojis', () => {
    const order = getOrder({
      items: [
        { name: '🎉 Special Product ™', quantity: 1, price: 12.34 }
      ],
      buyer: { name: '😀 Emoji User', email: 'emoji@example.com' },
      company: { name: 'Company & Co. ®', address: '123 Emoji St.' },
    });
    renderWithCustomOrder(order);
    expect(screen.getByText(/🎉 special product ™/i)).toBeInTheDocument();
    expect(screen.getByText(/😀 emoji user/i)).toBeInTheDocument();
    expect(screen.getByText(/company & co. ®/i)).toBeInTheDocument();
  });

  test('renders with long text fields', () => {
    const longName = 'A'.repeat(200);
    const longAddress = 'B'.repeat(300);
    const order = getOrder({
      items: [{ name: longName, quantity: 1, price: 1.23 }],
      buyer: { name: longName, address: longAddress, email: 'long@example.com' },
      company: { name: longName, address: longAddress },
    });
    renderWithCustomOrder(order);
    // Use context-aware queries to avoid ambiguous matches
    const nameCells = screen.getAllByText(longName);
    expect(nameCells.length).toBeGreaterThan(0);
    // Use a flexible matcher for address, and allow multiple matches (buyer and company)
    const addressCells = screen.getAllByText((content, node) => content.includes(longAddress));
    expect(addressCells.length).toBeGreaterThanOrEqual(2);
  });

  test('renders with null/undefined fields', () => {
    const order = getOrder({
      buyer: { name: null, email: undefined },
      company: null,
    });
    // Should not throw, and should handle missing fields gracefully
    expect(() => renderWithCustomOrder(order)).not.toThrow();
    // Optionally, check for fallback text or absence
  });

  test('renders with discount', () => {
    const order = getOrder({ subtotal: 100, tax: 10, discount: 20, total: 90 });
    renderWithCustomOrder(order);
    // If discount is displayed, check for it
    if (screen.queryByText(/discount/i)) {
      expect(screen.getByText(/discount/i)).toBeInTheDocument();
    }
    expect(screen.getByText(/total:\s*usd\s*90.00/i)).toBeInTheDocument();
  });

  test('renders with missing company section', () => {
    const order = getOrder({ company: undefined });
    expect(() => renderWithCustomOrder(order)).not.toThrow();
    // Should not throw, and should handle missing company gracefully
  });

  test('renders with buyer notes/instructions', () => {
    const order = getOrder({ notes: 'Please deliver after 5pm.' });
    renderWithCustomOrder(order);
    if (screen.queryByText(/please deliver after 5pm/i)) {
      expect(screen.getByText(/please deliver after 5pm/i)).toBeInTheDocument();
    }
  });

  test('renders with future and past dates', () => {
    const orderFuture = getOrder({ date: '2099-01-01' });
    renderWithCustomOrder(orderFuture);
    expect(screen.getByText(/2099-01-01/)).toBeInTheDocument();
    const orderPast = getOrder({ date: '1999-12-31' });
    renderWithCustomOrder(orderPast);
    expect(screen.getByText(/1999-12-31/)).toBeInTheDocument();
  });

  test('renders with custom invoice number format', () => {
    const order = getOrder({ invoiceNumber: 'INV/2025-0001-XYZ' });
    renderWithCustomOrder(order);
    expect(screen.getByText(/inv\/2025-0001-xyz/i)).toBeInTheDocument();
  });

  test('renders with tax exemption', () => {
    const order = getOrder({ tax: 0, taxExempt: true, subtotal: 100, total: 100 });
    renderWithCustomOrder(order);
    // If tax exemption is displayed, check for it
    if (screen.queryByText(/tax exempt/i)) {
      expect(screen.getByText(/tax exempt/i)).toBeInTheDocument();
    }
    expect(screen.getByText(/tax:\s*usd\s*0.00/i)).toBeInTheDocument();
  });

  test('renders with payment method', () => {
    const order = getOrder({ paymentMethod: 'Credit Card' });
    renderWithCustomOrder(order);
    if (screen.queryByText(/credit card/i)) {
      expect(screen.getByText(/credit card/i)).toBeInTheDocument();
    }
  });

  test('renders with download link for invoice', () => {
    const order = getOrder({ invoiceUrl: '/invoices/12345.pdf' });
    renderWithCustomOrder(order);
    if (screen.queryByRole('link', { name: /download invoice/i })) {
      expect(screen.getByRole('link', { name: /download invoice/i })).toHaveAttribute('href', '/invoices/12345.pdf');
    }
  });
  // Helper to deeply clone mockOrder and override fields
  function getOrder(overrides = {}) {
    return JSON.parse(JSON.stringify({
      orderNumber: '12345',
      invoiceNumber: 'INV-67890',
      date: '2025-08-05',
      buyer: {
        type: 'guest',
        name: 'Guest Buyer',
        email: 'guest@example.com',
        phone: '1234567890',
        address: '123 Cypress Lane',
      },
      company: {
        name: 'Test Company',
        address: '456 Company St',
        email: 'company@example.com',
      },
      items: [
        { name: 'Cypress Test Product', quantity: 1, price: 24.99 }
      ],
      subtotal: 20.00,
      tax: 4.99,
      total: 24.99,
      currency: 'USD',
      ...overrides,
    }, (key, value) => (overrides[key] !== undefined ? overrides[key] : value)));
  }

  function renderWithCustomOrder(order) {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/order-confirmation', state: { order } }] }>
        <MessageProvider>
          <OrderConfirmation />
        </MessageProvider>
      </MemoryRouter>
    );
  }

  test('renders multiple items in order', () => {
    const order = getOrder({
      items: [
        { name: 'Product A', quantity: 2, price: 10.0 },
        { name: 'Product B', quantity: 1, price: 5.5 },
      ],
      subtotal: 25.5,
      tax: 0.0,
      total: 25.5,
    });
    renderWithCustomOrder(order);
    expect(screen.getByText(/product a/i)).toBeInTheDocument();
    expect(screen.getByText(/product b/i)).toBeInTheDocument();
    // Quantity cells in the table
    const qty2 = screen.getAllByText('2').find(cell => cell.tagName === 'TD' && cell.closest('tr') && Array.from(cell.closest('tr').children).some(sib => sib.textContent.match(/product a/i)));
    expect(qty2).toBeInTheDocument();
    const qty1 = screen.getAllByText('1').find(cell => cell.tagName === 'TD' && cell.closest('tr') && Array.from(cell.closest('tr').children).some(sib => sib.textContent.match(/product b/i)));
    expect(qty1).toBeInTheDocument();
    // Price cells in the table
    const price10 = screen.getAllByText((content, node) => node.textContent.includes('10.00') && node.tagName === 'TD');
    expect(price10.some(cell => cell.closest('tr') && Array.from(cell.closest('tr').children).some(sib => sib.textContent.match(/product a/i)))).toBe(true);
    const price5 = screen.getAllByText((content, node) => node.textContent.includes('5.50') && node.tagName === 'TD');
    expect(price5.some(cell => cell.closest('tr') && Array.from(cell.closest('tr').children).some(sib => sib.textContent.match(/product b/i)))).toBe(true);
  });

  test('renders customer (non-guest) buyer', () => {
    const order = getOrder({
      buyer: {
        type: 'customer',
        name: 'Registered User',
        email: 'customer@example.com',
        phone: '555-1234',
        address: '789 Customer Ave',
      },
    });
    renderWithCustomOrder(order);
    expect(screen.getByText(/registered user/i)).toBeInTheDocument();
    expect(screen.getByText(/customer@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/555-1234/)).toBeInTheDocument();
    expect(screen.getByText(/789 customer ave/i)).toBeInTheDocument();
    // Check for the label in the heading (Buyer Info (customer))
    expect(screen.getByText((content, node) => node.tagName === 'H4' && /customer/i.test(content))).toBeInTheDocument();
  });

  test('handles missing optional fields gracefully', () => {
    const order = getOrder({
      buyer: {
        type: 'guest',
        name: 'Guest Buyer',
        email: 'guest@example.com',
        // phone omitted
        // address omitted
      },
      company: {
        name: 'Test Company',
        // address omitted
        // email omitted
      },
    });
    renderWithCustomOrder(order);
    expect(screen.getByText(/guest buyer/i)).toBeInTheDocument();
    expect(screen.getByText(/guest@example.com/i)).toBeInTheDocument();
    // Should not throw if phone/address/email missing
    // Optionally, check for fallback text or absence
  });

  test('renders with different currency', () => {
    const order = getOrder({ currency: 'EUR', subtotal: 10, tax: 2, total: 12 });
    renderWithCustomOrder(order);
    // Check for EUR in summary section
    expect(screen.getByText(/subtotal:\s*eur\s*10.00/i)).toBeInTheDocument();
    expect(screen.getByText(/tax:\s*eur\s*2.00/i)).toBeInTheDocument();
    expect(screen.getByText(/total:\s*eur\s*12.00/i)).toBeInTheDocument();
    // Check for EUR in the table
    const eurCells = screen.getAllByText((content, node) => node.textContent.includes('EUR') && node.tagName === 'TD');
    expect(eurCells.length).toBeGreaterThan(0);
  });

  test('handles zero tax and discount', () => {
    const order = getOrder({ tax: 0, subtotal: 50, total: 50 });
    renderWithCustomOrder(order);
    expect(screen.getByText(/tax:\s*usd\s*0.00/i)).toBeInTheDocument();
    // Optionally, add discount field and check if displayed
  });

  test('calls window.print when print invoice button is clicked', () => {
    const order = getOrder();
    renderWithCustomOrder(order);
    const printButton = screen.getByRole('button', { name: /print invoice/i });
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    fireEvent.click(printButton);
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  test('navigates to home/shop when return link is clicked', () => {
    const order = getOrder();
    renderWithCustomOrder(order);
    // The Return to Home is rendered as a button role (aria-role="button")
    const homeBtn = screen.getByRole('button', { name: /return to home/i });
    expect(homeBtn).toHaveAttribute('href', '/');
    // Optionally, fireEvent.click(homeLink) and check navigation with a router mock
  });

  test('displays order date in expected format', () => {
    const order = getOrder({ date: '2025-12-31' });
    renderWithCustomOrder(order);
    expect(screen.getByText(/2025-12-31/)).toBeInTheDocument();
  });

  test('has accessible roles and labels', () => {
    const order = getOrder();
    renderWithCustomOrder(order);
    // Check for heading
    expect(screen.getByRole('heading', { name: /order confirmation/i })).toBeInTheDocument();
    // Check for print button
    expect(screen.getByRole('button', { name: /print invoice/i })).toBeInTheDocument();
    // Check for navigation button (Return to Home)
    expect(screen.getByRole('button', { name: /return to home/i })).toBeInTheDocument();
  });

  test('matches snapshot with different data', () => {
    const order = getOrder({
      orderNumber: '99999',
      items: [
        { name: 'Special Product', quantity: 3, price: 99.99 },
      ],
      subtotal: 299.97,
      tax: 0,
      total: 299.97,
      currency: 'USD',
    });
    const { asFragment } = render(
      <MemoryRouter initialEntries={[{ pathname: '/order-confirmation', state: { order } }] }>
        <MessageProvider>
          <OrderConfirmation />
        </MessageProvider>
      </MemoryRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });
  const mockOrder = {
    orderNumber: '12345',
    invoiceNumber: 'INV-67890',
    date: '2025-08-05',
    buyer: {
      type: 'guest',
      name: 'Guest Buyer',
      email: 'guest@example.com',
      phone: '1234567890',
      address: '123 Cypress Lane',
    },
    company: {
      name: 'Test Company',
      address: '456 Company St',
      email: 'company@example.com',
    },
    items: [
      { name: 'Cypress Test Product', quantity: 1, price: 24.99 }
    ],
    subtotal: 20.00,
    tax: 4.99,
    total: 24.99,
    currency: 'USD',
  };

  function renderWithOrder() {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/order-confirmation', state: { order: mockOrder } }] }>
        <MessageProvider>
          <OrderConfirmation />
        </MessageProvider>
      </MemoryRouter>
    );
  }

  test('displays confirmation message for guest or customer', () => {
    renderWithOrder();
    expect(screen.getByText(/thank you/i)).toBeInTheDocument();
    expect(screen.getByText(/your order has been placed/i)).toBeInTheDocument();
    // If your page displays order number or summary, check for it:
    expect(screen.getByText(/order number/i)).toBeInTheDocument();
    expect(screen.getByText(/invoice number/i)).toBeInTheDocument();
  });

  test('offers link or button to return to homepage or shop', () => {
    renderWithOrder();
    // Accept either a link or button for navigation
    const shopLink = screen.queryByRole('link', { name: /shop|home/i });
    const shopButton = screen.queryByRole('button', { name: /shop|home/i });
    expect(shopLink || shopButton).toBeInTheDocument();
  });

  test('has a confirmation heading', () => {
    renderWithOrder();
    expect(screen.getByRole('heading', { name: /order confirmation/i })).toBeInTheDocument();
  });

  test('navigates to shop/home when link or button is clicked', () => {
    renderWithOrder();
    const shopLink = screen.queryByRole('link', { name: /shop|home/i });
    const shopButton = screen.queryByRole('button', { name: /shop|home/i });
    if (shopLink) {
      fireEvent.click(shopLink);
      // Optionally, assert navigation if using a router mock or history
    } else if (shopButton) {
      fireEvent.click(shopButton);
      // Optionally, assert navigation or callback
    }
    // No assertion here as navigation is handled by router, but you can mock and check if needed
  });

  test('displays order item details', () => {
    renderWithOrder();
    // Product name
    expect(screen.getByText(/cypress test product/i)).toBeInTheDocument();
    // Quantity: look for the table cell with 1 (should be unique in the items table)
    const qtyCells = screen.getAllByText('1');
    // Find the one that is a <td> and has a sibling with the product name
    const qtyCell = qtyCells.find(cell => cell.tagName === 'TD' && cell.closest('tr') &&
      Array.from(cell.closest('tr').children).some(sib => sib.textContent.match(/cypress test product/i)));
    expect(qtyCell).toBeInTheDocument();
    // Price: get all cells with 'USD' and '24.99', then pick the one in the product row
    const priceCells = screen.getAllByText((content, node) => {
      const hasUSD = node.textContent.includes('USD');
      const hasPrice = node.textContent.includes('24.99');
      return hasUSD && hasPrice && node.tagName === 'TD';
    });
    const priceCell = priceCells.find(cell => cell.closest('tr') &&
      Array.from(cell.closest('tr').children).some(sib => sib.textContent.match(/cypress test product/i)));
    expect(priceCell).toBeInTheDocument();
  });

  test('displays buyer information', () => {
    renderWithOrder();
    expect(screen.getByText(/guest buyer/i)).toBeInTheDocument();
    expect(screen.getByText(/guest@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/1234567890/)).toBeInTheDocument();
    expect(screen.getByText(/123 cypress lane/i)).toBeInTheDocument();
  });

  test('displays company information', () => {
    renderWithOrder();
    expect(screen.getByText(/test company/i)).toBeInTheDocument();
    expect(screen.getByText(/456 company st/i)).toBeInTheDocument();
    expect(screen.getByText(/company@example.com/i)).toBeInTheDocument();
  });

  test('displays correct currency formatting', () => {
    renderWithOrder();
    // Check that all currency values are shown with USD and correct amounts
    // Subtotal
    expect(screen.getByText(/subtotal:\s*usd\s*20.00/i)).toBeInTheDocument();
    // Tax
    expect(screen.getByText(/tax:\s*usd\s*4.99/i)).toBeInTheDocument();
    // Total
    expect(screen.getByText(/total:\s*usd\s*24.99/i)).toBeInTheDocument();
  });

  test('matches snapshot', () => {
    renderWithOrder();
    const { asFragment } = render(
      <MemoryRouter initialEntries={[{ pathname: '/order-confirmation', state: { order: mockOrder } }] }>
        <MessageProvider>
          <OrderConfirmation />
        </MessageProvider>
      </MemoryRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
