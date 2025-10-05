const mongoose = require('mongoose');

// Singleton config document for Rails selection operator knobs
const RailConfigSchema = new mongoose.Schema({
  _id: { type: String, default: 'default' },
  enabled: { type: Boolean, default: true },
  killSwitch: { type: Boolean, default: false },
  selection: {
    maxRails: { type: Number, default: 5 },
    surfaces: {
      // Example: home surface allowlist of placements in priority order
      home: {
        placements: { type: [String], default: ['HeroTop','HeroBelow','Mid'] }
      }
    }
  },
  weights: {
    priority: { type: Number, default: 10 },
    recencyMsDivisor: { type: Number, default: 1e12 }
  },
  floors: {
    heroImpMin7d: { type: Number, default: 100 },
    rpmQuantileMin: { type: Number, default: 25 } // bottom quartile cutoff
  },
  caps: {
    siteSponsoredCap: { type: Number, default: 30 },
    perRailSponsoredCap: { type: Number, default: 40 }
  },
  alerts: {
    selectionLatencyMs: { type: Number, default: 200 },
    staleRollupDays: { type: Number, default: 2 },
    // Anomaly detection thresholds (% change)
    anomalyCtrPct: { type: Number, default: 50 }, // flag if |ctr_delta_pct| >= this vs baseline
    anomalyRpmPct: { type: Number, default: 60 }, // flag if |rpm_delta_pct| >= this vs baseline
    // Freshness SLA
    freshnessDays: { type: Number, default: 14 }, // unchanged beyond this
    freshnessCtrFloor: { type: Number, default: 0.01 } // ctr below this when stale
  },
  updatedAtUTC: { type: Date, default: () => new Date() }
});

RailConfigSchema.pre('save', function(next){ this.updatedAtUTC = new Date(); next(); });

module.exports = mongoose.models.RailConfig || mongoose.model('RailConfig', RailConfigSchema);
