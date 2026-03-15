const express = require("express");
const Gift = require("../models/Gift");
const User = require("../models/User");
const Stream = require("../models/Stream");
const Transaction = require("../models/Transaction");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// GET /api/gifts — list all available gifts
router.get("/", async (req, res) => {
  try {
    const gifts = await Gift.find({ isActive: true }).sort({ coinCost: 1 });
    // Seed default gifts if none exist
    if (gifts.length === 0) {
      const defaultGifts = [
        { name: "Rose", icon: "🌹", coinCost: 10, diamondValue: 8, category: "basic" },
        { name: "Heart", icon: "❤️", coinCost: 20, diamondValue: 16, category: "basic" },
        { name: "Star", icon: "⭐", coinCost: 50, diamondValue: 40, category: "premium" },
        { name: "Crown", icon: "👑", coinCost: 100, diamondValue: 80, category: "premium" },
        { name: "Diamond", icon: "💎", coinCost: 200, diamondValue: 170, category: "ultra" },
        { name: "Rocket", icon: "🚀", coinCost: 500, diamondValue: 425, category: "ultra" },
        { name: "Trophy", icon: "🏆", coinCost: 1000, diamondValue: 900, category: "legendary" },
        { name: "Fire", icon: "🔥", coinCost: 30, diamondValue: 25, category: "basic" },
      ];
      const seeded = await Gift.insertMany(defaultGifts);
      return res.json({ gifts: seeded });
    }
    res.json({ gifts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gifts/send — send a gift to a streamer
router.post("/send", authenticate, async (req, res) => {
  try {
    const { giftId, streamId, recipientId, quantity = 1 } = req.body;

    if (!giftId || !streamId || !recipientId) {
      return res.status(400).json({ error: "giftId, streamId, and recipientId are required" });
    }

    const gift = await Gift.findById(giftId);
    if (!gift || !gift.isActive) return res.status(404).json({ error: "Gift not found" });

    const totalCost = gift.coinCost * quantity;
    const sender = await User.findById(req.user._id);
    if (sender.coins < totalCost) {
      return res.status(400).json({ error: "Insufficient coins" });
    }

    const stream = await Stream.findById(streamId);
    if (!stream || stream.status !== "live") {
      return res.status(400).json({ error: "Stream is not live" });
    }

    const totalDiamonds = gift.diamondValue * quantity;

    // Deduct coins from sender
    await User.findByIdAndUpdate(req.user._id, { $inc: { coins: -totalCost } });

    // Credit diamonds to recipient
    await User.findByIdAndUpdate(recipientId, {
      $inc: { diamonds: totalDiamonds, totalGiftsReceived: totalDiamonds },
    });

    // Update stream gift total
    await Stream.findByIdAndUpdate(streamId, { $inc: { totalGiftsReceived: totalDiamonds } });

    // Record transactions
    await Transaction.create([
      {
        userId: req.user._id,
        type: "gift_sent",
        amount: -totalCost,
        currency: "coins",
        description: `Sent ${quantity}x ${gift.name} to stream`,
        metadata: { giftId: gift._id, streamId, recipientId },
      },
      {
        userId: recipientId,
        type: "gift_received",
        amount: totalDiamonds,
        currency: "diamonds",
        description: `Received ${quantity}x ${gift.name} from viewer`,
        metadata: { giftId: gift._id, streamId, recipientId: req.user._id },
      },
    ]);

    res.json({
      success: true,
      gift,
      totalCost,
      totalDiamonds,
      senderCoinsRemaining: sender.coins - totalCost,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
