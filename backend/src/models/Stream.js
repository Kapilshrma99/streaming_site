const mongoose = require("mongoose");

const streamSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", maxlength: 500 },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    hostUsername: { type: String, required: true },
    hostAvatar: { type: String, default: "" },
    status: { type: String, enum: ["live", "ended"], default: "live" },
    category: { type: String, default: "general" },
    thumbnail: { type: String, default: "" },
    viewerCount: { type: Number, default: 0, min: 0 },
    peakViewers: { type: Number, default: 0 },
    totalGiftsReceived: { type: Number, default: 0 },
    roomId: { type: String, required: true, unique: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

streamSchema.index({ status: 1, startedAt: -1 });
streamSchema.index({ hostId: 1 });

module.exports = mongoose.model("Stream", streamSchema);
