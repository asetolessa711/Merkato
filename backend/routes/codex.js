const express = require("express");
const router = express.Router();
const { runCodex } = require("../utils/codexAgent");

router.post("/codex", async (req, res) => {
  try {
    const { prompt } = req.body;
    const result = await runCodex(prompt);
    res.json({ result });
  } catch (err) {
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: err.message || 'Codex error' });
  }
});

module.exports = router;