const express = require("express");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// GET /api/wallet/balance
router.get("/balance", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("coins diamonds username displayName");
    res.json({ coins: user.coins, diamonds: user.diamonds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallet/transactions
router.get("/transactions", authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("metadata.giftId", "name icon")
        .lean(),
      Transaction.countDocuments({ userId: req.user._id }),
    ]);

    res.json({
      transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet/credit — INTERNAL: called by payment-service after successful payment
router.post("/credit", async (req, res) => {
  try {
    // Internal service authentication via shared secret
    const internalSecret = req.headers["x-internal-secret"];
    if (internalSecret !== process.env.JWT_SECRET) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { userId, coins, razorpayOrderId, razorpayPaymentId, planId, description } = req.body;
    if (!userId || !coins) return res.status(400).json({ error: "userId and coins required" });

    await User.findByIdAndUpdate(userId, { $inc: { coins } });

    await Transaction.create({
      userId,
      type: "coin_purchase",
      amount: coins,
      currency: "coins",
      description: description || `Purchased ${coins} coins`,
      metadata: { razorpayOrderId, razorpayPaymentId, coinPack: planId },
    });

    res.json({ success: true, coinsAdded: coins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
