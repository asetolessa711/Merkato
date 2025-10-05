import {
  recordImp,
  recordClk,
  recordAtc,
  recordItemClk,
  recordItemAtc,
  recordSuppression,
  flushRailMetrics,
  getQueuedRailEventsCount,
  _resetRailEventQueueForTests,
} from '../../utils/railsStore'';

// Polyfills for storage in Jest if missing
if (typeof localStorage === 'undefined') {
  const store = {};
  // eslint-disable-next-line no-global-assign
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

if (typeof sessionStorage === 'undefined') {
  const sstore = {};
  // eslint-disable-next-line no-global-assign
  global.sessionStorage = {
    getItem: (k) => (k in sstore ? sstore[k] : null),
    setItem: (k, v) => { sstore[k] = String(v); },
    removeItem: (k) => { delete sstore[k]; },
    clear: () => { Object.keys(sstore).forEach(k => delete sstore[k]); },
  };
}

// Helper: flush pending microtasks without relying on setImmediate (jsdom safe)
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };

describe('railsStore event queue & backoff', () => {
  let originalFetch;
  let originalSendBeacon;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    // Reset queue/timers and storage
    _resetRailEventQueueForTests();
    if (localStorage.clear) localStorage.clear();
    if (sessionStorage.clear) sessionStorage.clear();

    // Mock fetch
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

    // Mock sendBeacon by default
    originalSendBeacon = (global.navigator && global.navigator.sendBeacon) || undefined;
    if (!global.navigator) {
      // eslint-disable-next-line no-global-assign
      global.navigator = {};
    }
    global.navigator.sendBeacon = jest.fn(() => true);

    // Ensure visibilityState is configurable for tests
    try {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    } catch (_) {
      // ignore if jsdom disallows; tests that depend on it will guard
    }
  });

  afterEach(() => {
    if (originalFetch) global.fetch = originalFetch; else delete global.fetch;
    if (originalSendBeacon) global.navigator.sendBeacon = originalSendBeacon; else delete global.navigator.sendBeacon;
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('queues events and flushes as a batch', async () => {
    recordImp('rail_A');
    recordClk('rail_A');
    recordAtc('rail_A', 'SKU1', 19.99);
    recordItemClk('rail_A', 'SKU1');
    recordItemAtc('rail_A', 'SKU1', 19.99);
    recordSuppression('rail_A', 'sponsored');

    expect(getQueuedRailEventsCount()).toBe(6);

    await flushRailMetrics(true);
    await tick();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/rails/metrics/flush');
    const body = JSON.parse(options.body);
    expect(body.events).toHaveLength(6);
    expect(getQueuedRailEventsCount()).toBe(0);
  });

  test('retry backoff re-queues without duplicates, then succeeds on next attempt', async () => {
    // First call fails
    global.fetch.mockRejectedValueOnce(new Error('network down'));
    // Second call succeeds
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    recordImp('rail_B');
    recordClk('rail_B');
    expect(getQueuedRailEventsCount()).toBe(2);

    await flushRailMetrics(true); // triggers failure path and schedules retry
    await tick();

    // After failure, events should be back in the queue (no duplicates)
    expect(getQueuedRailEventsCount()).toBe(2);

    // Advance timers to hit first backoff (2000ms)
    jest.advanceTimersByTime(2000);
    await tick();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    // After success, queue emptied
    expect(getQueuedRailEventsCount()).toBe(0);
  });

  test('throttles small trickle within interval, then periodic flush picks it up', async () => {
    // Seed an event (also binds lifecycle) and flush once to set lastFlushTs
    recordImp('rail_C');
    await flushRailMetrics(true);
    await tick();
    const initialCalls = global.fetch.mock.calls.length;

    // Add a small trickle (<10) and attempt immediate flush (should be throttled)
    recordClk('rail_C');
    await flushRailMetrics(false);
    await tick();
    // No new fetch due to throttle
    expect(global.fetch.mock.calls.length).toBe(initialCalls);

    // Advance timers for periodic scheduled flush
    jest.advanceTimersByTime(4000);
    await tick();

    expect(global.fetch.mock.calls.length).toBeGreaterThan(initialCalls);
  });

  test('visibility change to hidden forces a flush', async () => {
    recordImp('rail_D');
    expect(getQueuedRailEventsCount()).toBe(1);

    // Force visibility hidden and dispatch event
    try { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); } catch (_) {}
    document.dispatchEvent(new Event('visibilitychange'));

    await tick();
    // Should have flushed despite throttle
    expect(global.fetch).toHaveBeenCalled();
    expect(getQueuedRailEventsCount()).toBe(0);
  });

  test('beforeunload uses sendBeacon and clears queue', async () => {
    // Ensure sendBeacon is mocked
    expect(typeof global.navigator.sendBeacon).toBe('function');

    recordImp('rail_E');
    expect(getQueuedRailEventsCount()).toBe(1);

    // Trigger beforeunload
    window.dispatchEvent(new Event('beforeunload'));

    // Fetch should not be required when sendBeacon is present
    expect(global.navigator.sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = global.navigator.sendBeacon.mock.calls[0];
    expect(url).toBe('/api/rails/metrics/flush');
    expect(blob).toBeInstanceOf(Blob);
    // Queue cleared best-effort
    expect(getQueuedRailEventsCount()).toBe(0);
  });
});
