import axios from 'axios';
import { syncCart, mergeCartOnLogin } from '../../../utils/cartClient'';

describe('cartClient', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('syncCart transforms items and includes anonymousId; token optional', async () => {
    axios.put.mockResolvedValueOnce({ data: {} });
    const items = [{ _id: 'p1', quantity: 2 }, { id: 'p2' }];
    await syncCart(items, 'tok');
    expect(axios.put).toHaveBeenCalled();
    const [url, body, config] = axios.put.mock.calls[0];
    expect(url).toBe('/api/cart');
    expect(body.items).toEqual([
      { product: 'p1', quantity: 2 },
      { product: 'p2', quantity: 1 },
    ]);
    expect(body.anonymousId).toBeTruthy();
    expect(config.headers.Authorization).toBe('Bearer tok');
  });

  test('mergeCartOnLogin posts merge with token', async () => {
    axios.post.mockResolvedValueOnce({ data: {} });
    await mergeCartOnLogin('tok');
    expect(axios.post).toHaveBeenCalledWith(
      '/api/cart/merge',
      expect.objectContaining({ anonymousId: expect.any(String) }),
      { headers: { Authorization: 'Bearer tok' } }
    );
  });
});
