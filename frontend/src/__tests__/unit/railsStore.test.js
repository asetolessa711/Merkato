import { loadRails, saveRails, upsertRail, newRailTemplate, resolveRails, parseSkuList } from '../../utils/railsStore'';

// Basic polyfill for localStorage in Jest environment if not present
if (typeof localStorage === 'undefined') {
  const store = {}; // naive in-memory
  // eslint-disable-next-line no-global-assign
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

describe('railsStore', () => {
  beforeEach(() => { localStorage.clear(); });

  test('newRailTemplate + upsert/save load cycle', () => {
    const r = newRailTemplate({ title: 'Featured Home Rail', placement:{ page:'home', slot:'below_hero' }, status: 'published', priority: 5 });
    upsertRail(r);
    const all = loadRails();
    expect(Object.values(all).length).toBe(1);
    expect(Object.values(all)[0].title).toBe('Featured Home Rail');
  });

  test('resolver respects priority & capacity (below_hero cap=1)', () => {
    const r1 = newRailTemplate({ title: 'Low Priority', placement:{ page:'home', slot:'below_hero' }, status:'published', priority: 10 });
    const r2 = newRailTemplate({ title: 'High Priority', placement:{ page:'home', slot:'below_hero' }, status:'published', priority: 0 });
    upsertRail(r1); upsertRail(r2);
    const resolved = resolveRails({ page:'home', slot:'below_hero' });
    expect(resolved.length).toBe(1);
    expect(resolved[0].title).toBe('High Priority');
  });

  test('parseSkuList removes duplicates & trims', () => {
    const list = parseSkuList(' SKU1,SKU2\nSKU1 , SKU3 ');
    expect(list).toEqual(['SKU1','SKU2','SKU3']);
  });

  test('includeDrafts flag allows draft rails to resolve', () => {
    const draft = newRailTemplate({ title: 'Draft Rail', status:'draft', placement:{ page:'home', slot:'below_hero' }, priority: 0 });
    upsertRail(draft);
    expect(resolveRails({ page:'home', slot:'below_hero' }).length).toBe(0);
    expect(resolveRails({ page:'home', slot:'below_hero', includeDrafts:true }).length).toBe(1);
  });
});
