import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { MessageContext } from '../../context/MessageContext';
import AdminOrders from '../../pages/AdminOrders';

jest.mock('axios');

const mockShowMessage = jest.fn();
const renderWithContext = (ui) =>
  render(
    <MessageContext.Provider value={{ showMessage: mockShowMessage }}>
      {ui}
    </MessageContext.Provider>
  );

describe('AdminOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    // Ensure no filters block the test order
    localStorage.setItem('adminRole', 'admin');
    // Set up default state for filters and pagination
    window.history.pushState({}, '', '/');
    // Mock window.confirm to always return true for bulk actions
    window.confirm = jest.fn(() => true);
  });

  it('shows success message when invoice is resent', async () => {
    axios.get.mockResolvedValueOnce({ data: { orders: [
      {
        _id: '1',
        buyer: { name: 'Test', email: 'test@test.com' },
        status: 'pending',
        currency: 'USD',
        total: 10,
        products: [{ product: { name: 'Widget' }, quantity: 1 }],
        shippingAddress: { country: 'USA', fullName: 'John Doe', city: 'New York' },
        updatedBy: { name: 'Admin' },
        updatedAt: new Date(),
        emailLog: { status: 'failed', to: 'test@test.com', error: 'Bounce', sentAt: new Date() }
      },
    ] }});
    axios.post.mockResolvedValueOnce({});
    renderWithContext(<AdminOrders />);
    fireEvent.click(await screen.findByRole('button', { name: /view details/i }));
    fireEvent.click(await screen.findByText('🔁 Resend Invoice'));
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Invoice resent successfully.', 'success');
    });
  });

  it('shows error message when invoice resend fails', async () => {
    axios.get.mockResolvedValueOnce({ data: { orders: [
      {
        _id: '1',
        buyer: { name: 'Test', email: 'test@test.com' },
        status: 'pending',
        currency: 'USD',
        total: 10,
        products: [{ product: { name: 'Widget' }, quantity: 1 }],
        shippingAddress: { country: 'USA', fullName: 'John Doe', city: 'New York' },
        updatedBy: { name: 'Admin' },
        updatedAt: new Date(),
        emailLog: { status: 'failed', to: 'test@test.com', error: 'Bounce', sentAt: new Date() }
      },
    ] }});
    axios.post.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<AdminOrders />);
    fireEvent.click(await screen.findByRole('button', { name: /view details/i }));
    fireEvent.click(await screen.findByText('🔁 Resend Invoice'));
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to resend invoice.', 'error');
    });
  });

  it('performs bulk status change with confirmation dialog', async () => {
    axios.get.mockResolvedValueOnce({ data: { orders: [
      {
        _id: '1', buyer: { name: 'Test', email: 'test@test.com' }, status: 'pending', currency: 'USD', total: 10,
        products: [{ product: { name: 'Widget' }, quantity: 1 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date(), emailLog: {}
      },
      {
        _id: '2', buyer: { name: 'Test2', email: 'test2@test.com' }, status: 'pending', currency: 'USD', total: 20,
        products: [{ product: { name: 'Gadget' }, quantity: 2 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date(), emailLog: {}
      }
    ] }});
    axios.post.mockResolvedValueOnce({ data: { failed: [] } });
    renderWithContext(<AdminOrders />);
    // Select both orders
    const checkboxes = await screen.findAllByRole('checkbox');
    checkboxes.forEach(box => fireEvent.click(box));
    // Click bulk shipped
    fireEvent.click(screen.getByText('Mark as Shipped'));
    // Confirm dialog
    fireEvent.click(screen.getByText('Confirm'));
    await waitFor(() => {
      expect(screen.getByText(/Bulk Action Summary/)).toBeInTheDocument();
      expect(screen.getByText(/Success:/)).toHaveTextContent('Success: 2');
    });
  });

  it('performs bulk export with confirmation dialog', async () => {
    axios.get.mockResolvedValueOnce({ data: { orders: [
      {
        _id: '1', buyer: { name: 'Test', email: 'test@test.com' }, status: 'pending', currency: 'USD', total: 10,
        products: [{ product: { name: 'Widget' }, quantity: 1 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date(), emailLog: {}
      }
    ] }});
    axios.post.mockResolvedValueOnce({ data: 'csvdata' });
    renderWithContext(<AdminOrders />);
    const checkboxes = await screen.findAllByRole('checkbox');
    checkboxes.forEach(box => fireEvent.click(box));
    fireEvent.click(screen.getByText('Export Selected'));
    await waitFor(() => expect(screen.getByTestId('bulk-preview-header')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Confirm'));
    // Flush pending promises and React state after dialog transition
    await waitFor(() => expect(screen.queryByTestId('bulk-preview-header')).not.toBeInTheDocument());
    await waitFor(async () => {
      // Wait for export dialog to appear
      expect(screen.getByTestId('bulk-export-header')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Confirm & Export'));
    await waitFor(() => expect(screen.getByText(/Bulk Action Summary/)).toBeInTheDocument());
    expect(screen.getByText(/Success:/)).toHaveTextContent('Success: 1');
  });

  it('shows bulk email preview and performs resend', async () => {
    axios.get.mockResolvedValueOnce({ data: { orders: [
      {
        _id: '1', buyer: { name: 'Test', email: 'test@test.com' }, status: 'pending', currency: 'USD', total: 10,
        products: [{ product: { name: 'Widget' }, quantity: 1 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date(), emailLog: {}
      }
    ] }});
    axios.post.mockResolvedValueOnce({ data: { failed: [] } });
    renderWithContext(<AdminOrders />);
    const checkboxes = await screen.findAllByRole('checkbox');
    checkboxes.forEach(box => fireEvent.click(box));
    fireEvent.click(screen.getByText('Resend Emails'));
    await waitFor(() => expect(screen.getByTestId('bulk-preview-header')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Confirm'));
    // Flush pending promises and React state after dialog transition
    await waitFor(() => expect(screen.queryByTestId('bulk-preview-header')).not.toBeInTheDocument());
    await waitFor(async () => {
      // Wait for email preview dialog to appear
      expect(screen.getByTestId('bulk-email-preview-header')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Confirm & Resend'));
    await waitFor(() => expect(screen.getByText(/Bulk Action Summary/)).toBeInTheDocument());
    expect(screen.getByText(/Success:/)).toHaveTextContent('Success: 1');
  });

  it('schedules a bulk action', async () => {
    axios.get.mockResolvedValueOnce({ data: { orders: [
      {
        _id: '1', buyer: { name: 'Test', email: 'test@test.com' }, status: 'pending', currency: 'USD', total: 10,
        products: [{ product: { name: 'Widget' }, quantity: 1 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date(), emailLog: {}
      }
    ] }});
    renderWithContext(<AdminOrders />);
    const checkboxes = await screen.findAllByRole('checkbox');
    checkboxes.forEach(box => fireEvent.click(box));
    fireEvent.click(screen.getByText('Schedule Export'));
    await waitFor(() => expect(screen.getByText(/Schedule Bulk Action/)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Schedule for:'), { target: { value: '2025-08-06T12:00' } });
    fireEvent.click(screen.getByText('Confirm'));
    await waitFor(() => {
      expect(screen.getByText(/Scheduled Bulk Actions/)).toBeInTheDocument();
    });
  });

  it('undoes a bulk status change', async () => {
    axios.get.mockResolvedValueOnce({ data: { orders: [
      {
        _id: '1', buyer: { name: 'Test', email: 'test@test.com' }, status: 'pending', currency: 'USD', total: 10,
        products: [{ product: { name: 'Widget' }, quantity: 1 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date(), emailLog: {}
      }
    ] }});
    axios.post.mockResolvedValueOnce({ data: { failed: [] } });
    renderWithContext(<AdminOrders />);
    const checkboxes = await screen.findAllByRole('checkbox');
    checkboxes.forEach(box => fireEvent.click(box));
    fireEvent.click(screen.getByText('Mark as Shipped'));
    fireEvent.click(await screen.findByText('Confirm'));
    // Find all Undo buttons and click the first visible one
    const undoButtons = await screen.findAllByRole('button', { name: /^Undo$/ });
    expect(undoButtons.length).toBeGreaterThan(0);
    fireEvent.click(undoButtons[0]);
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Undo$/ })).not.toBeInTheDocument());
  });
});
