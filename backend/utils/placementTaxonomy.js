// Centralized placement taxonomy and simple guardrails for merchandising rails

const PLACEMENTS = {
  // Home
  HeroTop: { page: 'home', area: 'hero', priority: 100 },
  HeroBelow: { page: 'home', area: 'hero_below', priority: 90 },
  Mid: { page: 'home', area: 'mid', priority: 50 },
  Footer: { page: 'home', area: 'footer', priority: 10 },
  // Category
  CategoryTop: { page: 'category', area: 'top', priority: 80 },
  CategoryMid: { page: 'category', area: 'mid', priority: 40 },
  // Deals
  DealsTop: { page: 'deals', area: 'top', priority: 80 },
  DealsTierRow: { page: 'deals', area: 'tier_row', priority: 60 },
  // Brand
  BrandPageHero: { page: 'brand', area: 'hero', priority: 80 },
  BrandPageMid: { page: 'brand', area: 'mid', priority: 40 },
  // Search
  SearchResultsRow: { page: 'search', area: 'row', priority: 30 }, // internal canonical row key
  // PDP / Cart
  PDP: { page: 'pdp', area: 'body', priority: 30 },
  Cart: { page: 'cart', area: 'body', priority: 30 },
  // Collections
  CollectionHero: { page: 'collection', area: 'hero', priority: 70 },
  CollectionMid: { page: 'collection', area: 'mid', priority: 40 }
};

// Legacy placement keys accepted in older data and tests
const LEGACY_PLACEMENTS = [
  'Hero','Mid','CategoryTop','DealsPage','PDP','Cart','CollectionPage','SearchResults'
];

// Legacy -> New mapping (best-effort)
const LEGACY_MAP = {
  Hero: 'HeroTop',
  Mid: 'Mid',
  CategoryTop: 'CategoryTop',
  DealsPage: 'DealsTop',
  PDP: 'PDP',
  Cart: 'Cart',
  CollectionPage: 'CollectionHero',
  SearchResults: 'SearchResultsRow'
};

// Policy guardrails
const GUARDS = {
  // Sponsored content cannot occupy the absolute top hero slot
  noSponsoredAtHeroTop: (doc) => !(doc.placementKey === 'HeroTop' && (doc.tactic === 'Sponsored' || doc.type === 'sponsored')),
  // PDP and Cart are CrossSell-only for now
  pdpCartOnlyCrossSell: (doc) => {
    if (doc.placementKey === 'PDP' || doc.placementKey === 'Cart') {
      return doc.tactic === 'CrossSell';
    }
    return true;
  }
};

function normalizePlacementKey(key){
  if (!key) return key;
  if (PLACEMENTS[key]) return key;
  // Accept canonical synonyms from policy doc
  if (key === 'SearchResults') return 'SearchResultsRow';
  if (key === 'CollectionPage') return 'CollectionHero';
  if (LEGACY_MAP[key]) return LEGACY_MAP[key];
  return key; // unknown stays as-is for now
}

function allowedPlacementKeys(){
  return Array.from(new Set([...Object.keys(PLACEMENTS), ...LEGACY_PLACEMENTS]));
}

module.exports = { PLACEMENTS, LEGACY_PLACEMENTS, LEGACY_MAP, GUARDS, normalizePlacementKey, allowedPlacementKeys };
