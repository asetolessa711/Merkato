const mongoose = require('mongoose');

const BehaviorEventSchema = new mongoose.Schema(
  {
    anonymousId: { type: String, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    eventName: { type: String, required: true, index: true },
    props: { type: mongoose.Schema.Types.Mixed },
    ts: { type: Date, default: Date.now, index: true },
    metadata: {
      userAgent: String,
      ip: String,
    },
  },
  { timestamps: true, collection: 'behavior_events' }
);

module.exports = mongoose.model('BehaviorEvent', BehaviorEventSchema);
