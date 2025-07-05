const mongoose = require('mongoose');

const lessonRequestSchema = new mongoose.Schema({
  // Unique identifier cho lesson request
  requestId: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },

  // Loại yêu cầu
  requestType: {
    type: String,
    enum: ['swap', 'makeup'],
    required: true
  },

  // Thông tin giáo viên yêu cầu
  requestingTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Thông tin tiết học gốc (tiết cần đổi hoặc tiết absent cần dạy bù)
  originalLesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },

  // Thông tin tiết học thay thế 
  // - Với swap: tiết trống sẽ được đổi
  // - Với makeup: tiết trống sẽ được tạo thành tiết makeup
  replacementLesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },

  // Lý do yêu cầu
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

  // Thông tin đặc biệt cho makeup
  makeupInfo: {
    // Ngày gốc của tiết absent
    originalDate: Date,
    // Lý do absent
    absentReason: String,
    // Tiết makeup đã được tạo (sau khi approve)
    createdMakeupLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
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
lessonRequestSchema.index({ requestId: 1 }, { unique: true });
lessonRequestSchema.index({ requestingTeacher: 1, status: 1 });
lessonRequestSchema.index({ originalLesson: 1 });
lessonRequestSchema.index({ replacementLesson: 1 });
lessonRequestSchema.index({ status: 1, createdAt: -1 });
lessonRequestSchema.index({ requestType: 1, status: 1 });
lessonRequestSchema.index({ 'additionalInfo.classInfo': 1 });
lessonRequestSchema.index({ 'additionalInfo.academicYear': 1 });

// Virtual để lấy thông tin chi tiết
lessonRequestSchema.virtual('originalLessonDetails', {
  ref: 'Lesson',
  localField: 'originalLesson',
  foreignField: '_id',
  justOne: true
});

lessonRequestSchema.virtual('replacementLessonDetails', {
  ref: 'Lesson',
  localField: 'replacementLesson',
  foreignField: '_id',
  justOne: true
});

// Method để generate requestId nếu chưa có
lessonRequestSchema.pre('save', function(next) {
  if (!this.requestId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const prefix = this.requestType === 'swap' ? 'SWAP' : 'MAKEUP';
    this.requestId = `${prefix}_${timestamp}_${random}`.toUpperCase();
  }
  next();
});

// Static method để tìm requests theo teacher
lessonRequestSchema.statics.findByTeacher = function(teacherId, options = {}) {
  const query = { requestingTeacher: teacherId };
  
  if (options.status) query.status = options.status;
  if (options.requestType) query.requestType = options.requestType;
  if (options.startDate) query.createdAt = { $gte: options.startDate };
  if (options.endDate) {
    query.createdAt = { ...query.createdAt, $lte: options.endDate };
  }
  
  return this.find(query)
    .populate({
      path: 'originalLesson',
      select: 'lessonId scheduledDate timeSlot topic status type',
      populate: {
        path: 'timeSlot',
        select: 'period name startTime endTime'
      }
    })
    .populate({
      path: 'replacementLesson',
      select: 'lessonId scheduledDate timeSlot topic status type',
      populate: {
        path: 'timeSlot',
        select: 'period name startTime endTime'
      }
    })
    .populate('requestingTeacher', 'name email fullName')
    .populate('processedBy', 'name email fullName')
    .populate('additionalInfo.classInfo', 'className gradeLevel')
    .populate('additionalInfo.subjectInfo', 'subjectName subjectCode')
    .populate('additionalInfo.academicYear', 'name startDate endDate')
    .populate('makeupInfo.createdMakeupLesson', 'lessonId scheduledDate timeSlot status')
    .sort({ createdAt: -1 });
};

// Static method để tìm pending requests
lessonRequestSchema.statics.findPendingRequests = function(options = {}) {
  const query = { status: 'pending' };
  
  if (options.requestType) query.requestType = options.requestType;
  if (options.academicYear) query['additionalInfo.academicYear'] = options.academicYear;
  if (options.classId) query['additionalInfo.classInfo'] = options.classId;
  
  return this.find(query)
    .populate({
      path: 'originalLesson',
      select: 'lessonId scheduledDate timeSlot topic status type',
      populate: {
        path: 'timeSlot',
        select: 'period name startTime endTime'
      }
    })
    .populate({
      path: 'replacementLesson',
      select: 'lessonId scheduledDate timeSlot topic status type',
      populate: {
        path: 'timeSlot',
        select: 'period name startTime endTime'
      }
    })
    .populate('requestingTeacher', 'name email fullName')
    .populate('additionalInfo.classInfo', 'className gradeLevel')
    .populate('additionalInfo.subjectInfo', 'subjectName subjectCode')
    .populate('additionalInfo.academicYear', 'name startDate endDate')
    .populate('makeupInfo.createdMakeupLesson', 'lessonId scheduledDate timeSlot status')
    .sort({ createdAt: -1 });
};

const LessonRequest = mongoose.model('LessonRequest', lessonRequestSchema);

module.exports = LessonRequest; 