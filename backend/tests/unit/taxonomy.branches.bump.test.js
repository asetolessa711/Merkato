const { filterAndSort, computeChildren, getLeaves, getAttributesForSlug } = require('../../utils/taxonomy');

describe('utils/taxonomy branch coverage bump', () => {
  const cats = [
    { id: 'a', name: 'Alpha', slug: 'alpha', displayOrder: 20, visibleIn: ['mega'], regionWeights: { ET: 1 }, active: true },
    { id: 'b', name: 'Beta', slug: 'beta', displayOrder: 10, visibleIn: ['mega'], regionWeights: { ET: 1 }, active: true },
    { id: 'c', name: 'Child', slug: 'child', parentId: 'a', displayOrder: 5, visibleIn: ['mega'], regionWeights: { ET: 2 }, active: true },
    { id: 'd', name: 'Hidden', slug: 'hidden', displayOrder: 99, visibleIn: ['searchbar'], active: false, attributes: [{ k: 'v' }] },
  ];

  test('filterAndSort respects region weight, root-first, displayOrder, then name', () => {
    // Country provided, visibleIn filter to mega
    const out = filterAndSort(cats, { visibleIn: 'mega', country: 'ET' });
    // Highest region weight first (c has ET:2) even though it is a child
    expect(out[0].id).toBe('c');
    // Next, among a and b (same weight), prefer roots, then by displayOrder ascending: b (10) before a (20)
    expect(out[1].id).toBe('b');
    expect(out[2].id).toBe('a');
    // Hidden/inactive excluded
    expect(out.find(x => x.id === 'd')).toBeUndefined();
  });

  test('computeChildren builds child map and sorts by displayOrder then name', () => {
    const { children } = computeChildren(cats);
    const aKids = children.get('a');
    expect(Array.isArray(aKids)).toBe(true);
    expect(aKids.map(k => k.id)).toEqual(['c']);
  });

  test('getLeaves returns categories with no children and visibility filter', () => {
    const leavesMega = getLeaves(cats, 'mega');
    const ids = leavesMega.map(c => c.id).sort();
    // b and c are leaves for mega (d is inactive or not mega)
    expect(ids).toEqual(['b', 'c']);
  });

  test('getAttributesForSlug returns attributes array or empty', () => {
    expect(getAttributesForSlug(cats, 'hidden')).toEqual([{ k: 'v' }]);
    expect(getAttributesForSlug(cats, 'nope')).toEqual([]);
  });
});
