// Recovered test for Mega Menu configuration
// Validates structure, category titles, and link targets for the navbar mega menu

// Use require with path.join to avoid any resolver quirks
const path = require('path');
// Resolve to src/config/megaMenu.js using absolute path from test file directory
// eslint-disable-next-line import/no-dynamic-require, global-require
// Support both default and named exports
// eslint-disable-next-line import/no-dynamic-require, global-require
import { MEGA_MENU } from '../../../config/megaMenu'';

describe('Mega Menu config', () => {
  it('exports an array of category columns', () => {
    expect(Array.isArray(MEGA_MENU)).toBe(true);
    // Should have a sensible number of columns
    expect(MEGA_MENU.length).toBeGreaterThanOrEqual(8);
  });

  it('each column has a non-empty title and links array', () => {
    for (const col of MEGA_MENU) {
      expect(typeof col.title).toBe('string');
      expect(col.title.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(col.links)).toBe(true);
      expect(col.links.length).toBeGreaterThan(0);
    }
  });

  it('each link has a label and a clean browse/deals target', () => {
    for (const col of MEGA_MENU) {
      for (const lnk of col.links) {
        expect(typeof lnk.label).toBe('string');
        expect(lnk.label.trim().length).toBeGreaterThan(0);
        expect(typeof lnk.to).toBe('string');
        // Clean routes: categories (/c/...), deals (/deals/...), or discover
        const isCategory = lnk.to.startsWith('/c/');
        const isDeals = lnk.to.startsWith('/deals/');
        const isDiscover = lnk.to === '/discover' || lnk.to.startsWith('/discover');
        expect(isCategory || isDeals || isDiscover).toBe(true);

        // If a query is present, it must be parseable
        if (lnk.to.includes('?')) {
          expect(() => new URL(lnk.to, 'http://localhost')).not.toThrow();
        }
      }
    }
  });

  it('has no duplicate category titles', () => {
    const titles = MEGA_MENU.map((c) => (c.title || '').trim().toLowerCase());
    const unique = new Set(titles);
    expect(unique.size).toBe(titles.length);
  });

  it('does not repeat link targets within a single column', () => {
    for (const col of MEGA_MENU) {
      const tos = col.links.map((l) => l.to);
      const unique = new Set(tos);
      expect(unique.size).toBe(tos.length);
    }
  });
});
