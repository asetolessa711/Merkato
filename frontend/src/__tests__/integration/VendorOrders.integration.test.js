/**
 * Tier 2 Integration: VendorOrders (@persona:vendor @integration)
 * Focus: initial render, filtering by buyer/product, status update call.
 * Tags: @thread:vendor-orders-manage
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VendorOrders from '../../pages/VendorOrders';
import { MemoryRouter } from 'react-router-dom';

jest.mock('axios', () => ({ get: jest.fn(), patch: jest.fn() }));
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="chart">{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  CartesianGrid: () => <div />,
  LineChart: ({ children }) => <div>{children}</div>,
  Line: () => <div />
}));
jest.mock('../../context/MessageContext', () => ({ useMessage: () => ({ showMessage: jest.fn() }) }));

const axios = require('axios');

function renderPage() {
  return render(
    <MemoryRouter>
      <VendorOrders />
    </MemoryRouter>
  );
}

describe('VendorOrders integration (@persona:vendor)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
    localStorage.setItem('token', 't');
    localStorage.setItem('user', JSON.stringify({ _id: 'vendor123', name: 'Vendor User' }));
    axios.get.mockImplementation((url) => {
      if (url === '/api/orders/vendor-orders') {
        return Promise.resolve({ data: {
          orders: [
            {
              _id: 'o1', status: 'pending', total: 100, currency: 'USD', paymentMethod: 'card', createdAt: new Date().toISOString(),
              buyer: { name: 'Alice', email: 'a@test.com' },
              vendors: [{ products: [ { product: { name: 'Widget A', vendor: { _id: 'vendor123' } }, quantity: 2 } ] }]
            },
            {
              _id: 'o2', status: 'paid', total: 50, currency: 'USD', paymentMethod: 'card', createdAt: new Date().toISOString(),
              buyer: { name: 'Bob', email: 'b@test.com' },
              vendors: [{ products: [ { product: { name: 'Widget B', vendor: { _id: 'vendor123' } }, quantity: 1 } ] }]
            }
          ]
        }});
      }
      return Promise.resolve({ data: {} });
    });
  axios.patch.mockResolvedValue({ data: {} });
  });

  test('renders orders & filters by buyer', async () => {
    renderPage();
    await screen.findByText(/Orders for My Products/i);
    // Wait until both product line items (li elements) appear
    await waitFor(() => {
      const rows = screen.getAllByTestId('order-row');
      expect(rows.length).toBe(2);
      const texts = rows.map(r => r.textContent);
      expect(texts.join(' ')).toMatch(/Widget A/);
      expect(texts.join(' ')).toMatch(/Widget B/);
    });
    // Fallback: locate the buyer select by options present
    const buyerSelect = screen.getAllByRole('combobox').find(sel =>
      /Alice/.test(sel.innerHTML) && /Bob/.test(sel.innerHTML)
    );
    fireEvent.change(buyerSelect, { target: { value: 'Alice' } });
    await waitFor(() => {
  const rows = screen.getAllByTestId('order-row');
  expect(rows.length).toBeGreaterThanOrEqual(1);
  const combined = rows.map(r => r.textContent).join(' ');
  expect(combined).toMatch(/Widget A/);
  // Ensure Widget B line item removed (still may appear as option in select so anchor pattern with ×)
  expect(combined).not.toMatch(/Widget B\s+×/);
    });
  });

  test('filters by product', async () => {
    renderPage();
    await screen.findByText(/Orders for My Products/i);
    const productSelect = screen.getAllByRole('combobox').find(sel =>
      /Widget A/.test(sel.innerHTML) && /Widget B/.test(sel.innerHTML)
    );
    fireEvent.change(productSelect, { target: { value: 'Widget A' } });
    await waitFor(() => {
      // Row containing Widget B should disappear
      const rows = screen.getAllByTestId('order-row');
      const combined = rows.map(r => r.textContent).join(' ');
      expect(combined).toMatch(/Widget A/);
      expect(combined).not.toMatch(/Widget B\s+×/); // product line pattern
    });
  });

  test('updates order status via select change', async () => {
    renderPage();
    const statusSelect = await screen.findAllByTestId('status-select');
    fireEvent.change(statusSelect[0], { target: { value: 'shipped' } });
    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith('/api/orders/o1/status', { status: 'shipped' }, expect.any(Object));
    });
  });
});
