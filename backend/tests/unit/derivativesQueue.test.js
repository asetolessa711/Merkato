const path = require('path');

describe('derivativesQueue utility', () => {
  const modPath = path.join(__dirname, '../../utils/derivativesQueue');

  beforeEach(() => {
    jest.resetModules();
  });

  test('enqueue returns not accepted when disabled; invalid job rejected when enabled', async () => {
    const { enqueue, getStatus, setEnabled, drain } = require(modPath);
    // Ensure disabled state
    setEnabled(false);
    const disabledTry = enqueue({ urlOriginal: '/notuploads/file.jpg' });
    expect(disabledTry).toEqual({ accepted: false, reason: 'Queue disabled' });
    let status = getStatus();
    expect(status.enabled).toBe(false);

    // Now enable and assert invalid job path
    setEnabled(true);
    const invalid = enqueue({ urlOriginal: '/notuploads/file.jpg' });
    expect(invalid).toEqual({ accepted: false, reason: 'Invalid job' });

    // Cleanup
    drain();
    setEnabled(false);
  });

  test('processes a valid job when enabled and updates status', async () => {
    // Mock imageDerivatives to avoid doing real work
    jest.doMock('../../utils/imageDerivatives', () => ({
      ensureDerivativesForUploadUrl: jest.fn().mockResolvedValue({
        original: { width: 10, height: 10 },
      }),
    }));
    const { enqueue, getStatus, setEnabled, drain } = require(modPath);

    // Enable queue explicitly (test env normally disables it)
    setEnabled(true);

    const res = enqueue({ urlOriginal: '/uploads/test.jpg' });
    expect(res).toEqual({ accepted: true });

    // Wait a tick for setImmediate + promise to resolve
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    const status = getStatus();
    expect(status.totalProcessed + status.totalFailed).toBeGreaterThanOrEqual(1);
    expect(status.running).toBe(false);

    // Cleanup queue state
    drain();
    setEnabled(false);
  });
});
