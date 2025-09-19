import React, { useEffect } from 'react';
import { render, screen, act } from '@testing-library/react';
import axios from 'axios';
import useApi from '../../../hooks/useApi';

function Harness() {
  const api = useApi();
  useEffect(() => {
    // expose for tests
    // eslint-disable-next-line no-undef
    window.__api = api;
  }, [api]);
  return (
    <div>
      <span data-testid="loading">{api.loading ? 'loading' : 'idle'}</span>
      {api.error ? <span data-testid="error">{api.error}</span> : null}
    </div>
  );
}

describe('useApi', () => {
  beforeEach(() => {
    // reset mocks and globals
    // eslint-disable-next-line no-undef
    delete window.__api;
  });

  test('get: success sets loading then returns data', async () => {
    axios.get.mockResolvedValueOnce({ data: { ok: true } });
    render(<Harness />);
    expect(screen.getByTestId('loading').textContent).toBe('idle');

    await act(async () => {
      const result = await window.__api.get('/test');
      expect(result).toEqual({ ok: true });
    });

    expect(screen.getByTestId('loading').textContent).toBe('idle');
    expect(screen.queryByTestId('error')).toBeNull();
  });

  test('post: failure surfaces error and throws', async () => {
    const err = Object.assign(new Error('Boom'), { response: { data: { message: 'Server oops' } } });
    axios.post.mockRejectedValueOnce(err);
    render(<Harness />);

    await expect(window.__api.post('/test', { a: 1 })).rejects.toBeDefined();

    // error message comes from error.message (mapped by apiClient)
    // Our hook sets error to e.message OR default
    // Given our mock, react component shows text
    const errNode = await screen.findByTestId('error');
    expect(errNode.textContent).toBe('Boom');
  });
});
