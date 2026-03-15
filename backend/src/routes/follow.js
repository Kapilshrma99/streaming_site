const express = require("express");
const Follower = require("../models/Follower");
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// POST /api/follow/:userId — follow a user
router.post("/:userId", authenticate, async (req, res) => {
  try {
    const targetId = req.params.userId;
    if (targetId === req.user._id.toString()) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ error: "User not found" });

    const existing = await Follower.findOne({ followerId: req.user._id, followingId: targetId });
    if (existing) return res.status(409).json({ error: "Already following this user" });

    await Follower.create({ followerId: req.user._id, followingId: targetId });

    // Update counts
    await Promise.all([
      User.findByIdAndUpdate(req.user._id, { $inc: { followingCount: 1 } }),
      User.findByIdAndUpdate(targetId, { $inc: { followersCount: 1 } }),
    ]);

    res.json({ success: true, message: `Now following ${target.username}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/follow/:userId — unfollow a user
router.delete("/:userId", authenticate, async (req, res) => {
  try {
    const targetId = req.params.userId;
    const result = await Follower.findOneAndDelete({
      followerId: req.user._id,
      followingId: targetId,
    });
    if (!result) return res.status(404).json({ error: "Not following this user" });

    await Promise.all([
      User.findByIdAndUpdate(req.user._id, { $inc: { followingCount: -1 } }),
      User.findByIdAndUpdate(targetId, { $inc: { followersCount: -1 } }),
    ]);

    res.json({ success: true, message: "Unfollowed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/follow/status/:userId — check if following
router.get("/status/:userId", authenticate, async (req, res) => {
  try {
    const exists = await Follower.findOne({
      followerId: req.user._id,
      followingId: req.params.userId,
    });
    res.json({ isFollowing: !!exists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/follow/followers/:userId
router.get("/followers/:userId", async (req, res) => {
  try {
    const followers = await Follower.find({ followingId: req.params.userId })
      .populate("followerId", "username displayName avatar isLive")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ followers: followers.map((f) => f.followerId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/follow/following/:userId
router.get("/following/:userId", async (req, res) => {
  try {
    const following = await Follower.find({ followerId: req.params.userId })
      .populate("followingId", "username displayName avatar isLive")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ following: following.map((f) => f.followingId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
