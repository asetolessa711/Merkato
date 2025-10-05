import { renderHook, act } from '@testing-library/react';
import axios from 'axios';
import { useVendorDashboardData, useVendorStorefront } from '../../../hooks/useVendor'';

jest.mock('axios');

describe('useVendor hooks', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('useVendorDashboardData returns mock data when useMock=true', async () => {
    const { result } = renderHook(() => useVendorDashboardData({ useMock: true }));
    // advance the setTimeout used in mock path
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.products.length).toBeGreaterThan(0);
    expect(result.current.analytics).toBeTruthy();
    expect(result.current.profile).toBeTruthy();
  });

  it('useVendorStorefront surfaces error on axios failure', async () => {
    axios.get.mockRejectedValueOnce(new Error('fail'));
    // For three parallel calls, reject first and let others fallback
    axios.get.mockRejectedValueOnce(new Error('fail'));
    axios.get.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useVendorStorefront('v1'));
    // allow microtasks to flush
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.products).toEqual([]);
  });
});
