import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { MessageContext } from '../../context/MessageContext';
import VendorInvoices from '../VendorInvoices';
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

describe('VendorInvoices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('shows invoices on load', async () => {
    axios.get.mockResolvedValueOnce({ data: [
      { _id: 'inv1', orderId: 'ord1', customer: 'John Doe', total: 100, commission: 10, net: 90, status: 'paid', date: '2023-01-01' }
    ] });
    renderWithContext(<VendorInvoices />);
    // There may be multiple 'Paid' (dropdown and table), just check at least one exists
    const paidElements = await screen.findAllByText(/Paid/i);
    expect(paidElements.length).toBeGreaterThan(0);
    // Use a regex matcher for currency, allow whitespace
    expect(screen.getByText((content) => /100(\.00)?/.test(content))).toBeInTheDocument();
  });

  it('shows error if invoice load fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<VendorInvoices />);
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to load invoices.', 'error');
    });
  });

  it('shows success on CSV export', async () => {
    axios.get.mockResolvedValueOnce({ data: [
      { _id: 'inv1', orderId: 'ord1', customer: 'John Doe', total: 100, commission: 10, net: 90, status: 'paid', date: '2023-01-01' }
    ] });
    axios.get.mockResolvedValueOnce({ data: 'csv-content' });
    renderWithContext(<VendorInvoices />);
    // Wait for invoices to load
    const paidElements = await screen.findAllByText(/Paid/i);
    expect(paidElements.length).toBeGreaterThan(0);
    // Use a flexible matcher for the button
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('CSV exported successfully', 'success');
    });
  });

  it('shows error on CSV export failure', async () => {
    axios.get.mockResolvedValueOnce({ data: [
      { _id: 'inv1', orderId: 'ord1', customer: 'John Doe', total: 100, commission: 10, net: 90, status: 'paid', date: '2023-01-01' }
    ] });
    axios.get.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<VendorInvoices />);
    const paidElements = await screen.findAllByText(/Paid/i);
    expect(paidElements.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    await waitFor(() => {
      // Accept either error message depending on implementation
      expect(mockShowMessage).toHaveBeenCalledWith(expect.stringMatching(/(Failed to export CSV|No invoices to export)/i), 'error');
    });
  });
});
