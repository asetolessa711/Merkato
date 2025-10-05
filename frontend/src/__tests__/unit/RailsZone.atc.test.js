import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders'';
import RailsZone from '../../components/RailsZone'';
import { upsertRail, newRailTemplate, getRailMetricsStore, resetRailMetrics } from '../../utils/railsStore'';

// localStorage polyfill (if missing)
if (typeof localStorage === 'undefined') {
  const store = {}; // naive
  // eslint-disable-next-line no-global-assign
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

describe('RailsZone ATC attribution', () => {
  beforeEach(() => { localStorage.clear(); resetRailMetrics(); });

  function seedRailWithSku(sku='SKU123') {
    const rail = newRailTemplate({ title:'Featured Short', status:'published', placement:{ page:'home', slot:'below_hero' }, items:[{ sku, reason:'manual' }], priority:0 });
    upsertRail(rail);
    return rail;
  }

  test('records atc and revenue for rail item', () => {
    const product = { _id:'SKU123', name:'Test Product', price:25, discount:0, theme:'mint', stock:5 };
    seedRailWithSku('SKU123');
  renderWithProviders(<RailsZone page="home" slot="below_hero" productsBySku={{ SKU123: product }} />);
    const btn = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(btn);
    const metrics = getRailMetricsStore();
    // Look for rev & atc keys (pattern depends on implementation). We'll find matching keys.
    const atcKey = Object.keys(metrics).find(k => k.startsWith('atc.'));
    const revKey = Object.keys(metrics).find(k => k.startsWith('rev.'));
    expect(atcKey).toBeTruthy();
    expect(revKey).toBeTruthy();
    expect(metrics[atcKey]).toBeGreaterThanOrEqual(1);
    expect(metrics[revKey]).toBeGreaterThanOrEqual(25);
  });
});
