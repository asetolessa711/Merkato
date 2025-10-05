import axios from 'axios';
import {
  getVendorProducts,
  getVendorRevenue,
  getMyVendorProfile,
  getVendorProfileById,
  getVendorProductsById,
  getVendorCustomization,
} from '../../../api/vendor'';

jest.mock('axios');

describe('vendor api', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('getVendorProducts calls /api/vendor/products', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ _id: '1' }] });
    const data = await getVendorProducts();
    expect(axios.get).toHaveBeenCalledWith('/api/vendor/products');
    expect(data).toEqual([{ _id: '1' }]);
  });

  it('getVendorRevenue calls /api/vendor/revenue', async () => {
    axios.get.mockResolvedValueOnce({ data: { totalRevenue: 10 } });
    const data = await getVendorRevenue();
    expect(axios.get).toHaveBeenCalledWith('/api/vendor/revenue');
    expect(data).toEqual({ totalRevenue: 10 });
  });

  it('getMyVendorProfile calls /api/vendor/profile/me', async () => {
    axios.get.mockResolvedValueOnce({ data: { name: 'Tom' } });
    const data = await getMyVendorProfile();
    expect(axios.get).toHaveBeenCalledWith('/api/vendor/profile/me');
    expect(data).toEqual({ name: 'Tom' });
  });

  it('getVendorProfileById calls /api/vendor/profile/:id', async () => {
    axios.get.mockResolvedValueOnce({ data: { id: 'v1' } });
    const data = await getVendorProfileById('v1');
    expect(axios.get).toHaveBeenCalledWith('/api/vendor/profile/v1');
    expect(data).toEqual({ id: 'v1' });
  });

  it('getVendorProductsById calls /api/products/vendor/:id', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ _id: 'p' }] });
    const data = await getVendorProductsById('v2');
    expect(axios.get).toHaveBeenCalledWith('/api/products/vendor/v2');
    expect(data).toEqual([{ _id: 'p' }]);
  });

  it('getVendorCustomization calls /api/vendor/customization/:id', async () => {
    axios.get.mockResolvedValueOnce({ data: { theme: 'mint' } });
    const data = await getVendorCustomization('v3');
    expect(axios.get).toHaveBeenCalledWith('/api/vendor/customization/v3');
    expect(data).toEqual({ theme: 'mint' });
  });
});
