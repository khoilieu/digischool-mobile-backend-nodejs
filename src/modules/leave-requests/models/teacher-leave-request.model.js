const mongoose = require('mongoose');

const teacherLeaveRequestSchema = new mongoose.Schema({
  // Thông tin giáo viên xin nghỉ
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: async function(teacherId) {
        const User = mongoose.model('User');
        const teacher = await User.findById(teacherId);
        return teacher && teacher.role.includes('teacher');
      },
      message: 'Teacher ID must reference a valid teacher user'
    }
  },
  
  // Thông tin tiết học cần xin nghỉ
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
  
  // Thông tin thời gian
  date: {
    type: Date,
    required: true
    // validate: {
    //   validator: function(date) {
    //     // Chỉ cho phép xin nghỉ các tiết trong tương lai
    //     return date > new Date();
    //   },
    //   message: 'Cannot request leave for past lessons'
    // }
  },
  
  period: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  
  // Lý do xin nghỉ
  reason: {
    type: String,
    required: true,
    trim: true,
    minLength: 10,
    maxLength: 500
  },
  
  // Thông tin liên lạc khẩn cấp
  emergencyContact: {
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9+\-\s\(\)]{10,15}$/
    },
    relationship: {
      type: String,
      trim: true,
      maxLength: 100
    }
  },
  
  // Trạng thái đơn
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  // Thông tin duyệt (chỉ manager mới có quyền duyệt)
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(managerId) {
        if (!managerId) return true; // Optional field
        const User = mongoose.model('User');
        const manager = await User.findById(managerId);
        return manager && (manager.role.includes('manager') || manager.role.includes('admin'));
      },
      message: 'Manager ID must reference a valid manager or admin user'
    }
  },
  
  // Nhận xét của manager
  managerComment: {
    type: String,
    trim: true,
    maxLength: 500
  },
  
  // Thời gian xử lý
  processedAt: {
    type: Date
  },
  
  // Thông tin giáo viên thay thế (nếu có)
  substituteTeacher: {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      maxLength: 300
    }
  },
  
  // Thông tin bài học thay thế/bù
  makeupLesson: {
    isRequired: {
      type: Boolean,
      default: true
    },
    proposedDate: {
      type: Date
    },
    proposedPeriod: {
      type: Number,
      min: 1,
      max: 10
    },
    status: {
      type: String,
      enum: ['not_scheduled', 'proposed', 'approved', 'completed'],
      default: 'not_scheduled'
    },
    notes: {
      type: String,
      trim: true,
      maxLength: 300
    }
  },
  
  // Tác động đến học sinh
  studentImpact: {
    totalStudents: {
      type: Number,
      default: 0
    },
    notificationSent: {
      type: Boolean,
      default: false
    },
    notificationSentAt: {
      type: Date
    }
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
teacherLeaveRequestSchema.index({ teacherId: 1, date: 1 });
teacherLeaveRequestSchema.index({ managerId: 1, status: 1 });
teacherLeaveRequestSchema.index({ lessonId: 1 });
teacherLeaveRequestSchema.index({ status: 1, date: 1 });

// Pre-save middleware to update updatedAt
teacherLeaveRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static methods
teacherLeaveRequestSchema.statics.findByTeacher = function(teacherId, options = {}) {
  const query = { teacherId };
  if (options.status) query.status = options.status;
  if (options.startDate) query.date = { $gte: options.startDate };
  if (options.endDate) query.date = { ...query.date, $lte: options.endDate };
  
  return this.find(query)
    .populate('lessonId', 'lessonId type topic scheduledDate')
    .populate('subjectId', 'subjectName subjectCode')
    .populate('classId', 'className')
    .populate('managerId', 'name email')
    .populate('substituteTeacher.teacherId', 'name email')
    .sort({ createdAt: -1 });
};

teacherLeaveRequestSchema.statics.findPendingForManager = function(options = {}) {
  const query = { status: 'pending' };
  if (options.startDate) query.date = { $gte: options.startDate };
  if (options.endDate) query.date = { ...query.date, $lte: options.endDate };
  
  return this.find(query)
    .populate('teacherId', 'name email fullName')
    .populate('lessonId', 'lessonId type topic scheduledDate')
    .populate('subjectId', 'subjectName subjectCode')
    .populate('classId', 'className')
    .sort({ date: 1, period: 1 }); // Sort by date and period
};

teacherLeaveRequestSchema.statics.findByManager = function(managerId, options = {}) {
  const query = { managerId };
  if (options.status) query.status = options.status;
  if (options.startDate) query.date = { $gte: options.startDate };
  if (options.endDate) query.date = { ...query.date, $lte: options.endDate };
  
  return this.find(query)
    .populate('teacherId', 'name email fullName')
    .populate('lessonId', 'lessonId type topic scheduledDate')
    .populate('subjectId', 'subjectName subjectCode')
    .populate('classId', 'className')
    .populate('substituteTeacher.teacherId', 'name email')
    .sort({ createdAt: -1 });
};

// Instance methods
teacherLeaveRequestSchema.methods.canBeProcessedBy = function(managerId) {
  return this.status === 'pending';
};

teacherLeaveRequestSchema.methods.approve = function(managerId, comment = '') {
  this.status = 'approved';
  this.managerComment = comment;
  this.managerId = managerId;
  this.processedAt = new Date();
  
  return this.save();
};

teacherLeaveRequestSchema.methods.reject = function(managerId, comment) {
  if (!comment || !comment.trim()) {
    throw new Error('Comment is required when rejecting a teacher leave request');
  }
  
  this.status = 'rejected';
  this.managerComment = comment;
  this.managerId = managerId;
  this.processedAt = new Date();
  
  return this.save();
};

teacherLeaveRequestSchema.methods.assignSubstitute = function(substituteTeacherId, assignedBy, notes = '') {
  this.substituteTeacher = {
    teacherId: substituteTeacherId,
    assignedBy: assignedBy,
    assignedAt: new Date(),
    notes: notes
  };
  
  return this.save();
};

teacherLeaveRequestSchema.methods.scheduleMakeupLesson = function(proposedDate, proposedPeriod, notes = '') {
  this.makeupLesson = {
    isRequired: true,
    proposedDate: proposedDate,
    proposedPeriod: proposedPeriod,
    status: 'proposed',
    notes: notes
  };
  
  return this.save();
};

module.exports = mongoose.model('TeacherLeaveRequest', teacherLeaveRequestSchema); 