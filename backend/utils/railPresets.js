// Presets translate marketing intent into tactic and allowed placements

const PRESETS = {
  // Friendly names for Saved Views and quick filters
  Curated: { tactic: 'Curated', allowed: ['HeroTop','HeroBelow','Mid','Footer'], defaults: { environment: 'Prod', opsStatus: 'active' } },
  Deals: { tactic: 'DealsHub', allowed: ['DealsTop','DealsTierRow'], defaults: { environment: 'Prod', opsStatus: 'active' } },
  Brand: { tactic: 'BrandSpotlight', allowed: ['HeroTop','HeroBelow','BrandPageHero','BrandPageMid'], defaults: { environment: 'Prod', opsStatus: 'active' } },
  'Cross-sell': { tactic: 'CrossSell', allowed: ['PDP','Cart'], defaults: { environment: 'Prod', opsStatus: 'active' } },
  Collections: { tactic: 'Collection', allowed: ['CollectionHero','CollectionMid'], defaults: { environment: 'Prod', opsStatus: 'active' } },
  Sponsored: { tactic: 'Sponsored', allowed: ['Mid','CategoryMid','DealsTierRow','SearchResultsRow','CollectionMid'], defaults: { environment: 'Prod', opsStatus: 'active' } },
  // Structured presets (existing)
  Home_Hero: { tactic: 'Curated', allowed: ['HeroTop','HeroBelow'] },
  Home_Mid: { tactic: 'Curated', allowed: ['Mid','Footer'] },
  Category_Promo: { tactic: 'CategoryPromo', allowed: ['CategoryTop','CategoryMid'] },
  Deals_Hero: { tactic: 'DealsHub', allowed: ['DealsTop','DealsTierRow'] },
  Brand_Spotlight: { tactic: 'BrandSpotlight', allowed: ['BrandPageHero','BrandPageMid'] },
  Cross_Sell: { tactic: 'CrossSell', allowed: ['PDP','Cart'] },
  Collection_Featured: { tactic: 'Collection', allowed: ['CollectionHero','CollectionMid'] },
  Sponsored_Grid: { tactic: 'Sponsored', allowed: ['Mid','CategoryMid','DealsTierRow','SearchResultsRow','CollectionMid'] }
};

function resolvePreset(name){ return PRESETS[name] || null; }
function listPresets(){ return Object.entries(PRESETS).map(([k,v])=>({ name:k, tactic: v.tactic, allowed: v.allowed, defaults: v.defaults || undefined })); }

module.exports = { PRESETS, resolvePreset, listPresets };
