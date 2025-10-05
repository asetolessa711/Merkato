const {
  filterAndSort,
  computeChildren,
  getLeaves,
  getAttributesForSlug,
  mergeOverrides,
  buildTaxonomy,
  readOverrides,
  OVERRIDES_FILE,
  DATA_DIR,
} = require('../../utils/taxonomy');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

describe('taxonomy utils (branch coverage)', () => {
  const cats = [
    { id: 'fashion', name: 'Fashion', slug: 'fashion', displayOrder: 20, visibleIn: ['mega','searchbar'], path: [], active: true, attributes: ['size','color'] },
    { id: 'electronics', name: 'Electronics', slug: 'electronics', displayOrder: 10, visibleIn: ['mega'], path: [], active: true },
    { id: 'hidden-cat', name: 'Hidden', slug: 'hidden', displayOrder: 30, visibleIn: ['secret'], path: [], active: false },
    { id: 'child-phone', name: 'Phones', slug: 'phones', parentId: 'electronics', displayOrder: 5, path: ['electronics'], visibleIn: ['mega'], active: true },
    // another root with same order as fashion to test name tie-break
    { id: 'furniture', name: 'Furniture', slug: 'furniture', displayOrder: 20, visibleIn: ['mega'], path: [], active: true },
  ];

  test('filterAndSort: region weight, root-first, then order, then name', () => {
    // No region weight: expect roots before children, then displayOrder ascending, then name
    const res = filterAndSort(cats, { visibleIn: 'mega', country: null });
    const firstFour = res.map(c => c.slug).filter(s => s !== 'hidden').slice(0,4);
    // Root categories first (electronics before its child phones)
    expect(firstFour.indexOf('electronics')).toBeLessThan(firstFour.indexOf('phones'));
    // Among roots with same displayOrder (fashion vs furniture), name tie-break (Electronics(10) first, then Fashion, Furniture by name)
    const roots = res.filter(c => !c.parentId).map(c => c.slug);
    expect(roots).toEqual(['electronics','fashion','furniture']);

    // Add region weights favoring phones for ET to verify branch aw/bw path
    const catsWeighted = cats.map(c => c.id === 'child-phone' ? { ...c, regionWeights: { ET: 5 } } : c);
    const withRegion = filterAndSort(catsWeighted, { visibleIn: 'mega', country: 'ET' });
    // With ET weight, phones should sort ahead of its parent despite root-first rule
    const slugs = withRegion.map(c => c.slug);
    expect(slugs.indexOf('phones')).toBeLessThan(slugs.indexOf('electronics'));
  });

  test('computeChildren builds map and sorts children', () => {
    const { children } = computeChildren(cats);
    expect(children.get('electronics').map(c => c.slug)).toContain('phones');
  });

  test('getLeaves filters to leaf nodes', () => {
    const leaves = getLeaves(cats, 'mega');
    const slugs = leaves.map(c => c.slug);
    expect(slugs).toContain('fashion');
    expect(slugs).toContain('phones');
  });

  test('getAttributesForSlug returns attributes array', () => {
    const attrs = getAttributesForSlug(cats, 'fashion');
    expect(attrs).toContain('size');
  });

  test('filterAndSort filters by visibleIn, active=false, and country regions', () => {
    const extended = [
      ...cats,
      { id: 'inactive', name: 'Inactive', slug: 'inactive', displayOrder: 1, active: false, visibleIn: ['mega'] },
      { id: 'regioned', name: 'Regioned', slug: 'regioned', displayOrder: 1, visibleIn: ['mega'], regions: ['US'] },
    ];
    // visibleIn filter excludes items without 'mega', active=false removed
    const res = filterAndSort(extended, { visibleIn: 'mega', country: 'ET' });
    const slugs = res.map(c => c.slug);
    expect(slugs).not.toContain('hidden');
    expect(slugs).not.toContain('inactive');
    // 'regioned' has regions ['US'] so with country ET it should be filtered out
    expect(slugs).not.toContain('regioned');
    // If country matches, it appears
    const resUS = filterAndSort(extended, { visibleIn: 'mega', country: 'US' });
    expect(resUS.map(c => c.slug)).toContain('regioned');
  });

  test('mergeOverrides computes paths and drops dangling parentId', () => {
    const base = [
      { id: 'root', name: 'Root', slug: 'root', displayOrder: 1, level: 1, visibleIn: ['mega'], active: true },
      { id: 'kid', name: 'Kid', slug: 'kid', parentId: 'root', displayOrder: 2, level: 2, visibleIn: ['mega'], active: true },
    ];
    const overrides = [
      { id: 'orphan', name: 'Orphan', parentId: 'missing-parent', visibleIn: ['mega'], active: true },
      { id: 'kid', displayOrder: 3 }, // update existing
    ];
    const merged = mergeOverrides(base, overrides);
    const byId = new Map(merged.map(c => [c.id, c]));
    expect(byId.get('kid').displayOrder).toBe(3);
    // dangling parentId removed => orphan becomes root (no path)
    const orphan = byId.get('orphan');
    expect(orphan.parentId).toBeFalsy();
    expect(Array.isArray(orphan.path)).toBe(true);
    expect(orphan.path.length).toBe(0);
    // ensure paths computed for kid
    expect(Array.isArray(byId.get('kid').path)).toBe(true);
    expect(byId.get('kid').path).toEqual(['root']);
  });

  test('readOverrides returns [] when file missing and valid array when present', async () => {
    // Ensure directory exists
    await fsp.mkdir(DATA_DIR, { recursive: true });
    // Remove file if exists
    try { await fsp.unlink(OVERRIDES_FILE); } catch(_) {}
    const empty = await readOverrides();
    expect(Array.isArray(empty)).toBe(true);
    expect(empty.length).toBe(0);
    // Write a valid overrides array
    const sample = [{ id: 'ov1', name: 'Override 1' }];
    await fsp.writeFile(OVERRIDES_FILE, JSON.stringify(sample), 'utf8');
    const arr = await readOverrides();
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBe(1);
    expect(arr[0].id).toBe('ov1');
    // cleanup
    try { await fsp.unlink(OVERRIDES_FILE); } catch(_) {}
  });

  test('readOverrides returns [] when file contains invalid JSON', async () => {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.writeFile(OVERRIDES_FILE, '{ invalid json', 'utf8');
    const arr = await readOverrides();
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBe(0);
    try { await fsp.unlink(OVERRIDES_FILE); } catch(_) {}
  });
});
