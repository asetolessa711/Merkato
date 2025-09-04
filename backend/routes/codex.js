const express = require("express");
const router = express.Router();
const { runCodex } = require("../utils/codexAgent");

router.post("/codex", async (req, res) => {
  try {
    const { prompt } = req.body;
    const result = await runCodex(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;