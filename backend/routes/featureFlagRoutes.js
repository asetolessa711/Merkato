const express = require("express");

// Helper: parse env booleans safely with conservative default (false)
function toBool(val, defaultVal = false) {
  if (val === undefined || val === null) return defaultVal;
  const s = String(val).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

const router = express.Router();

// GET /api/feature-flags
// Public: expose non-sensitive feature flags so clients/tests can align UI/behavior
router.get("/", (req, res) => {
  const flags = {
    // Prefer backend-specific envs, fallback to frontend-style vars if present
    gamification: toBool(
      process.env.FEATURE_GAMIFICATION ?? process.env.REACT_APP_FEATURE_GAMIFICATION,
      false,
    ),
    behavioralPromos: toBool(
      process.env.FEATURE_BEHAVIORAL_PROMOS ?? process.env.REACT_APP_FEATURE_BEHAVIORAL_PROMOS,
      false,
    ),
  };

  res.status(200).json({ flags });
});

module.exports = router;
