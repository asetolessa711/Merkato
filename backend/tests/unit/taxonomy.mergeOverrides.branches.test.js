const { mergeOverrides } = require('../../utils/taxonomy');

describe('taxonomy.mergeOverrides branches', () => {
  test('merges existing by id and creates new with slug/id defaults; fixes dangling parent and computes path', () => {
    const base = [
      { id: 'root', name: 'Root', slug: 'root', level: 1, displayOrder: 10, parentId: null, path: [] },
      { id: 'child', name: 'Child', slug: 'child', level: 2, displayOrder: 20, parentId: 'root', path: ['root'] },
    ];

    const overrides = [
      // Update existing child; attempt to change id/slug should be ignored for id but keep existing slug
      { id: 'child', name: 'Child Updated', slug: 'should-not-override' },
      // New item without explicit id but with name → id derived from slugify(name)
      { name: 'New Category', displayOrder: 5, level: 1 },
      // New with explicit id and dangling parentId (not in base/overrides) → parentId should be nulled
      { id: 'dangling', name: 'Dangling', parentId: 'missing-parent', level: 2 },
    ];

    const merged = mergeOverrides(base, overrides);

    // Still contains existing ids
    const byId = new Map(merged.map(c => [c.id, c]));
    expect(byId.has('root')).toBe(true);
    expect(byId.has('child')).toBe(true);

    const child = byId.get('child');
    expect(child.name).toBe('Child Updated');
    // slug stays from existing when present
    expect(child.slug).toBe('child');

    // New item created with derived id/slug
    const newCat = merged.find(c => c.name === 'New Category');
    expect(newCat).toBeTruthy();
    expect(newCat.id).toMatch(/new-category/);
    expect(newCat.slug).toMatch(/new-category/);
    // Has defaults
    expect(newCat.displayOrder).toBe(5);
    expect(newCat.level).toBe(1);

    // Dangling parentId gets removed and path computed empty array
    const dang = byId.get('dangling');
    expect(dang).toBeTruthy();
    expect(dang.parentId).toBeNull();
    expect(Array.isArray(dang.path)).toBe(true);
    expect(dang.path.length).toBe(0);

    // Paths should be computed for items without explicit path
    const root = byId.get('root');
    expect(root.path).toEqual([]);
    expect(child.path).toEqual(['root']);
  });
});
