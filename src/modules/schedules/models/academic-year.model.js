const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{4}$/.test(v);
      },
      message: 'Academic year must be in format YYYY-YYYY (e.g., 2024-2025)'
    }
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalWeeks: {
    type: Number,
    required: true,
    default: 38,
    min: 30,
    max: 40
  },
  isActive: {
    type: Boolean,
    default: false // Chỉ có 1 năm học active tại 1 thời điểm
  }
}, {
  timestamps: true
});

// Index để tối ưu hóa
academicYearSchema.index({ name: 1 });
academicYearSchema.index({ isActive: 1 });
academicYearSchema.index({ startDate: 1, endDate: 1 });

// Virtual để tính số tuần thực tế
academicYearSchema.virtual('actualWeeks').get(function() {
  const diffTime = Math.abs(this.endDate - this.startDate);
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  return diffWeeks;
});

// Method để kiểm tra năm học có đang hoạt động không
academicYearSchema.methods.isCurrent = function() {
  const now = new Date();
  return now >= this.startDate && now <= this.endDate && this.isActive;
};

// Static method để lấy năm học hiện tại
academicYearSchema.statics.getCurrentAcademicYear = function() {
  return this.findOne({
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() }
  });
};

// Static method để lấy năm học theo tên
academicYearSchema.statics.getByName = function(name) {
  return this.findOne({ name });
};

// Middleware để đảm bảo chỉ có 1 năm học active
academicYearSchema.pre('save', async function(next) {
  if (this.isActive && this.isModified('isActive')) {
    // Deactivate tất cả năm học khác
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  next();
});

const AcademicYear = mongoose.model('AcademicYear', academicYearSchema);

module.exports = AcademicYear; 