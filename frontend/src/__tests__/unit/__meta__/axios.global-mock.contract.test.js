import axios from 'axios';

describe('axios global mock contract', () => {
  test('methods exist and return Promises', async () => {
    expect(typeof axios.get).toBe('function');
    expect(typeof axios.post).toBe('function');
    expect(typeof axios.put).toBe('function');
    expect(typeof axios.patch).toBe('function');
    expect(typeof axios.delete).toBe('function');

    const r1 = axios.get('/any');
    expect(typeof r1.then).toBe('function');
    await expect(r1).resolves.toHaveProperty('data');

    await expect(axios.post('/x', {})).resolves.toHaveProperty('data');
  });

  test('provides safe defaults for common endpoints', async () => {
    const me = await axios.get('/api/auth/me');
    expect(me).toEqual(expect.objectContaining({ data: expect.any(Object) }));

    const products = await axios.get('/api/products');
    expect(products).toEqual(expect.objectContaining({ data: expect.any(Array) }));
  });

  test('allows per-test overrides without interference', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({ data: { email: 't@e.st', roles: ['customer'] } });
      }
      return Promise.resolve({ data: {} });
    });

    await expect(axios.get('/api/auth/me')).resolves.toEqual({ data: { email: 't@e.st', roles: ['customer'] } });
  });
});
