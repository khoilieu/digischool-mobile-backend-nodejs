const mongoose = require('mongoose');

const substituteRequestSchema = new mongoose.Schema({
  // Unique identifier
  requestId: {
    type: String,
    unique: true
  },

  // Lesson being substituted
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },

  // Teacher requesting substitution
  requestingTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Candidate substitute teachers
  candidateTeachers: [{
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    responseDate: {
      type: Date
    },
    rejectionReason: {
      type: String,
      maxlength: 500
    }
  }],

  // Approved substitute teacher (when someone approves)
  approvedTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Request details
  reason: {
    type: String,
    required: true,
    maxlength: 1000
  },

  // Request status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },

  // Timestamps
  requestDate: {
    type: Date,
    default: Date.now
  },

  approvalDate: {
    type: Date
  },

  // Email tracking
  emailsSent: [{
    type: {
      type: String,
      enum: ['request', 'approval', 'rejection', 'notification']
    },
    recipients: [String],
    sentAt: {
      type: Date,
      default: Date.now
    },
    subject: String
  }],

  // Notes
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes
substituteRequestSchema.index({ lesson: 1 });
substituteRequestSchema.index({ requestingTeacher: 1 });
substituteRequestSchema.index({ status: 1 });
substituteRequestSchema.index({ 'candidateTeachers.teacher': 1 });
substituteRequestSchema.index({ requestDate: 1 });

// Generate unique request ID
substituteRequestSchema.pre('save', function(next) {
  if (!this.requestId) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.requestId = `SUB_${date}_${random}`;
  }
  next();
});

// Method to approve request by a candidate teacher
substituteRequestSchema.methods.approveByTeacher = async function(teacherId) {
  // Debug logging
  console.log('🔍 Approving request by teacher:', teacherId);
  console.log('📝 Candidate teachers:', this.candidateTeachers.map(c => ({
    id: c.teacher.toString(),
    status: c.status
  })));
  
  // Find the candidate teacher with proper ObjectId comparison
  const candidate = this.candidateTeachers.find(c => {
    const candidateId = c.teacher._id ? c.teacher._id.toString() : c.teacher.toString();
    const teacherIdStr = teacherId._id ? teacherId._id.toString() : teacherId.toString();
    return candidateId === teacherIdStr;
  });
  
  if (!candidate) {
    console.error('❌ Teacher not found in candidates. Teacher ID:', teacherId);
    console.error('❌ Available candidates:', this.candidateTeachers.map(c => c.teacher.toString()));
    throw new Error('Teacher not found in candidate list');
  }

  if (candidate.status !== 'pending') {
    throw new Error('Request already responded to by this teacher');
  }

  if (this.status !== 'pending') {
    throw new Error('Request is no longer pending');
  }

  // Update candidate status
  candidate.status = 'approved';
  candidate.responseDate = new Date();

  // Update overall request status
  this.status = 'approved';
  this.approvedTeacher = teacherId;
  this.approvalDate = new Date();

  // Mark other candidates as rejected (since one teacher approved)
  this.candidateTeachers.forEach(c => {
    const candidateId = c.teacher._id ? c.teacher._id.toString() : c.teacher.toString();
    const teacherIdStr = teacherId._id ? teacherId._id.toString() : teacherId.toString();
    if (candidateId !== teacherIdStr && c.status === 'pending') {
      c.status = 'rejected';
      c.responseDate = new Date();
    }
  });

  await this.save();
  return this;
};

// Method to reject request by a candidate teacher
substituteRequestSchema.methods.rejectByTeacher = async function(teacherId, reason) {
  // Find the candidate teacher with proper ObjectId comparison
  const candidate = this.candidateTeachers.find(c => {
    const candidateId = c.teacher._id ? c.teacher._id.toString() : c.teacher.toString();
    const teacherIdStr = teacherId._id ? teacherId._id.toString() : teacherId.toString();
    return candidateId === teacherIdStr;
  });
  
  if (!candidate) {
    console.error('❌ Teacher not found in candidates for rejection. Teacher ID:', teacherId);
    throw new Error('Teacher not found in candidate list');
  }

  if (candidate.status !== 'pending') {
    throw new Error('Request already responded to by this teacher');
  }

  // Update candidate status
  candidate.status = 'rejected';
  candidate.responseDate = new Date();
  candidate.rejectionReason = reason || 'No reason provided';

  // Check if all candidates have rejected
  const allRejected = this.candidateTeachers.every(c => c.status === 'rejected');
  if (allRejected) {
    this.status = 'rejected';
  }

  await this.save();
  return this;
};

// Method to cancel request
substituteRequestSchema.methods.cancel = async function() {
  if (this.status !== 'pending') {
    throw new Error('Can only cancel pending requests');
  }

  this.status = 'cancelled';
  await this.save();
  return this;
};

// Static method to find available substitute teachers
substituteRequestSchema.statics.findAvailableTeachers = async function(lessonId) {
  const Lesson = mongoose.model('Lesson');
  const User = mongoose.model('User');
  
  // Get the lesson details
  const lesson = await Lesson.findById(lessonId)
    .populate('subject', 'subjectName')
    .populate('timeSlot', 'period startTime endTime');
  
  if (!lesson) {
    throw new Error('Lesson not found');
  }

  // Find ALL teachers who teach the same subject (không kiểm tra xung đột thời gian)
  // Bao gồm cả những giáo viên đang dạy tiết khác cùng thời gian
  const availableTeachers = await User.find({
    role: { $in: ['teacher'] },
    $or: [
      { subject: lesson.subject._id },
      { subjects: lesson.subject._id }
    ],
    _id: { $ne: lesson.teacher } // Exclude the requesting teacher
  }).select('name email subject subjects');

  // Thêm thông tin về xung đột thời gian để frontend hiển thị
  const teachersWithConflictInfo = [];
  
  for (const teacher of availableTeachers) {
    const conflictLesson = await Lesson.findOne({
      teacher: teacher._id,
      scheduledDate: lesson.scheduledDate,
      timeSlot: lesson.timeSlot._id,
      status: { $nin: ['cancelled'] }
    }).populate('class', 'className').populate('subject', 'subjectName');

    teachersWithConflictInfo.push({
      ...teacher.toObject(),
      hasConflict: !!conflictLesson,
      conflictLesson: conflictLesson ? {
        className: conflictLesson.class.className,
        subjectName: conflictLesson.subject.subjectName,
        lessonId: conflictLesson.lessonId
      } : null
    });
  }

  return teachersWithConflictInfo;
};

// Static method to get teacher's substitute requests
substituteRequestSchema.statics.getTeacherRequests = function(teacherId, status = null) {
  const query = {
    $or: [
      { requestingTeacher: teacherId },
      { 'candidateTeachers.teacher': teacherId }
    ]
  };

  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('lesson', 'lessonId scheduledDate topic status')
    .populate('lesson.class', 'className')
    .populate('lesson.subject', 'subjectName')
    .populate('lesson.timeSlot', 'period startTime endTime')
    .populate('requestingTeacher', 'name email')
    .populate('candidateTeachers.teacher', 'name email')
    .populate('approvedTeacher', 'name email')
    .sort({ requestDate: -1 });
};

const SubstituteRequest = mongoose.model('SubstituteRequest', substituteRequestSchema);

module.exports = SubstituteRequest; 