const mongoose = require('mongoose');
const { Schema } = mongoose;

const newsSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String, // Lưu HTML hoặc markdown rich text
    required: true,
  },
  coverImage: {
    type: String, // base64
    required: false,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: Schema.Types.ObjectId, // ref tới Subject
    ref: 'Subject',
    required: true,
  },
  favorites: [{
    type: Schema.Types.ObjectId,
    ref: 'User', // Danh sách user yêu thích
  }],
  views: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true, // createdAt, updatedAt
});

module.exports = mongoose.model('News', newsSchema); 