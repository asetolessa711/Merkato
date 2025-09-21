import React from 'react';
import { renderHook, act } from '@testing-library/react';
import axios from 'axios';
import { useBulkActions } from '../../../hooks/useBulkActions';

function setup({ orders, selected }) {
  const state = {
    orders,
    selectedOrders: selected,
    bulkActionHistory: [],
    bulkSummary: null,
    bulkErrors: [],
    bulkProgress: null,
    showToast: false,
    toastMsg: '',
    undoBulk: null,
  };
  const setters = {
    setOrders: (updater) => { state.orders = typeof updater === 'function' ? updater(state.orders) : updater; },
    setBulkActionHistory: (updater) => { state.bulkActionHistory = typeof updater === 'function' ? updater(state.bulkActionHistory) : updater; },
    setBulkSummary: (v) => { state.bulkSummary = v; },
    setBulkErrors: (v) => { state.bulkErrors = v; },
    setBulkProgress: (v) => { state.bulkProgress = v; },
    setShowToast: (v) => { state.showToast = v; },
    setToastMsg: (v) => { state.toastMsg = v; },
    setUndoBulk: (v) => { state.undoBulk = v; },
  };

  const wrapper = ({ children }) => children;
  const { result } = renderHook(() => useBulkActions({
    orders: state.orders,
    selectedOrders: state.selectedOrders,
    headers: {},
    emailTemplate: 'orderShipped',
    ...setters,
  }), { wrapper });

  return { result, state };
}

describe('useBulkActions', () => {
  beforeEach(() => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    axios.post.mockReset?.();
  });

  test('bulk status change 200 → optimistic update then summary', async () => {
    const o1 = { _id: '1', status: 'pending' };
    const o2 = { _id: '2', status: 'pending' };
    const { result, state } = setup({ orders: [o1, o2], selected: ['1', '2'] });
    axios.post.mockResolvedValueOnce({ data: { failed: [] } });

    await act(async () => {
      await result.current.handleBulkStatusChange('shipped');
    });

    expect(state.orders.map(o => o.status)).toEqual(['shipped', 'shipped']);
    expect(state.bulkSummary.success).toEqual(['1', '2']);
    expect(state.bulkErrors).toEqual([]);
    expect(state.showToast).toBe(true);
  });

  test('bulk status change 500 → error summary and rollback list', async () => {
    const o1 = { _id: '1', status: 'pending' };
    const o2 = { _id: '2', status: 'pending' };
    const { result, state } = setup({ orders: [o1, o2], selected: ['1', '2'] });
    axios.post.mockRejectedValueOnce(new Error('server oops'));

    await act(async () => {
      await result.current.handleBulkStatusChange('shipped');
    });

    expect(state.bulkSummary.failed).toEqual(['1', '2']);
    expect(state.toastMsg).toMatch(/failed/i);
  });
});
