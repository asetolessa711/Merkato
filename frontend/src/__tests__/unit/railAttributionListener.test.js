import { resetAllRailMetrics, getRailMetricsStore, recordRailImpression } from '../../utils/railsStore'';

// Ensure listener module is loaded (auto-installs on import)
import '../../attribution/railAttributionListener';

describe('railAttributionListener (global cart:add)', () => {
  beforeEach(() => {
    resetAllRailMetrics();
    // Simulate an impression + session so revenue/ATC ratios don't divide by zero elsewhere
    recordRailImpression('rail_test');
  });

  test('increments atc + revenue metrics when cart:add dispatched with rail context', () => {
    const price = 19.99;
    const ev = new CustomEvent('cart:add', { detail: { sku: 'SKU123', price, railId: 'rail_test', railSku: 'SKU123' } });
    window.dispatchEvent(ev);

    const metrics = getRailMetricsStore();
    expect(metrics['atc.rail_test']).toBe(1);
    expect(metrics['atcItem.rail_test.SKU123']).toBe(1);
    expect(metrics['rev.rail_test']).toBeCloseTo(price, 5);
  });

  test('ignores cart:add without railId', () => {
    const ev = new CustomEvent('cart:add', { detail: { sku: 'SKU999', price: 10 } });
    window.dispatchEvent(ev);
    const metrics = getRailMetricsStore();
    // Ensure no atc.* keys exist for rails
    const keys = Object.keys(metrics).filter(k=>k.startsWith('atc.rail_'));
    expect(keys.length).toBe(0);
  });
});
