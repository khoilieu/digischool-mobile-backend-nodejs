const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  // Thông tin học sinh
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming students are in User model
    required: true
  },
  
  // Thông tin tiết học cụ thể
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  
  // Thông tin lớp học
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  
  // Thông tin môn học
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  
  // Thông tin giáo viên dạy tiết đó
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Thông tin thời gian
  date: {
    type: Date,
    required: true
  },
  
  period: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  
  // Thông tin liên lạc
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  
  // Lý do xin vắng
  reason: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500
  },
  
  // Trạng thái đơn
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  // Nhận xét của giáo viên
  teacherComment: {
    type: String,
    trim: true,
    maxLength: 300
  },
  
  // Thời gian xử lý
  approvedAt: {
    type: Date
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Thời gian tạo và cập nhật
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
leaveRequestSchema.index({ studentId: 1, date: 1 });
leaveRequestSchema.index({ teacherId: 1, status: 1 });
leaveRequestSchema.index({ lessonId: 1 });
leaveRequestSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware to update updatedAt
leaveRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for formatted date
leaveRequestSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('vi-VN');
});

// Virtual for period display
leaveRequestSchema.virtual('periodDisplay').get(function() {
  return `Tiết ${this.period}`;
});

// Static methods
leaveRequestSchema.statics.findByStudent = function(studentId, options = {}) {
  const query = { studentId };
  if (options.status) query.status = options.status;
  if (options.startDate) query.date = { $gte: options.startDate };
  if (options.endDate) query.date = { ...query.date, $lte: options.endDate };
  
  return this.find(query)
    .populate('lessonId', 'lessonId type topic')
    .populate('subjectId', 'subjectName subjectCode')
    .populate('teacherId', 'name email')
    .populate('classId', 'className')
    .sort({ createdAt: -1 });
};

leaveRequestSchema.statics.findByTeacher = function(teacherId, options = {}) {
  const query = { teacherId };
  if (options.status) query.status = options.status;
  if (options.startDate) query.date = { $gte: options.startDate };
  if (options.endDate) query.date = { ...query.date, $lte: options.endDate };
  
  return this.find(query)
    .populate('studentId', 'name email')
    .populate('lessonId', 'lessonId type topic')
    .populate('subjectId', 'subjectName subjectCode')
    .populate('classId', 'className')
    .sort({ createdAt: -1 });
};

leaveRequestSchema.statics.findPendingByTeacher = function(teacherId) {
  return this.find({ teacherId, status: 'pending' })
    .populate('studentId', 'name email')
    .populate('lessonId', 'lessonId type topic scheduledDate')
    .populate('subjectId', 'subjectName subjectCode')
    .populate('classId', 'className')
    .sort({ createdAt: 1 }); // Oldest first for processing
};

// Instance methods
leaveRequestSchema.methods.approve = function(teacherId, comment = '') {
  if (this.teacherId.toString() !== teacherId.toString()) {
    throw new Error('Only the lesson teacher can approve this request');
  }
  
  this.status = 'approved';
  this.teacherComment = comment;
  this.approvedAt = new Date();
  this.approvedBy = teacherId;
  
  return this.save();
};

leaveRequestSchema.methods.reject = function(teacherId, comment = '') {
  if (this.teacherId.toString() !== teacherId.toString()) {
    throw new Error('Only the lesson teacher can reject this request');
  }
  
  if (!comment.trim()) {
    throw new Error('Comment is required when rejecting a request');
  }
  
  this.status = 'rejected';
  this.teacherComment = comment;
  this.approvedAt = new Date();
  this.approvedBy = teacherId;
  
  return this.save();
};

leaveRequestSchema.methods.canBeProcessedBy = function(teacherId) {
  return this.teacherId.toString() === teacherId.toString() && this.status === 'pending';
};

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema); 