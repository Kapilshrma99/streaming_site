const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["coin_purchase", "gift_sent", "gift_received", "coin_refund"],
      required: true,
    },
    amount: { type: Number, required: true }, // positive = credit, negative = debit
    currency: { type: String, enum: ["coins", "diamonds"], required: true },
    description: { type: String, required: true },
    metadata: {
      giftId: { type: mongoose.Schema.Types.ObjectId, ref: "Gift" },
      streamId: { type: mongoose.Schema.Types.ObjectId, ref: "Stream" },
      recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
      coinPack: { type: String },
    },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
