const mongoose = require('mongoose');

const RailSchema = new mongoose.Schema({
  railId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  displayName: { type: String },
  status: { type: String, enum: ['draft','published'], default: 'draft', index: true },
  // Operational status for Marketing (separate from publish status)
  opsStatus: { type: String, enum: ['active','paused','archived'], default: 'active', index: true },
  // Registry: tactic/category/placement/environment/owner
  tactic: { type: String, enum: ['Curated','DealsHub','CategoryPromo','BrandSpotlight','CrossSell','Collection','Sponsored'], index: true },
  category: { type: String, enum: ['Discovery','Deals/Promo','Sponsored','Session-Based','Editorial/Brand','Audit/Test'] },
  // placementKey uses granular taxonomy; legacy values remain accepted for transition
  placementKey: { type: String, enum: undefined, index: true },
  environment: { type: String, enum: ['Prod','Staging','Dev'], default: 'Prod', index: true },
  owner: { type: String, enum: ['Marketing','System+Marketing','Vendor'], default: 'Marketing', index: true },
  variant: { type: String },
  badges: { type: [String], default: [], enum: ['SPONSORED','CAP_SITE','CAP_PER_RAIL','CAP_MULTI'] },
  notes: { type: String },
  campaignId: { type: String },
  inventoryAware: { type: Boolean, default: true },
  eligibilityRules: { type: String },
  capSitePct: { type: Number, min: 0, max: 100 },
  capPerRailPct: { type: Number, min: 0, max: 100 },
  placement: {
    page: { type: String, default: 'home', index: true },
    slot: { type: String, default: 'auto', index: true }
  },
  type: { type: String, default: 'featured' },
  items: [{
    sku: { type: String, required: true },
    reason: { type: String, enum: ['manual','sponsored'], default: 'manual' },
    weight: { type: Number, default: 0 }
  }],
  targeting: {
    roles: { type: [String], default: ['all'] },
    regions: { type: [String], default: [] },
    languages: { type: [String], default: ['all'] },
    categories: { type: [String], default: [] }
  },
  schedule: {
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null }
  },
  priority: { type: Number, default: 0 },
  capacity: {
    maxItems: { type: Number, default: 12 },
    minItems: { type: Number, default: 2 },
    sponsoredEvery: { type: Number, default: 0 },
    sponsoredSessionCap: { type: Number, default: 2 }
  },
  meta: {
    createdAtUTC: { type: Date, default: () => new Date() },
    updatedAtUTC: { type: Date, default: () => new Date() },
    createdBy: { type: String },
    updatedBy: { type: String },
    version: { type: Number, default: 1 }
  }
});

// Normalize & defaults
RailSchema.pre('validate', async function(next){
  if (this.railId) this.railId = String(this.railId).trim().toLowerCase();
  if (!this.displayName && this.title) this.displayName = this.title;
  try {
    const { normalizePlacementKey, allowedPlacementKeys, GUARDS } = require('../utils/placementTaxonomy');
    if (this.placementKey) {
      this.placementKey = normalizePlacementKey(this.placementKey);
      const allowed = allowedPlacementKeys();
      if (!allowed.includes(this.placementKey)) {
        return next(new Error(`Invalid placementKey: ${this.placementKey}`));
      }
    }
    // Guardrails (soft by default). Enable hard enforcement via env flag.
    const enforce = process.env.RAILS_POLICY_ENFORCE === 'true';
    if (enforce) {
      // Activation guardrails apply for Prod + opsStatus=active
      const isProdActive = this.environment === 'Prod' && this.opsStatus === 'active';
      if (isProdActive) {
        if (!this.tactic || !this.placementKey || !this.owner) {
          return next(new Error('Activation requires tactic, placementKey, and owner for Prod/Active'));
        }
        if (this.tactic === 'Sponsored') {
          if (typeof this.capSitePct !== 'number' || typeof this.capPerRailPct !== 'number') {
            return next(new Error('Sponsored rails require capSitePct and capPerRailPct'));
          }
        }
      }
      const guards = [GUARDS.noSponsoredAtHeroTop, GUARDS.pdpCartOnlyCrossSell];
      for (const g of guards) {
        if (typeof g === 'function' && !g(this)) {
          return next(new Error('Placement/tactic violates policy guardrails'));
        }
      }
    }
    // Enforce uniqueness for single-slot placements like CategoryTop per category in Prod Active
  try {
      const singleSlots = new Set(['CategoryTop']);
      const isProdActive = this.environment === 'Prod' && this.opsStatus === 'active';
      if (isProdActive && singleSlots.has(this.placementKey) && this.category) {
        // Find any other rail with same (placementKey, category, environment, opsStatus)
        const conflict = mongoose.models.Rail && mongoose.models.Rail.findOne ? await mongoose.models.Rail.findOne({
          _id: { $ne: this._id },
          placementKey: this.placementKey,
          category: this.category,
          environment: this.environment,
          opsStatus: this.opsStatus
        }) : null;
        if (conflict) {
          return next(new Error(`CategoryTop already exists for category ${this.category} in Prod/Active`));
        }
      }
    } catch(e) { /* best-effort; skip on build-time */ }
  } catch(e){ /* taxonomy module optional at build-time; ignore if missing */ }
  next();
});

RailSchema.pre('save', function(next){ this.meta = this.meta || {}; this.meta.updatedAtUTC = new Date(); if(!this.meta.createdAtUTC) this.meta.createdAtUTC = new Date(); next(); });

// Best-effort index for single-slot uniqueness (partial indexes are not strictly enforced in Mongoose)
try {
  RailSchema.index({ placementKey: 1, category: 1, environment: 1, opsStatus: 1 }, { unique: true, partialFilterExpression: { placementKey: 'CategoryTop', environment: 'Prod', opsStatus: 'active', category: { $exists: true, $type: 'string' } } });
} catch(_) {}

module.exports = mongoose.models.Rail || mongoose.model('Rail', RailSchema);
