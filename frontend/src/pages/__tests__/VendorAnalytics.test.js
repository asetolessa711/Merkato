// Mock ResizeObserver for recharts
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { MessageContext } from '../../context/MessageContext';
import VendorAnalytics from '../VendorAnalytics';
import { MemoryRouter } from 'react-router-dom';

jest.mock('axios');

const mockShowMessage = jest.fn();
const renderWithContext = (ui) =>
  render(
    <MemoryRouter>
      <MessageContext.Provider value={{ showMessage: mockShowMessage }}>
        {ui}
      </MessageContext.Provider>
    </MemoryRouter>
  );

describe('VendorAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('shows analytics data on load', async () => {
    axios.get.mockResolvedValueOnce({ data: { sales: 1000, orders: 50, revenue: 1000, itemsSold: 50, uniqueCustomers: 10, topProducts: [], topCustomers: [] } });
    renderWithContext(<VendorAnalytics />);
    // Wait for dashboard to load
    await screen.findByText(/Vendor Dashboard/i);
    // Check for revenue, items sold, orders, unique customers
    expect(screen.getByText(/Total Revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/Items Sold/i)).toBeInTheDocument();
    expect(screen.getByText(/Orders/i)).toBeInTheDocument();
    expect(screen.getByText(/Unique Customers/i)).toBeInTheDocument();
  });

  it('shows error if analytics load fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<VendorAnalytics />);
    await waitFor(() => {
      // Accept any of the error messages that may be shown
      expect(mockShowMessage).toHaveBeenCalledWith(expect.stringMatching(/Failed to load (analytics|chart data|top metrics)/i), 'error');
    });
  });

  it('shows success on CSV export', async () => {
    axios.get.mockResolvedValueOnce({ data: { sales: 1000, orders: 50 } });
    axios.get.mockResolvedValueOnce({ data: { sales: 1000, orders: 50, revenue: 1000, itemsSold: 50, uniqueCustomers: 10, topProducts: [], topCustomers: [] } });
    axios.get.mockResolvedValueOnce({ data: 'csv-content' });
    renderWithContext(<VendorAnalytics />);
    await screen.findByText(/Vendor Dashboard/i);
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('CSV exported successfully', 'success');
    });
  });

  it('shows error on CSV export failure', async () => {
    axios.get.mockResolvedValueOnce({ data: { sales: 1000, orders: 50 } });
    axios.get.mockResolvedValueOnce({ data: { sales: 1000, orders: 50, revenue: 1000, itemsSold: 50, uniqueCustomers: 10, topProducts: [], topCustomers: [] } });
    axios.get.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<VendorAnalytics />);
    await screen.findByText(/Vendor Dashboard/i);
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to export CSV', 'error');
    });
  });
});
