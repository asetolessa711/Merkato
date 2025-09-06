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
      {React.cloneElement(ui, { showMessage: mockShowMessage })}
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
    // Start with a failed emailLog so the button is visible
    const order = {
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
    };
    axios.get.mockResolvedValueOnce({ data: { orders: [order] }});
    axios.post.mockResolvedValueOnce({});
    renderWithContext(<AdminOrders />);
    // Find the resend button
    const resendBtn = await screen.findByRole('button', { name: /resend invoice/i });
    fireEvent.click(resendBtn);
    // Simulate the order's emailLog.status being updated to 'sent' after resend
    order.emailLog.status = 'sent';
    axios.get.mockResolvedValueOnce({ data: { orders: [order] }});
    // Optionally, re-render if your component fetches again, or just check the message
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Invoice resent successfully.', 'success');
    });
  });

  it('shows error message when invoice resend fails', async () => {
    const order = {
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
    };
    axios.get.mockResolvedValueOnce({ data: { orders: [JSON.parse(JSON.stringify(order))] }});
    axios.post.mockRejectedValueOnce(new Error('fail'));
    // After POST failure, GET should still return the order with status 'failed'
    axios.get.mockResolvedValue({ data: { orders: [JSON.parse(JSON.stringify(order))] }});
    renderWithContext(<AdminOrders initialOrders={[order]} />);
    // Wait for the order to appear before searching for the button
    await screen.findByText((content, node) => {
      return node.tagName.toLowerCase() === 'strong' && content.match(/Order ID:/);
    });
    // Click the resend button as soon as it appears (status is 'failed' at initial render)
    const resendBtn = await screen.findByRole('button', { name: /resend invoice/i });
    fireEvent.click(resendBtn);
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to resend invoice.', 'error');
    });
  });

  it('performs bulk status change with confirmation dialog', async () => {
    const orders = [
      {
        _id: '1', buyer: { name: 'Test', email: 'test@test.com' }, status: 'pending', currency: 'USD', total: 10,
        products: [{ product: { name: 'Widget' }, quantity: 1 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date(), emailLog: {}
      },
      {
        _id: '2', buyer: { name: 'Test2', email: 'test2@test.com' }, status: 'pending', currency: 'USD', total: 20,
        products: [{ product: { name: 'Gadget' }, quantity: 2 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date(), emailLog: {}
      }
    ];
    // Inject test orders directly for reliable rendering
    axios.post.mockResolvedValueOnce({ data: { failed: [] } });
    renderWithContext(<AdminOrders initialOrders={orders} />);
    // Select both orders
    const checkboxes = await screen.findAllByRole('checkbox');
    checkboxes.forEach(box => fireEvent.click(box));
    // Click bulk shipped
    fireEvent.click(screen.getByText('Mark as Shipped'));
    // Wait for dialog to appear before clicking Confirm
    const dialog = await screen.findByTestId('bulk-preview-header');
    expect(dialog).toBeInTheDocument();
    const confirmBtns = await screen.findAllByRole('button', { name: /confirm/i });
    // Click the first visible Confirm button
    fireEvent.click(confirmBtns[0]);
    // Wait for the summary dialog to appear and check content
    try {
      await waitFor(() => {
        const summaryDialog = screen.getByTestId('bulk-summary-dialog');
        expect(summaryDialog).toBeInTheDocument();
        expect(within(summaryDialog).getByText('Success:')).toBeInTheDocument();
        expect(within(summaryDialog).getByText('2')).toBeInTheDocument();
      }, { timeout: 3000 });
    } catch (e) {
      // Print the DOM for debugging if the dialog is not found
      // eslint-disable-next-line no-console
      console.log('DEBUG DOM:', document.body.innerHTML);
      throw e;
    }
  });

  it('performs bulk export with confirmation dialog', async () => {
    const orders = [
      {
        _id: '1', buyer: { name: 'Test', email: 'test@test.com' }, status: 'pending', currency: 'USD', total: 10,
        products: [{ product: { name: 'Widget' }, quantity: 1 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date(), emailLog: {}
      }
    ];
    // Inject test orders directly for reliable rendering
    axios.post.mockResolvedValueOnce({ data: 'csvdata' });
    renderWithContext(<AdminOrders initialOrders={orders} />);
    const checkboxes = await screen.findAllByRole('checkbox');
    checkboxes.forEach(box => fireEvent.click(box));
    fireEvent.click(screen.getByText('Export Selected'));
    const dialog = await screen.findByTestId('bulk-preview-header');
    expect(dialog).toBeInTheDocument();
  // Click the finalizing Confirm & Export button (not the preview Confirm)
  const finalizeExportBtn = await screen.findByRole('button', { name: /confirm \& export/i });
  fireEvent.click(finalizeExportBtn);
    // Wait for the summary dialog to appear and check content
    await waitFor(() => {
      const summaryDialog = screen.getByTestId('bulk-summary-dialog');
      expect(summaryDialog).toBeInTheDocument();
      expect(within(summaryDialog).getByText('Success:')).toBeInTheDocument();
      expect(within(summaryDialog).getByText('1')).toBeInTheDocument();
    });
  });

  it('shows bulk email preview and performs resend', async () => {
    const orders = [
      {
        _id: '1', buyer: { name: 'Test', email: 'test@test.com' }, status: 'pending', currency: 'USD', total: 10,
        products: [{ product: { name: 'Widget' }, quantity: 1 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date(), emailLog: {}
      }
    ];
    // Inject test orders directly for reliable rendering
    axios.post.mockResolvedValueOnce({ data: { failed: [] } });
    renderWithContext(<AdminOrders initialOrders={orders} />);
    const checkboxes = await screen.findAllByRole('checkbox');
    checkboxes.forEach(box => fireEvent.click(box));
    fireEvent.click(screen.getByText('Resend Emails'));
    const dialog = await screen.findByTestId('bulk-preview-header');
    expect(dialog).toBeInTheDocument();
  // Click the finalizing Confirm & Resend button (not the preview Confirm)
  const finalizeResendBtn = await screen.findByRole('button', { name: /confirm \& resend/i });
  fireEvent.click(finalizeResendBtn);
    // Wait for the summary dialog to appear and check content
    await waitFor(() => {
      const summaryDialog = screen.getByTestId('bulk-summary-dialog');
      expect(summaryDialog).toBeInTheDocument();
      expect(within(summaryDialog).getByText('Success:')).toBeInTheDocument();
      expect(within(summaryDialog).getByText('1')).toBeInTheDocument();
    });
  });

  it('schedules a bulk action', async () => {
    const orders = [
      {
        _id: '1', buyer: { name: 'Test', email: 'test@test.com' }, status: 'pending', currency: 'USD', total: 10,
        products: [{ product: { name: 'Widget' }, quantity: 1 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date(), emailLog: {}
      }
    ];
    // Inject test orders directly for reliable rendering
    renderWithContext(<AdminOrders initialOrders={orders} />);
    const checkboxes = await screen.findAllByRole('checkbox');
    checkboxes.forEach(box => fireEvent.click(box));
    fireEvent.click(screen.getByText('Schedule Export'));
    const dialog = await screen.findByTestId('schedule-bulk-action-header');
    expect(dialog).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Schedule for:'), { target: { value: '2025-08-06T12:00' } });
    const confirmBtns = await screen.findAllByRole('button', { name: /confirm/i });
    fireEvent.click(confirmBtns[0]);
    // Wait for the summary dialog to appear
    const summaryDialog = await screen.findByTestId('bulk-summary-dialog');
    expect(summaryDialog).toBeInTheDocument();
  });

  it('undoes a bulk status change', async () => {
    const orders = [
      {
        _id: '1', buyer: { name: 'Test', email: 'test@test.com' }, status: 'pending', currency: 'USD', total: 10,
        products: [{ product: { name: 'Widget' }, quantity: 1 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date(), emailLog: {}
      }
    ];
    // Inject test orders directly for reliable rendering
    axios.post.mockResolvedValueOnce({ data: { failed: [] } });
    renderWithContext(<AdminOrders initialOrders={orders} />);
    const checkboxes = await screen.findAllByRole('checkbox');
    checkboxes.forEach(box => fireEvent.click(box));
    fireEvent.click(screen.getByText('Mark as Shipped'));
    const dialog = await screen.findByTestId('bulk-preview-header');
    expect(dialog).toBeInTheDocument();
    const confirmBtns = await screen.findAllByRole('button', { name: /confirm/i });
    fireEvent.click(confirmBtns[0]);
    // Wait for the summary dialog to appear
    await waitFor(() => {
      const summaryDialog = screen.getByTestId('bulk-summary-dialog');
      expect(summaryDialog).toBeInTheDocument();
    });
    // Find all Undo buttons and click the first visible one
    const undoButtons = await screen.findAllByRole('button', { name: /^Undo$/ });
    expect(undoButtons.length).toBeGreaterThan(0);
    fireEvent.click(undoButtons[0]);
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Undo$/ })).not.toBeInTheDocument());
  });
});
