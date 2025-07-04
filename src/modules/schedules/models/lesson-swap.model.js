const mongoose = require('mongoose');

const lessonSwapSchema = new mongoose.Schema({
  // Unique identifier cho lesson swap request
  swapId: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },

  // Thông tin giáo viên yêu cầu đổi tiết
  requestingTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Thông tin tiết học cần đổi (tiết hiện tại)
  originalLesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },

  // Thông tin tiết học thay thế (tiết trống)
  replacementLesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },

  // Lý do đổi tiết
  reason: {
    type: String,
    required: true,
    maxlength: 500
  },

  // Trạng thái yêu cầu
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  // Thông tin manager xử lý
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Nhận xét của manager
  managerComment: {
    type: String,
    maxlength: 500
  },

  // Thời gian xử lý
  processedAt: {
    type: Date
  },

  // Thông tin bổ sung
  additionalInfo: {
    // Thông tin lớp học
    classInfo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    },
    
    // Thông tin môn học
    subjectInfo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    },
    
    // Thông tin năm học
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear'
    },
    
    // Tuần học
    weekInfo: {
      startOfWeek: Date,
      endOfWeek: Date
    }
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
lessonSwapSchema.index({ swapId: 1 }, { unique: true });
lessonSwapSchema.index({ requestingTeacher: 1, status: 1 });
lessonSwapSchema.index({ originalLesson: 1 });
lessonSwapSchema.index({ replacementLesson: 1 });
lessonSwapSchema.index({ status: 1, createdAt: -1 });
lessonSwapSchema.index({ 'additionalInfo.classInfo': 1 });
lessonSwapSchema.index({ 'additionalInfo.academicYear': 1 });

// Virtual để lấy thông tin chi tiết
lessonSwapSchema.virtual('originalLessonDetails', {
  ref: 'Lesson',
  localField: 'originalLesson',
  foreignField: '_id',
  justOne: true
});

lessonSwapSchema.virtual('replacementLessonDetails', {
  ref: 'Lesson',
  localField: 'replacementLesson',
  foreignField: '_id',
  justOne: true
});

// Method để generate swapId nếu chưa có
lessonSwapSchema.pre('save', function(next) {
  if (!this.swapId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.swapId = `SWAP_${timestamp}_${random}`.toUpperCase();
  }
  next();
});

// Static method để tìm swap requests theo teacher
lessonSwapSchema.statics.findByTeacher = function(teacherId, options = {}) {
  const query = { requestingTeacher: teacherId };
  
  if (options.status) query.status = options.status;
  if (options.startDate) query.createdAt = { $gte: options.startDate };
  if (options.endDate) {
    query.createdAt = { ...query.createdAt, $lte: options.endDate };
  }
  
  return this.find(query)
    .populate('originalLesson', 'lessonId scheduledDate timeSlot topic status')
    .populate('replacementLesson', 'lessonId scheduledDate timeSlot topic status')
    .populate('requestingTeacher', 'name email fullName')
    .populate('processedBy', 'name email fullName')
    .populate('additionalInfo.classInfo', 'className gradeLevel')
    .populate('additionalInfo.subjectInfo', 'subjectName subjectCode')
    .populate('additionalInfo.academicYear', 'name startDate endDate')
    .sort({ createdAt: -1 });
};

// Static method để tìm pending requests
lessonSwapSchema.statics.findPendingRequests = function(options = {}) {
  const query = { status: 'pending' };
  
  if (options.academicYear) query['additionalInfo.academicYear'] = options.academicYear;
  if (options.classId) query['additionalInfo.classInfo'] = options.classId;
  
  return this.find(query)
    .populate('originalLesson', 'lessonId scheduledDate timeSlot topic status')
    .populate('replacementLesson', 'lessonId scheduledDate timeSlot topic status')
    .populate('requestingTeacher', 'name email fullName')
    .populate('additionalInfo.classInfo', 'className gradeLevel')
    .populate('additionalInfo.subjectInfo', 'subjectName subjectCode')
    .populate('additionalInfo.academicYear', 'name startDate endDate')
    .sort({ createdAt: -1 });
};

const LessonSwap = mongoose.model('LessonSwap', lessonSwapSchema);

module.exports = LessonSwap; 