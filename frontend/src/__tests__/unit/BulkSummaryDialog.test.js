import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BulkSummaryDialog from '../../components/BulkSummaryDialog'';

describe('BulkSummaryDialog @trust-ui', () => {
  const summary = { success: ['1','2'], failed: ['3'], actionType: 'shipped' };
  const onClose = jest.fn();
  const onRetryStatus = jest.fn();
  const onRetryEmail = jest.fn();

  it('renders summary counts and lists', () => {
    render(<BulkSummaryDialog summary={summary} onClose={onClose} onRetryStatus={onRetryStatus} onRetryEmail={onRetryEmail} />);
    expect(screen.getByTestId('bulk-action-summary-header')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-summary-success-count').textContent).toBe('2');
    expect(screen.getByTestId('bulk-summary-failed-count').textContent).toBe('1');
    expect(screen.getByText(/Order ID: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Order ID: 3/)).toBeInTheDocument();
  });

  it('calls retry handlers', () => {
    render(<BulkSummaryDialog summary={summary} onClose={onClose} onRetryStatus={onRetryStatus} onRetryEmail={onRetryEmail} />);
    fireEvent.click(screen.getByText('Retry Status'));
    fireEvent.click(screen.getByText('Retry Email'));
    expect(onRetryStatus).toHaveBeenCalled();
    expect(onRetryEmail).toHaveBeenCalled();
  });

  it('calls onClose for both Confirm and Close', () => {
    render(<BulkSummaryDialog summary={summary} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('bulk-summary-confirm'));
    fireEvent.click(screen.getByTestId('bulk-summary-close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('returns null when no summary', () => {
    const { container } = render(<BulkSummaryDialog summary={null} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
  });
});
