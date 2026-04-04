const mongoose = require('mongoose');

const LIFECYCLE_STATES = [
  'requested',
  'under_review',
  'approved',
  'rejected',
  'refunded',
  'closed',
];

const TRANSITION_MAP = {
  requested: ['under_review'],
  under_review: ['approved', 'rejected'],
  approved: ['refunded'],
  refunded: ['closed'],
  rejected: ['closed'],
  closed: [],
};

const transitionEventSchema = new mongoose.Schema(
  {
    fromStatus: { type: String, enum: [...LIFECYCLE_STATES, null], default: null },
    toStatus: { type: String, enum: LIFECYCLE_STATES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true, maxlength: 500 },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const returnRequestSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: LIFECYCLE_STATES, default: 'requested', index: true },
    reason: { type: String, trim: true, maxlength: 500 },
    transitionHistory: { type: [transitionEventSchema], default: [] },
  },
  { timestamps: true }
);

returnRequestSchema.index({ order: 1, customer: 1, createdAt: -1 });

returnRequestSchema.statics.lifecycleStates = LIFECYCLE_STATES;
returnRequestSchema.statics.transitionMap = TRANSITION_MAP;
returnRequestSchema.statics.canTransition = (fromStatus, toStatus) => {
  if (!fromStatus || !toStatus) return false;
  const allowed = TRANSITION_MAP[fromStatus] || [];
  return allowed.includes(toStatus);
};

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);