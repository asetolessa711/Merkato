import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminRailsMetricsPanel from '../../components/admin/AdminRailsMetricsPanel'';

function mockFetchOnce(data, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(data) });
}

describe('AdminRailsMetricsPanel', () => {
  const windowDays = 7;
  const baselineDays = 28;
  const basePayload = {
    windowDays,
    baselineDays,
    baseline: { ctr: { p50: 0.12 }, atc: { p50: 0.05 }, rpm: { p80: 3.5 } },
    rails: [
      {
        railId: 'r1',
        title: 'Featured',
        metrics: { imp: 1000, clk: 80, ctr: 0.08, atc: 12, atcRate: 0.012, rev: 42.12, rpm: 42.12, sessions: 910 },
        recommendation: 'KEEP',
        reasons: ['BASELINE_OK'],
        deltas: { ctrDeltaPp: -4.0, atcDeltaPp: -3.8 }
      }
    ]
  };
  const summaryPayload = { site: { suppression: { sponsored: 2, capacityTrim: 1, capacityRail: 0, siteSponsored: 1 } } };

  beforeEach(() => {
    global.fetch = jest.fn((url) => {
      if (String(url).includes('/summary')) return mockFetchOnce(summaryPayload);
      return mockFetchOnce(basePayload);
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders skeleton while loading, then shows core metrics and diagnostics (advanced)', async () => {
    render(<AdminRailsMetricsPanel windowDays={windowDays} baselineDays={baselineDays} autoRefreshDefault={false} />);

    // Shows loading header and skeleton rows
    expect(screen.getByText(/Rails Performance/i)).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // After load, row render and diagnostics toggle available
    await waitFor(() => {
      expect(screen.getAllByText('Featured').length).toBeGreaterThan(0);
    });

    // Open Diagnostics (Advanced) and verify suppression summary renders
    const diag = screen.getByText(/Diagnostics \(Advanced\)/i);
    await userEvent.click(diag);
    expect(screen.getByText(/Suppression — sponsored: 2/i)).toBeInTheDocument();
  });

  it.skip('toggles auto-refresh on/off and schedules/cleans timers', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    render(
      <AdminRailsMetricsPanel
        windowDays={windowDays}
        baselineDays={baselineDays}
        autoRefreshDefault={true}
        minIntervalSec={1}
        maxIntervalSec={1}
      />
    );

    // Initial load
    await waitFor(() => expect(screen.getByText('Featured')).toBeInTheDocument());

    // Should schedule at least one timeout for auto-refresh
    expect(setTimeoutSpy).toHaveBeenCalled();

    // Turn off auto-refresh -> timer cleared
    const checkbox = screen.getByRole('checkbox', { name: /auto/i });
    await userEvent.click(checkbox);
    expect(clearTimeoutSpy).toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  it('handles error state gracefully', async () => {
    global.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 500 }))
                 .mockImplementationOnce(() => mockFetchOnce(summaryPayload));

    render(<AdminRailsMetricsPanel windowDays={windowDays} baselineDays={baselineDays} autoRefreshDefault={false} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load rails metrics/i)).toBeInTheDocument();
    });
  });

  it('renders recommendation text (in diagnostics) and responds to window/baseline prop changes', async () => {
    const { rerender } = render(<AdminRailsMetricsPanel windowDays={7} baselineDays={28} autoRefreshDefault={false} />);

    await waitFor(() => {
      expect(screen.getAllByText('Featured').length).toBeGreaterThan(0);
    });

    // Open Diagnostics to see recommendation text
    const diag = screen.getByText(/Diagnostics \(Advanced\)/i);
    await userEvent.click(diag);
    expect(screen.getByText('KEEP')).toBeInTheDocument();

    // Track calls and then re-render with different props
    const callsBefore = global.fetch.mock.calls.length;
    // Simulate parent changing props by re-rendering component
    rerender(
      <AdminRailsMetricsPanel windowDays={1} baselineDays={28} autoRefreshDefault={false} />
    );

    await waitFor(() => {
      expect(global.fetch.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
