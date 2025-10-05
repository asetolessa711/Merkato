const { normalizePlacementKey, allowedPlacementKeys } = require('../../utils/placementTaxonomy');

describe('placementTaxonomy normalizePlacementKey', () => {
  test('maps legacy keys to granular taxonomy', () => {
    expect(normalizePlacementKey('Hero')).toBe('HeroTop');
    expect(normalizePlacementKey('DealsPage')).toBe('DealsTop');
    expect(normalizePlacementKey('CollectionPage')).toBe('CollectionHero');
    expect(normalizePlacementKey('SearchResults')).toBe('SearchResultsRow');
  });

  test('keeps unknown keys unchanged and includes legacy in allowed list', () => {
    const allowed = allowedPlacementKeys();
    expect(allowed).toEqual(expect.arrayContaining(['Hero','Mid','CategoryTop','DealsPage','PDP','Cart','CollectionPage','SearchResults']));
    expect(normalizePlacementKey('Mid')).toBe('Mid');
    expect(normalizePlacementKey('SomeUnknownKey')).toBe('SomeUnknownKey');
  });
});
