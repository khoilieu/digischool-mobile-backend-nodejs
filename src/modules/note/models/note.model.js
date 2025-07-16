const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
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
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
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
noteSchema.index({ user: 1, createdAt: -1 });
noteSchema.index({ lesson: 1 });
noteSchema.index({ user: 1, lesson: 1 });
noteSchema.index({ remindAt: 1 });

// Ensure virtual fields are included in JSON output
noteSchema.set("toJSON", { virtuals: true });
noteSchema.set("toObject", { virtuals: true });

const Note = mongoose.model("Note", noteSchema);

module.exports = Note;
