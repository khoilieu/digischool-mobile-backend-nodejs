const mongoose = require("mongoose");

const personalActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    period: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    remindAt: {
      type: Date,
      required: false,
      default: undefined,
    },
    time: {
      type: Number,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
personalActivitySchema.index({ user: 1, date: 1, period: 1 }, { unique: true });
personalActivitySchema.index({ remindAt: 1 });
personalActivitySchema.set("toJSON", { virtuals: true });
personalActivitySchema.set("toObject", { virtuals: true });

const PersonalActivity = mongoose.model(
  "PersonalActivity",
  personalActivitySchema
);

module.exports = PersonalActivity;
