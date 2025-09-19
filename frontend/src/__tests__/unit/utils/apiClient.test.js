import axios from 'axios';

describe('apiClient', () => {
  beforeEach(() => {
    localStorage.clear();
    axios.get.mockReset?.();
    axios.post.mockReset?.();
    axios.put.mockReset?.();
    axios.delete.mockReset?.();
  });

  test('attaches Authorization header when token present', async () => {
    localStorage.setItem('token', 'abc');
    // Re-require apiClient to register interceptors freshly in this isolated module context
    jest.isolateModules(() => {
      require('../../../utils/apiClient');
    });
    const reqUse = axios.interceptors?.request?.use;
    expect(reqUse).toBeDefined();
    expect(reqUse).toHaveBeenCalled();
    const [[handler]] = reqUse.mock.calls;
    const cfg = await handler({ headers: {} });
    expect(cfg.headers.Authorization).toBe('Bearer abc');
  });

  test('rejects with normalized message', async () => {
    jest.isolateModules(() => {
      require('../../../utils/apiClient');
    });
    const resUse = axios.interceptors?.response?.use;
    expect(resUse).toBeDefined();
    expect(resUse).toHaveBeenCalled();
    const [[, errorHandler]] = resUse.mock.calls;
    const err = { response: { data: { message: 'Nope' } } };
    await expect(errorHandler(err)).rejects.toMatchObject({ message: 'Nope' });
  });
});
