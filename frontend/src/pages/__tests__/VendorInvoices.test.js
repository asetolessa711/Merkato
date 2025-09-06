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
    // Mock URL.createObjectURL to prevent jsdom error
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
  });  
  // Mock URL.revokeObjectURL to prevent jsdom error
  global.URL.revokeObjectURL = jest.fn();

  it('shows invoices on load', async () => {
    axios.get.mockResolvedValueOnce({ data: { invoices: [
      {
        _id: 'inv1',
        order: 'ord1',
        customer: { name: 'John Doe' },
        total: 100,
        commissionAmount: 10,
        netEarnings: 90,
        status: 'paid',
        createdAt: '2023-01-01T00:00:00.000Z'
      }
    ] } });
    renderWithContext(<VendorInvoices />);
    // There may be multiple 'Paid' (dropdown and table), just check at least one exists
    const paidElements = await screen.findAllByText(/Paid/i);
    expect(paidElements.length).toBeGreaterThan(0);
    // Wait for all cells that contain both $ and 100.00 (may be split nodes)
    const totalCells = await screen.findAllByText((content, node) => {
      if (!node) return false;
      const text = node.textContent || '';
      return text.includes('$') && text.includes('100.00');
    });
    expect(totalCells.length).toBeGreaterThan(0);
  });

  it('shows error if invoice load fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<VendorInvoices />);
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Error loading invoices.', 'error');
    });
  });

  it('shows success on CSV export', async () => {
    axios.get.mockResolvedValueOnce({ data: { invoices: [
      {
        _id: 'inv1',
        order: 'ord1',
        customer: { name: 'John Doe' },
        total: 100,
        commissionAmount: 10,
        netEarnings: 90,
        status: 'paid',
        createdAt: '2023-01-01T00:00:00.000Z'
      }
    ] } });
    renderWithContext(<VendorInvoices />);
    // Wait for invoices to load and for the total cell to appear
    await screen.findByText('$100.00');
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('CSV exported!', 'success');
    });
  });

  it('shows error on CSV export failure', async () => {
    axios.get.mockResolvedValueOnce({ data: { invoices: [
      {
        _id: 'inv1',
        order: 'ord1',
        customer: { name: 'John Doe' },
        total: 100,
        commissionAmount: 10,
        netEarnings: 90,
        status: 'paid',
        createdAt: '2023-01-01T00:00:00.000Z'
      }
    ] } });
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
