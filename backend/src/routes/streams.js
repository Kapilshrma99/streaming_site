const express = require("express");
const { v4: uuidv4 } = require("uuid");
const Stream = require("../models/Stream");
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");
const redis = require("../lib/redis");

const router = express.Router();
const STREAMS_CACHE_KEY = "active_streams";
const CACHE_TTL = 30; // seconds

// GET /api/streams — list all live streams
router.get("/", async (req, res) => {
  try {
    // Try cache first
    const cached = await redis.get(STREAMS_CACHE_KEY);
    if (cached) return res.json({ streams: JSON.parse(cached) });

    const streams = await Stream.find({ status: "live" })
      .sort({ viewerCount: -1, startedAt: -1 })
      .limit(50)
      .lean();

    await redis.setex(STREAMS_CACHE_KEY, CACHE_TTL, JSON.stringify(streams));
    res.json({ streams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/streams — start a new stream
router.post("/", authenticate, async (req, res) => {
  try {
    const { title, description, category, tags } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    // End any existing live stream for this user
    await Stream.updateMany(
      { hostId: req.user._id, status: "live" },
      { status: "ended", endedAt: new Date() }
    );

    const roomId = uuidv4();
    const stream = await Stream.create({
      title,
      description: description || "",
      hostId: req.user._id,
      hostUsername: req.user.username,
      hostAvatar: req.user.avatar,
      category: category || "general",
      tags: tags || [],
      roomId,
    });

    await User.findByIdAndUpdate(req.user._id, { isLive: true });
    await redis.del(STREAMS_CACHE_KEY); // Invalidate cache

    res.status(201).json({ stream, roomId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/streams/:id — get stream details
router.get("/:id", async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id).lean();
    if (!stream) return res.status(404).json({ error: "Stream not found" });
    res.json({ stream });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/streams/:id/join — join stream (increment viewer count)
router.post("/:id/join", authenticate, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    if (!stream || stream.status !== "live") {
      return res.status(404).json({ error: "Stream is not live" });
    }
    stream.viewerCount += 1;
    if (stream.viewerCount > stream.peakViewers) stream.peakViewers = stream.viewerCount;
    await stream.save();
    await redis.del(STREAMS_CACHE_KEY);
    res.json({ stream });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/streams/:id/leave — leave stream (decrement viewer count)
router.post("/:id/leave", authenticate, async (req, res) => {
  try {
    const stream = await Stream.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewerCount: -1 } },
      { new: true }
    );
    if (!stream) return res.status(404).json({ error: "Stream not found" });
    // Don't let viewer count go below 0
    if (stream.viewerCount < 0) {
      stream.viewerCount = 0;
      await stream.save();
    }
    await redis.del(STREAMS_CACHE_KEY);
    res.json({ stream });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/streams/:id/end — end stream (host only)
router.patch("/:id/end", authenticate, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    if (!stream) return res.status(404).json({ error: "Stream not found" });
    if (stream.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the host can end the stream" });
    }

    stream.status = "ended";
    stream.endedAt = new Date();
    stream.viewerCount = 0;
    await stream.save();

    await User.findByIdAndUpdate(req.user._id, { isLive: false });
    await redis.del(STREAMS_CACHE_KEY);

    res.json({ stream });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
