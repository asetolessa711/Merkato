const mongoose = require('mongoose');

// Tracks whether a given (railId, sessionId, date) has already been counted toward sessions.
// One document == one counted session for that rail on that UTC date.
const railSessionSeenDailySchema = new mongoose.Schema({
  railId: { type: String, required: true, index: true },
  date: { type: String, required: true, index: true }, // YYYY-MM-DD (UTC)
  sessionId: { type: String, required: true },
  createdAtUTC: { type: Date, default: () => new Date() },
});

railSessionSeenDailySchema.index({ railId: 1, date: 1, sessionId: 1 }, { unique: true });
// TTL index: expire documents ~90 days after creation to prevent unbounded growth.
// (TTL starts counting from createdAtUTC; safe because uniqueness value past horizon no longer needed for session metrics.)
railSessionSeenDailySchema.index({ createdAtUTC: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('RailSessionSeenDaily', railSessionSeenDailySchema);
