const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receivers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    receiverScope: {
      type: Object,
      required: true,
    },
    relatedObject: {
      id: { type: mongoose.Schema.Types.ObjectId, required: false },
      requestType: { type: String, required: false },
    },
    isReadBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// Indexes
NotificationSchema.index({ receivers: 1, createdAt: -1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ "receiverScope.type": 1 });
NotificationSchema.index({ "receiverScope.ids": 1 });

// Ensure virtual fields are included in JSON output
NotificationSchema.set("toJSON", { virtuals: true });
NotificationSchema.set("toObject", { virtuals: true });

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;
