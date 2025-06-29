const mongoose = require('mongoose');

const teacherLessonEvaluationSchema = new mongoose.Schema({
  // Thông tin cơ bản
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: async function(teacherId) {
        const User = mongoose.model('User');
        const teacher = await User.findById(teacherId);
        return teacher && (teacher.role.includes('teacher') || teacher.role.includes('homeroom_teacher'));
      },
      message: 'Teacher ID must reference a valid teacher user'
    }
  },
  
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  
  // Thông tin tiết học
  lessonContent: {
    // Tiết chương trình (lesson number in curriculum)
    curriculumLesson: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    
    // Nội dung bài học
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    
    // Mô tả thêm (optional)
    description: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  
  // Đánh giá chất lượng tiết học
  evaluation: {
    // Xếp hạng: A+, A, B+, B, C
    rating: {
      type: String,
      required: true,
      enum: ['A+', 'A', 'B+', 'B', 'C'],
      validate: {
        validator: function(value) {
          return ['A+', 'A', 'B+', 'B', 'C'].includes(value);
        },
        message: 'Rating must be one of: A+, A, B+, B, C'
      }
    },
    
    // Nhận xét của giáo viên
    comments: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    
    // Đánh giá chi tiết (optional)
    details: {
      // Mức độ tương tác của học sinh
      studentEngagement: {
        type: String,
        enum: ['excellent', 'good', 'average', 'poor'],
        default: 'average'
      },
      
      // Mức độ hiểu bài của lớp
      comprehensionLevel: {
        type: String,
        enum: ['excellent', 'good', 'average', 'poor'],
        default: 'average'
      },
      
      // Hoàn thành mục tiêu bài học
      objectiveCompletion: {
        type: String,
        enum: ['fully', 'mostly', 'partially', 'not_completed'],
        default: 'fully'
      }
    }
  },
  
  // Thông tin học sinh vắng
  absentStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      validate: {
        validator: async function(studentId) {
          const User = mongoose.model('User');
          const student = await User.findById(studentId);
          return student && student.role.includes('student');
        },
        message: 'Student ID must reference a valid student user'
      }
    },
    
    // Vắng có phép hay không
    isExcused: {
      type: Boolean,
      required: true,
      default: false
    },
    
    // Lý do vắng (nếu có)
    reason: {
      type: String,
      trim: true,
      maxlength: 200
    },
    
    // Thời gian ghi nhận vắng
    recordedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Kiểm tra miệng
  oralTests: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      validate: {
        validator: async function(studentId) {
          const User = mongoose.model('User');
          const student = await User.findById(studentId);
          return student && student.role.includes('student');
        },
        message: 'Student ID must reference a valid student user'
      }
    },
    
    // Điểm số (0-10)
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
      validate: {
        validator: function(value) {
          // Cho phép điểm với 1 chữ số thập phân
          return Number.isFinite(value) && value >= 0 && value <= 10;
        },
        message: 'Score must be a number between 0 and 10'
      }
    },
    
    // Nội dung câu hỏi/bài kiểm tra
    question: {
      type: String,
      trim: true,
      maxlength: 500
    },
    
    // Nhận xét
    comment: {
      type: String,
      trim: true,
      maxlength: 300
    },
    
    // Thời gian kiểm tra
    testedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Vi phạm của học sinh
  violations: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      validate: {
        validator: async function(studentId) {
          const User = mongoose.model('User');
          const student = await User.findById(studentId);
          return student && student.role.includes('student');
        },
        message: 'Student ID must reference a valid student user'
      }
    },
    
    // Mô tả vi phạm
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    
    // Loại vi phạm
    type: {
      type: String,
      enum: ['late', 'disruptive', 'unprepared', 'disrespectful', 'cheating', 'other'],
      default: 'other'
    },
    
    // Mức độ nghiêm trọng
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'serious'],
      default: 'minor'
    },
    
    // Biện pháp xử lý
    action: {
      type: String,
      trim: true,
      maxlength: 300
    },
    
    // Thời gian ghi nhận vi phạm
    recordedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Thống kê tổng quan
  summary: {
    // Tổng số học sinh có mặt
    totalPresent: {
      type: Number,
      default: 0
    },
    
    // Tổng số học sinh vắng
    totalAbsent: {
      type: Number,
      default: 0
    },
    
    // Số học sinh vắng có phép
    totalExcusedAbsent: {
      type: Number,
      default: 0
    },
    
    // Số học sinh kiểm tra miệng
    totalOralTests: {
      type: Number,
      default: 0
    },
    
    // Điểm trung bình kiểm tra miệng
    averageOralScore: {
      type: Number,
      default: 0
    },
    
    // Tổng số vi phạm
    totalViolations: {
      type: Number,
      default: 0
    }
  },
  
  // Trạng thái đánh giá
  status: {
    type: String,
    enum: ['draft', 'completed', 'submitted'],
    default: 'draft'
  },
  
  // Thời gian hoàn thành đánh giá
  completedAt: {
    type: Date
  },
  
  // Thời gian submit đánh giá
  submittedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
teacherLessonEvaluationSchema.index({ lesson: 1, teacher: 1 }, { unique: true }); // Mỗi giáo viên chỉ đánh giá 1 lần cho 1 tiết
teacherLessonEvaluationSchema.index({ teacher: 1, createdAt: -1 });
teacherLessonEvaluationSchema.index({ class: 1, createdAt: -1 });
teacherLessonEvaluationSchema.index({ subject: 1, createdAt: -1 });
teacherLessonEvaluationSchema.index({ status: 1 });
teacherLessonEvaluationSchema.index({ 'evaluation.rating': 1 });

// Pre-save middleware để tính toán summary
teacherLessonEvaluationSchema.pre('save', function(next) {
  // Tính tổng số học sinh vắng
  this.summary.totalAbsent = this.absentStudents.length;
  this.summary.totalExcusedAbsent = this.absentStudents.filter(absent => absent.isExcused).length;
  
  // Tính thống kê kiểm tra miệng
  this.summary.totalOralTests = this.oralTests.length;
  if (this.oralTests.length > 0) {
    const totalScore = this.oralTests.reduce((sum, test) => sum + test.score, 0);
    this.summary.averageOralScore = Math.round((totalScore / this.oralTests.length) * 10) / 10;
  } else {
    this.summary.averageOralScore = 0;
  }
  
  // Tính tổng số vi phạm
  this.summary.totalViolations = this.violations.length;
  
  // Tính số học sinh có mặt (cần lấy từ lesson)
  // Sẽ được tính trong controller khi có thông tin đầy đủ
  
  next();
});

// Pre-save validation
teacherLessonEvaluationSchema.pre('save', async function(next) {
  try {
    const Lesson = mongoose.model('Lesson');
    const User = mongoose.model('User');
    
    // Kiểm tra lesson tồn tại và giáo viên có quyền đánh giá
    const lesson = await Lesson.findById(this.lesson);
    if (!lesson) {
      throw new Error('Lesson not found');
    }
    
    // Kiểm tra giáo viên có phải là giáo viên dạy tiết này không
    if (lesson.teacher.toString() !== this.teacher.toString()) {
      throw new Error('Teacher can only evaluate their own lessons');
    }
    
    // Kiểm tra lesson có thể đánh giá không (chỉ đánh giá lesson scheduled)
    if (lesson.status !== 'scheduled') {
      throw new Error('Can only evaluate scheduled lessons');
    }
    
    // Kiểm tra thông tin class và subject khớp với lesson
    if (lesson.class.toString() !== this.class.toString()) {
      throw new Error('Class mismatch with lesson');
    }
    
    if (lesson.subject.toString() !== this.subject.toString()) {
      throw new Error('Subject mismatch with lesson');
    }
    
    // Kiểm tra tất cả học sinh trong danh sách thuộc lớp này
    const allStudentIds = [
      ...this.absentStudents.map(a => a.student),
      ...this.oralTests.map(o => o.student),
      ...this.violations.map(v => v.student)
    ];
    
    if (allStudentIds.length > 0) {
      // Loại bỏ duplicate student IDs
      const uniqueStudentIds = [...new Set(allStudentIds.map(id => id.toString()))];
      
      console.log('🔍 Debug validation:');
      console.log('- Class ID:', this.class.toString());
      console.log('- Unique Student IDs:', uniqueStudentIds);
      
      const students = await User.find({
        _id: { $in: uniqueStudentIds },
        class_id: this.class,
        role: 'student'
      });
      
      console.log('- Found students:', students.length);
      console.log('- Students found:', students.map(s => ({ id: s._id.toString(), name: s.name, class_id: s.class_id.toString() })));
      
      if (students.length !== uniqueStudentIds.length) {
        const foundIds = students.map(s => s._id.toString());
        const missingIds = uniqueStudentIds.filter(id => !foundIds.includes(id));
        console.log('- Missing student IDs:', missingIds);
        throw new Error(`Some students do not belong to this class. Missing: ${missingIds.join(', ')}`);
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static methods
teacherLessonEvaluationSchema.statics.getTeacherEvaluations = function(teacherId, options = {}) {
  const query = { teacher: teacherId };
  
  if (options.classId) query.class = options.classId;
  if (options.subjectId) query.subject = options.subjectId;
  if (options.status) query.status = options.status;
  if (options.rating) query['evaluation.rating'] = options.rating;
  if (options.startDate) query.createdAt = { $gte: options.startDate };
  if (options.endDate) {
    query.createdAt = { ...query.createdAt, $lte: options.endDate };
  }
  
  return this.find(query)
    .populate('lesson', 'lessonId scheduledDate actualDate topic')
    .populate('class', 'className')
    .populate('subject', 'subjectName subjectCode')
    .populate('absentStudents.student', 'name studentId')
    .populate('oralTests.student', 'name studentId')
    .populate('violations.student', 'name studentId')
    .sort({ createdAt: -1 });
};

// Static method để lấy thống kê đánh giá của giáo viên
teacherLessonEvaluationSchema.statics.getTeacherEvaluationStats = async function(teacherId, options = {}) {
  const matchQuery = { teacher: teacherId };
  
  if (options.startDate) matchQuery.createdAt = { $gte: options.startDate };
  if (options.endDate) {
    matchQuery.createdAt = { ...matchQuery.createdAt, $lte: options.endDate };
  }
  if (options.subjectId) matchQuery.subject = options.subjectId;
  if (options.classId) matchQuery.class = options.classId;
  
  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalEvaluations: { $sum: 1 },
        avgOralScore: { $avg: '$summary.averageOralScore' },
        totalAbsences: { $sum: '$summary.totalAbsent' },
        totalViolations: { $sum: '$summary.totalViolations' },
        ratingDistribution: {
          $push: '$evaluation.rating'
        }
      }
    }
  ]);
  
  if (stats.length === 0) {
    return {
      totalEvaluations: 0,
      avgOralScore: 0,
      totalAbsences: 0,
      totalViolations: 0,
      ratingDistribution: {}
    };
  }
  
  const result = stats[0];
  
  // Tính phân bố rating
  const ratingCounts = result.ratingDistribution.reduce((acc, rating) => {
    acc[rating] = (acc[rating] || 0) + 1;
    return acc;
  }, {});
  
  return {
    totalEvaluations: result.totalEvaluations,
    avgOralScore: Math.round(result.avgOralScore * 10) / 10,
    totalAbsences: result.totalAbsences,
    totalViolations: result.totalViolations,
    ratingDistribution: ratingCounts
  };
};

// Instance methods
teacherLessonEvaluationSchema.methods.addAbsentStudent = function(studentId, isExcused = false, reason = '') {
  // Kiểm tra học sinh đã có trong danh sách vắng chưa
  const existingIndex = this.absentStudents.findIndex(
    absent => absent.student.toString() === studentId.toString()
  );
  
  if (existingIndex >= 0) {
    // Cập nhật thông tin
    this.absentStudents[existingIndex].isExcused = isExcused;
    this.absentStudents[existingIndex].reason = reason;
    this.absentStudents[existingIndex].recordedAt = new Date();
  } else {
    // Thêm mới
    this.absentStudents.push({
      student: studentId,
      isExcused,
      reason,
      recordedAt: new Date()
    });
  }
  
  return this.save();
};

teacherLessonEvaluationSchema.methods.addOralTest = function(studentId, score, question = '', comment = '') {
  this.oralTests.push({
    student: studentId,
    score,
    question,
    comment,
    testedAt: new Date()
  });
  
  return this.save();
};

teacherLessonEvaluationSchema.methods.addViolation = function(studentId, description, type = 'other', severity = 'minor', action = '') {
  this.violations.push({
    student: studentId,
    description,
    type,
    severity,
    action,
    recordedAt: new Date()
  });
  
  return this.save();
};

teacherLessonEvaluationSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

teacherLessonEvaluationSchema.methods.submit = function() {
  this.status = 'submitted';
  this.submittedAt = new Date();
  if (!this.completedAt) {
    this.completedAt = new Date();
  }
  return this.save();
};

const TeacherLessonEvaluation = mongoose.model('TeacherLessonEvaluation', teacherLessonEvaluationSchema);

module.exports = TeacherLessonEvaluation;