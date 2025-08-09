const mongoose = require("mongoose");

const PushTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fcmToken: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      enum: ["android", "ios"],
      required: true,
    },
    deviceId: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsed: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes
PushTokenSchema.index({ userId: 1, isActive: 1 });
PushTokenSchema.index({ fcmToken: 1 }, { unique: true });
PushTokenSchema.index({ lastUsed: 1 });

const PushToken = mongoose.model("PushToken", PushTokenSchema);

module.exports = PushToken;
