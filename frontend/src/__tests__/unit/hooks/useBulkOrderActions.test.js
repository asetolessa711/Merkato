import { renderHook, act } from '@testing-library/react';
import axios from 'axios';
import { useBulkOrderActions } from '../../../hooks/useBulkOrderActions';

const orders = [
  { _id: 'o1', buyer: { name: 'Alice' }, status: 'PLACED' },
  { _id: 'o2', buyer: { name: 'Bob' }, status: 'PLACED' },
];

describe('useBulkOrderActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('happy path: resend emails sets summary and toast', async () => {
    axios.post.mockResolvedValueOnce({ data: { failed: ['o2'] } });
    const { result } = renderHook(() =>
      useBulkOrderActions({ orders, emailTemplate: 'Hi {{buyer}} for {{orderId}} status {{status}}', headers: {}, BULK_ACTION_LIMIT: 100 })
    );

    act(() => {
      result.current.handleBulkResendEmails(['o1', 'o2']);
    });

    await act(async () => {
      await result.current.confirmBulkResendEmails();
      await result.current.handleConfirmResendEmails();
    });

    expect(result.current.bulkSummary.success).toEqual(['o1']);
    expect(result.current.bulkSummary.failed).toEqual(['o2']);
    expect(result.current.showBulkSummary).toBe(true);
  });

  test('fail path: network error marks all failed and shows summary', async () => {
    axios.post.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() =>
      useBulkOrderActions({ orders, emailTemplate: 'T', headers: {}, BULK_ACTION_LIMIT: 100 })
    );

    act(() => {
      result.current.handleBulkResendEmails(['o1', 'o2']);
    });

    await act(async () => {
      await result.current.confirmBulkResendEmails();
      await result.current.handleConfirmResendEmails();
    });

    expect(result.current.bulkSummary.success).toEqual([]);
    expect(result.current.bulkSummary.failed).toEqual(['o1', 'o2']);
    expect(result.current.showBulkSummary).toBe(true);
  });
});
