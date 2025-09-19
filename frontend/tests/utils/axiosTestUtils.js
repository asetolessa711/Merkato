// Convenience helpers to set axios responses in tests
import axios from 'axios';

export function mockUserRole(role = 'customer', name = 'Test User') {
  axios.get.mockImplementation((url) => {
    if (url === '/api/auth/me') return Promise.resolve({ data: { email: 'test@example.com', name, roles: [role] } });
    if (url === '/api/products') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: {} });
  });
}

export function mockAxiosSequence(sequence = []) {
  // sequence: array of { method: 'get'|'post'|..., value: resolvedValue or error, reject?: true }
  sequence.forEach((step) => {
    const { method = 'get', value, reject } = step;
    const fn = axios[method];
    if (!fn || typeof fn.mockResolvedValueOnce !== 'function') return;
    if (reject) fn.mockRejectedValueOnce(value instanceof Error ? value : new Error(String(value)));
    else fn.mockResolvedValueOnce(value);
  });
}
