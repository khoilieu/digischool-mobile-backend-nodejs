const mongoose = require('mongoose');

const lessonRequirementSchema = new mongoose.Schema({
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  gradeLevel: {
    type: Number,
    required: true,
    enum: [10, 11, 12]
  },
  requiredLessons: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },
  academicYear: {
    type: String,
    required: true
  },
  semester: {
    type: Number,
    required: true,
    enum: [1, 2]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index để tối ưu query
lessonRequirementSchema.index({ 
  subject: 1, 
  gradeLevel: 1, 
  academicYear: 1, 
  semester: 1 
});

// Đảm bảo không có duplicate cho cùng subject, gradeLevel, academicYear, semester
lessonRequirementSchema.index({ 
  subject: 1, 
  gradeLevel: 1, 
  academicYear: 1, 
  semester: 1 
}, { unique: true });

module.exports = mongoose.model('LessonRequirement', lessonRequirementSchema); 