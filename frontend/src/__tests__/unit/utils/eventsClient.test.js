import axios from 'axios';

// Mock feature flags to control behavior in tests
jest.mock('../../../utils/featureFlags', () => ({
  __esModule: true,
  Flags: { GAMIFICATION: true, BEHAVIORAL_PROMOS: true },
  isTestEnv: () => true, // keep track() from flushing automatically
}));

import { Events } from '../../../utils/eventsClient';

const STORAGE_KEY = 'merkato-events-buffer';

describe('eventsClient', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('track buffers event when flags enabled (no autoflush in test env)', () => {
    Events.track('clicked', { a: 1 });
    const buf = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(Array.isArray(buf)).toBe(true);
    expect(buf[0].eventName).toBe('clicked');
    expect(buf[0].props).toEqual({ a: 1 });
    // No axios call because isTestEnv=true prevents flush
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('mergeOnLogin posts merge with token and flushes buffer', async () => {
    // Seed buffer with one event
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ eventName: 'e', props: {}, ts: new Date().toISOString() }]));
    axios.post.mockResolvedValue({ data: {} });

    await Events.mergeOnLogin('tok');

    // First call should be merge
    expect(axios.post).toHaveBeenCalledWith(
      '/api/behavior/merge',
      expect.objectContaining({ anonymousId: expect.any(String) }),
      { headers: { Authorization: 'Bearer tok' } }
    );
    // Buffer is flushed (removed)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test('checkIn returns disabled when GAMIFICATION off', async () => {
    jest.resetModules();
    jest.doMock('../../../utils/featureFlags', () => ({
      __esModule: true,
      Flags: { GAMIFICATION: false, BEHAVIORAL_PROMOS: true },
      isTestEnv: () => true,
    }));
    const { Events: E2 } = require('../../../utils/eventsClient');
    const res = await E2.checkIn('t');
    expect(res).toEqual({ disabled: true });
  });

  test('checkIn posts and returns data when enabled; normalizes error', async () => {
    axios.post.mockResolvedValueOnce({ data: { streak: 3 } });
    let res = await Events.checkIn('tok');
    expect(axios.post).toHaveBeenCalledWith(
      '/api/behavior/checkin',
      {},
      { headers: { Authorization: 'Bearer tok' } }
    );
    expect(res).toEqual({ streak: 3 });

    // Error path
    axios.post.mockRejectedValueOnce({ response: { data: { message: 'Nope' } } });
    res = await Events.checkIn('tok');
    expect(res).toMatchObject({ error: true, message: 'Nope' });
  });
});
