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
  // Select order checkboxes only
  const orderCheckboxes1 = await screen.findAllByTestId('order-checkbox');
  orderCheckboxes1.forEach(box => fireEvent.click(box));
  // Wait for toolbar button to appear
  const markAsShippedBtn1 = await screen.findByTestId('bulk-action-mark-shipped');
  fireEvent.click(markAsShippedBtn1);
    // Wait for dialog to appear before clicking Confirm
    const dialog = await screen.findByTestId('bulk-preview-header');
    expect(dialog).toBeInTheDocument();
    // Click the confirm button in the status preview dialog
    const statusConfirmBtn = await screen.findByRole('button', { name: /^Confirm$/ });
    fireEvent.click(statusConfirmBtn);
    // Wait for the summary dialog to appear and check content (ensure we pick the visible one)
    try {
      await waitFor(() => {
        const dialogs = screen.getAllByTestId('bulk-summary-dialog');
        const visible = dialogs.find(d => d.style.display !== 'none');
        expect(visible).toBeTruthy();
        expect(within(visible).getByText('Success:')).toBeInTheDocument();
        expect(within(visible).getByText('2')).toBeInTheDocument();
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
  const orderCheckboxes2 = await screen.findAllByTestId('order-checkbox');
  orderCheckboxes2.forEach(box => fireEvent.click(box));
  const exportBtn = await screen.findByTestId('bulk-action-export');
  fireEvent.click(exportBtn);
    const dialog = await screen.findByTestId('bulk-preview-header');
    expect(dialog).toBeInTheDocument();
  // Click the preview Confirm first to mirror UI flow
  const previewConfirms = await screen.findAllByRole('button', { name: /^Confirm$/ });
  fireEvent.click(previewConfirms[0]);
  // Then click the final confirm button to proceed to summary
  const exportConfirmBtn2 = await screen.findByTestId('bulk-export-confirm');
  fireEvent.click(exportConfirmBtn2);
    // Wait for the summary dialog to appear and check content (select visible)
  await waitFor(() => {
      const dialogs = screen.getAllByTestId('bulk-summary-dialog');
      const visible = dialogs.find(d => d.style.display !== 'none');
      expect(visible).toBeTruthy();
      expect(within(visible).getByText('Success:')).toBeInTheDocument();
      expect(within(visible).getByText('1')).toBeInTheDocument();
  }, { timeout: 3000 });
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
  const orderCheckboxes3 = await screen.findAllByTestId('order-checkbox');
  orderCheckboxes3.forEach(box => fireEvent.click(box));
  const resendEmailsBtn = await screen.findByTestId('bulk-action-resend-emails');
  fireEvent.click(resendEmailsBtn);
    const dialog = await screen.findByTestId('bulk-preview-header');
    expect(dialog).toBeInTheDocument();
  // Click the preview Confirm first to keep dialog open, then finalize
  const emailPreviewConfirm = await screen.findByTestId('bulk-email-preview-confirm');
  fireEvent.click(emailPreviewConfirm);
  const resendConfirmBtn = await screen.findByRole('button', { name: /Confirm & Resend/i });
  fireEvent.click(resendConfirmBtn);
    // Wait for the summary dialog to appear and check content (select visible)
  await waitFor(() => {
      const dialogs = screen.getAllByTestId('bulk-summary-dialog');
      const visible = dialogs.find(d => d.style.display !== 'none');
      expect(visible).toBeTruthy();
      expect(within(visible).getByText('Success:')).toBeInTheDocument();
      expect(within(visible).getByText('1')).toBeInTheDocument();
  }, { timeout: 3000 });
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
  const orderCheckboxes4 = await screen.findAllByTestId('order-checkbox');
  orderCheckboxes4.forEach(box => fireEvent.click(box));
  const scheduleExportBtn = await screen.findByTestId('bulk-action-schedule-export');
  fireEvent.click(scheduleExportBtn);
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
  const orderCheckboxes5 = await screen.findAllByTestId('order-checkbox');
  orderCheckboxes5.forEach(box => fireEvent.click(box));
  const markAsShippedBtn = await screen.findByTestId('bulk-action-mark-shipped');
  fireEvent.click(markAsShippedBtn);
    const dialog = await screen.findByTestId('bulk-preview-header');
    expect(dialog).toBeInTheDocument();
    const confirmBtns = await screen.findAllByRole('button', { name: /confirm/i });
    fireEvent.click(confirmBtns[0]);
    // Wait for the summary dialog to appear (select visible)
    await waitFor(() => {
      const dialogs = screen.getAllByTestId('bulk-summary-dialog');
      const visible = dialogs.find(d => d.style.display !== 'none');
      expect(visible).toBeTruthy();
    });
    // Find all Undo buttons and click the first visible one
    const undoButtons = await screen.findAllByRole('button', { name: /^Undo$/ });
    expect(undoButtons.length).toBeGreaterThan(0);
    fireEvent.click(undoButtons[0]);
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Undo$/ })).not.toBeInTheDocument());
  });
});
