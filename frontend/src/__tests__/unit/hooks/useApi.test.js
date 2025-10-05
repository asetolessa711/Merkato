import React, { useEffect } from 'react';
import { render, screen, act } from '@testing-library/react';
import axios from 'axios';
import useApi from '../../../hooks/useApi'';

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

  test('does not set state after unmount (no warnings)', async () => {
    // Create a promise we can control to resolve after unmount
    let resolveGet;
    const pending = new Promise((r) => { resolveGet = r; });
    axios.get.mockImplementationOnce(async () => {
      await pending; // wait until we resolve
      return { data: { ok: true } };
    });

    const { unmount } = render(<Harness />);

    // Kick off request, then unmount before it settles
    const run = window.__api.get('/slow');
    unmount();

    // Now resolve the request; with guards, no setState-on-unmounted warnings should occur
    await act(async () => {
      resolveGet();
      await run;
    });

    // Nothing to assert beyond absence of errors; if guards fail, RTL/React would warn.
  });

  test('clears previous error on next successful call and toggles loading', async () => {
    // First call fails -> sets error
    const err = new Error('First fail');
    // eslint-disable-next-line no-undef
    axios.get.mockRejectedValueOnce(err);
    render(<Harness />);

    // Kick failure
    await expect(window.__api.get('/fail')).rejects.toBeDefined();
    const errNode = await screen.findByTestId('error');
    expect(errNode.textContent).toBe('First fail');

    // Next call should remain pending briefly so we can observe 'loading'
    let resolveOk;
    const pendingOk = new Promise((r) => { resolveOk = r; });
    // eslint-disable-next-line no-undef
    axios.get.mockImplementationOnce(async () => { await pendingOk; return { data: { ok: true } }; });

  const p = window.__api.get('/ok');
  // Wait briefly for loading to flip true (state is set async)
  await screen.findByText('loading');

    await act(async () => {
      resolveOk();
      const result = await p;
      expect(result).toEqual({ ok: true });
    });

    // loading off, error cleared
    expect(screen.getByTestId('loading').textContent).toBe('idle');
    expect(screen.queryByTestId('error')).toBeNull();
  });

  test('sets default error message when error.message missing', async () => {
    // Construct an error-like object without message
    const bareErr = { response: { status: 500 }, isAxiosError: true };
    // eslint-disable-next-line no-undef
    axios.post.mockRejectedValueOnce(bareErr);
    render(<Harness />);

    await expect(window.__api.post('/oops', {})).rejects.toBeDefined();
    const errNode = await screen.findByTestId('error');
    expect(errNode.textContent).toBe('Request failed');
  });

  test('401 surfaces auth error message (from apiClient)', async () => {
    // Re-mock axios.get to reject with a 401 shape; apiClient interceptor maps message
    const err = { response: { status: 401, data: { message: 'Unauthorized' } }, message: 'Unauthorized' };
    // eslint-disable-next-line no-undef
    axios.get.mockRejectedValueOnce(err);
    render(<Harness />);
    await expect(window.__api.get('/me')).rejects.toBeDefined();
    const errNode = await screen.findByTestId('error');
    expect(errNode.textContent).toBe('Unauthorized');
  });
});
