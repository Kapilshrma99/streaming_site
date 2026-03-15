const express = require("express");
const User = require("../models/User");

const router = express.Router();

// GET /api/leaderboard — top streamers by diamonds received
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const users = await User.find()
      .sort({ totalGiftsReceived: -1 })
      .limit(limit)
      .select("username displayName avatar totalGiftsReceived diamonds followersCount isLive");
    res.json({ leaderboard: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
