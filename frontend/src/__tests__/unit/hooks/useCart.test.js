import React from 'react';
import { renderHook, act } from '@testing-library/react';
import useCart from '../../../hooks/useCart';
import * as cartStorage from '../../../utils/cartStorage';

describe('useCart', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(cartStorage, 'loadCart');
    jest.spyOn(cartStorage, 'saveCart');
    jest.spyOn(cartStorage, 'clearCart');
    cartStorage.loadCart.mockReturnValue({ items: [], timestamp: 0 });
    cartStorage.saveCart.mockImplementation(() => {});
    cartStorage.clearCart.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('add -> inc -> dec -> remove updates totals', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.add({ id: 'a', name: 'A', price: 5 }); // qty 1
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(5);

    act(() => {
      result.current.inc('a');
    });
    expect(result.current.total).toBe(10);

    act(() => {
      result.current.dec('a');
    });
    expect(result.current.total).toBe(5);

    act(() => {
      result.current.remove('a');
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  test('load from corrupt localStorage JSON falls back to empty', () => {
    cartStorage.loadCart.mockImplementation(() => { throw new Error('bad json'); });
    const { result } = renderHook(() => useCart());
    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  test('localStorage.setItem throws (quota) -> hook safe, still renders', () => {
    cartStorage.saveCart.mockImplementation(() => { throw Object.assign(new Error('quota'), { code: 22 }); });
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.add({ id: 'q', price: 2 });
    });
    // State still updated in-memory
    expect(result.current.items.find(i => i.id === 'q')).toBeTruthy();
  });

  test('clear() empties and persists', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.add({ id: 'z', price: 3 }); });
    expect(result.current.items).toHaveLength(1);
    act(() => { result.current.clear(); });
    expect(result.current.items).toHaveLength(0);
    expect(cartStorage.clearCart).toHaveBeenCalled();
  });
});
