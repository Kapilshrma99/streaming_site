require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Coin plans
const COIN_PLANS = [
  { id: "starter", coins: 100, pricePaise: 1000, label: "Starter Pack", bonus: 0 },
  { id: "popular", coins: 500, pricePaise: 4500, label: "Popular Pack", bonus: 50 },
  { id: "pro", coins: 1000, pricePaise: 8000, label: "Pro Pack", bonus: 200 },
  { id: "elite", coins: 3000, pricePaise: 21000, label: "Elite Pack", bonus: 1000 },
];

// JWT middleware
const authenticate = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// GET /plans
app.get("/plans", (req, res) => {
  res.json({ plans: COIN_PLANS });
});

// POST /order — create a Razorpay order
app.post("/order", authenticate, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = COIN_PLANS.find((p) => p.id === planId);
    if (!plan) return res.status(400).json({ error: "Invalid plan" });

    const order = await razorpay.orders.create({
      amount: plan.pricePaise,
      currency: "INR",
      receipt: `order_${req.userId}_${Date.now()}`,
      notes: {
        userId: req.userId,
        planId: plan.id,
        coins: plan.coins + plan.bonus,
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Razorpay order error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// POST /verify — verify payment and credit coins
app.post("/verify", authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const plan = COIN_PLANS.find((p) => p.id === planId);
    if (!plan) return res.status(400).json({ error: "Invalid plan" });

    const totalCoins = plan.coins + plan.bonus;

    // Credit coins to user via backend API
    await axios.post(
      `${process.env.BACKEND_URL}/api/wallet/credit`,
      {
        userId: req.userId,
        coins: totalCoins,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        planId: plan.id,
        description: `Purchased ${plan.label}: ${totalCoins} coins`,
      },
      { headers: { "x-internal-secret": process.env.JWT_SECRET } }
    );

    res.json({
      success: true,
      coinsAdded: totalCoins,
      message: `Successfully added ${totalCoins} coins to your wallet!`,
    });
  } catch (err) {
    console.error("Payment verify error:", err.message);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "payment-service" });
});

const PORT = process.env.PORT || 6000;
app.listen(PORT, () => console.log(`🚀 Payment Service running on port ${PORT}`));
