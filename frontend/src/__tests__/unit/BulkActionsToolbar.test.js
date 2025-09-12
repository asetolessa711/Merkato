import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BulkActionsToolbar from '../../components/BulkActionsToolbar';

describe('BulkActionsToolbar @trust-ui', () => {
  const baseProps = {
    selectedOrders: [{ _id: '1' }, { _id: '2' }],
    canBulkAction: true,
    isBulkLimitExceeded: false,
    selectAllOnPage: jest.fn(),
    selectAllMatching: jest.fn(),
    deselectAll: jest.fn(),
    handleBulkPreview: jest.fn(),
    handleScheduleBulkAction: jest.fn(),
    undoBulk: true,
    handleUndoBulk: jest.fn(),
    BULK_ACTION_LIMIT: 100
  };

  it('renders count and action buttons when orders selected', () => {
    render(<BulkActionsToolbar {...baseProps} />);
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-action-mark-shipped')).toBeEnabled();
  });

  it('hides when no selected orders', () => {
    const { container } = render(<BulkActionsToolbar {...baseProps} selectedOrders={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('disables buttons when limit exceeded and shows warning', () => {
    render(<BulkActionsToolbar {...baseProps} isBulkLimitExceeded selectedOrders={[...Array(101)].map((_,i)=>({_id:String(i)}))} />);
    expect(screen.getByText(/Bulk actions limited/)).toBeInTheDocument();
    expect(screen.getByTestId('bulk-action-mark-shipped')).toBeDisabled();
  });

  it('invokes preview handlers with correct action type', () => {
    render(<BulkActionsToolbar {...baseProps} />);
    fireEvent.click(screen.getByTestId('bulk-action-mark-shipped'));
    expect(baseProps.handleBulkPreview).toHaveBeenCalledWith('shipped');
  });

  it('undo button triggers handler when present', () => {
    render(<BulkActionsToolbar {...baseProps} undoBulk />);
    fireEvent.click(screen.getByTestId('undo-bulk-action'));
    expect(baseProps.handleUndoBulk).toHaveBeenCalled();
  });
});
