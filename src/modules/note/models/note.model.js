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
      required: true,
      default: Date.now,
    },
    time: {
      type: Number,
      required: true,
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

// Virtuals
noteSchema.virtual("userInfo", {
  ref: "User",
  localField: "user",
  foreignField: "_id",
  justOne: true,
  select: "name email role",
});

noteSchema.virtual("lessonInfo", {
  ref: "Lesson",
  localField: "lesson",
  foreignField: "_id",
  justOne: true,
  select: "subject teacher scheduledDate timeSlot",
});

// Methods
noteSchema.methods.isOverdue = function () {
  return this.remindAt < new Date();
};

noteSchema.methods.getTimeUntilReminder = function () {
  const now = new Date();
  const timeDiff = this.remindAt.getTime() - now.getTime();
  return Math.max(0, timeDiff);
};

// Static methods
noteSchema.statics.findByUserAndLesson = async function (userId, lessonId) {
  return await this.find({ user: userId, lesson: lessonId })
    .populate("userInfo")
    .populate("lessonInfo")
    .sort({ createdAt: -1 });
};

noteSchema.statics.findOverdueNotes = async function () {
  const now = new Date();
  return await this.find({ remindAt: { $lt: now } })
    .populate("userInfo")
    .populate("lessonInfo");
};

// Ensure virtual fields are included in JSON output
noteSchema.set("toJSON", { virtuals: true });
noteSchema.set("toObject", { virtuals: true });

const Note = mongoose.model("Note", noteSchema);

module.exports = Note;
