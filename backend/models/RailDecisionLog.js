const mongoose = require('mongoose');

const RailDecisionLogSchema = new mongoose.Schema({
  ts: { type: Date, default: () => new Date(), index: true },
  surface: { type: String, index: true },
  form: { type: String, index: true },
  selection: { type: Array, default: [] },
  suppressed: {
    items: { type: Number, default: 0 },
    rails: { type: Number, default: 0 },
    reasons: { type: [String], default: [] }
  },
  durationMs: { type: Number, default: 0 },
  meta: { type: Object, default: {} }
});

module.exports = mongoose.models.RailDecisionLog || mongoose.model('RailDecisionLog', RailDecisionLogSchema);
