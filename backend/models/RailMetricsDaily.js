const mongoose = require('mongoose');

const RailMetricsDailySchema = new mongoose.Schema({
  railId: { type: String, required: true, index: true },
  date: { type: String, required: true, index: true }, // YYYY-MM-DD (UTC)
  imp: { type: Number, default: 0 },
  clk: { type: Number, default: 0 },
  atc: { type: Number, default: 0 },
  rev: { type: Number, default: 0 },
  sessions: { type: Number, default: 0 },
  suppression: {
    sponsored: { type: Number, default: 0 },
    capacityTrim: { type: Number, default: 0 },
    capacityRail: { type: Number, default: 0 },
    siteSponsored: { type: Number, default: 0 }
  },
  item: {
    clkItems: { type: Map, of: Number, default: {} },
    atcItems: { type: Map, of: Number, default: {} }
  }
}, { timestamps: false });

RailMetricsDailySchema.index({ railId:1, date:1 }, { unique: true });

module.exports = mongoose.models.RailMetricsDaily || mongoose.model('RailMetricsDaily', RailMetricsDailySchema);
