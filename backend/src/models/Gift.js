const mongoose = require("mongoose");

const giftSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    icon: { type: String, required: true }, // emoji or image URL
    coinCost: { type: Number, required: true, min: 1 },
    diamondValue: { type: Number, required: true, min: 1 },
    description: { type: String, default: "" },
    category: { type: String, default: "basic" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Gift", giftSchema);
