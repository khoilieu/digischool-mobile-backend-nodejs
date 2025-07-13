const mongoose = require('mongoose');
const { Schema } = mongoose;

const noteSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lesson: {
    type: Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true,
  },
  remindAt: {
    type: Date,
    required: true,
  },
  time: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});
module.exports = mongoose.model("Note", noteSchema);
