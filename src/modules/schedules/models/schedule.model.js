const mongoose = require('mongoose');

// Schema cho một tiết học cụ thể
const periodSchema = new mongoose.Schema({
  periodNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 7 // Tối đa 7 tiết/ngày (sáng: 1-5, chiều: 6-7)
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: function() {
      // Subject không bắt buộc cho fixed periods (chào cờ, sinh hoạt lớp)
      return !this.fixed;
    }
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  session: {
    type: String,
    enum: ['morning', 'afternoon'], // Buổi sáng hoặc chiều
    required: true
  },
  timeStart: {
    type: String,
    required: true
  },
  timeEnd: {
    type: String,
    required: true
  },
  // Thêm trạng thái học tập
  status: {
    type: String,
    enum: ['not_started', 'completed', 'absent', 'makeup'], // Chưa học, Học xong, Vắng tiết, Tiết bù
    default: 'not_started'
  },
  actualDate: {
    type: Date, // Ngày thực tế diễn ra tiết học
    default: null
  },
  completedAt: {
    type: Date, // Thời gian hoàn thành tiết học
    default: null
  },
  notes: {
    type: String, // Ghi chú cho tiết học
    maxlength: 200
  },
  attendance: {
    presentStudents: {
      type: Number,
      default: 0
    },
    absentStudents: {
      type: Number, 
      default: 0
    },
    totalStudents: {
      type: Number,
      default: 0
    }
  },
  // Đánh dấu tiết học cố định (chào cờ, sinh hoạt lớp)
  fixed: {
    type: Boolean,
    default: false
  },
  specialType: {
    type: String,
    enum: ['flag_ceremony', 'class_meeting'],
    required: function() {
      return this.fixed;
    }
  }
}, { _id: false });

// Schema cho lịch học theo ngày
const dayScheduleSchema = new mongoose.Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 2, // Thứ 2
    max: 7  // Thứ 7 (Chủ nhật = 1, nhưng không dùng)
  },
  dayName: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  periods: [periodSchema]
}, { _id: false });

// Schema chính cho thời khóa biểu
const scheduleSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  academicYear: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{4}$/.test(v);
      },
      message: 'Academic year must be in format YYYY-YYYY (e.g., 2023-2024)'
    }
  },
  semester: {
    type: Number,
    enum: [1, 2], // Học kỳ 1 hoặc 2
    required: true,
    default: 1
  },
  weekNumber: {
    type: Number,
    min: 1,
    max: 52,
    default: 1
  },
  totalPeriodsPerWeek: {
    type: Number,
    default: 33,
    min: 30,
    max: 35
  },
  schedule: [dayScheduleSchema],
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft'
  },
  notes: {
    type: String,
    maxlength: 500
  },
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

// Compound index để đảm bảo mỗi lớp chỉ có 1 thời khóa biểu active trong 1 năm học
scheduleSchema.index({ 
  class: 1, 
  academicYear: 1, 
  status: 1 
}, { 
  unique: true,
  partialFilterExpression: { status: 'active' }
});

// Indexes khác
scheduleSchema.index({ academicYear: 1 });
scheduleSchema.index({ status: 1 });
scheduleSchema.index({ semester: 1 });
scheduleSchema.index({ weekNumber: 1 });

// Virtual để lấy tên lớp
scheduleSchema.virtual('className', {
  ref: 'Class',
  localField: 'class',
  foreignField: '_id',
  justOne: true,
  get: function(cls) {
    return cls ? cls.className : null;
  }
});

// Method để tính tổng số tiết đã lên lịch
scheduleSchema.methods.getTotalScheduledPeriods = function() {
  let total = 0;
  this.schedule.forEach(day => {
    total += day.periods.length;
  });
  return total;
};

// Method để lấy lịch theo ngày cụ thể
scheduleSchema.methods.getScheduleByDay = function(dayOfWeek) {
  return this.schedule.find(day => day.dayOfWeek === dayOfWeek);
};

// Method để kiểm tra xung đột giáo viên
scheduleSchema.methods.checkTeacherConflict = function(teacherId, dayOfWeek, periodNumber) {
  const daySchedule = this.getScheduleByDay(dayOfWeek);
  if (!daySchedule) return false;
  
  return daySchedule.periods.some(period => 
    period.teacher.toString() === teacherId.toString() && 
    period.periodNumber === periodNumber
  );
};

// Method để lấy thống kê tiến độ học tập
scheduleSchema.methods.getLearningProgress = function() {
  let totalPeriods = 0;
  let completedPeriods = 0;
  let absentPeriods = 0;
  let makeupPeriods = 0;
  let notStartedPeriods = 0;

  this.schedule.forEach(day => {
    day.periods.forEach(period => {
      totalPeriods++;
      switch(period.status) {
        case 'completed':
          completedPeriods++;
          break;
        case 'absent':
          absentPeriods++;
          break;
        case 'makeup':
          makeupPeriods++;
          break;
        case 'not_started':
        default:
          notStartedPeriods++;
          break;
      }
    });
  });

  return {
    totalPeriods,
    completedPeriods,
    absentPeriods,
    makeupPeriods,
    notStartedPeriods,
    completionRate: totalPeriods > 0 ? (completedPeriods / totalPeriods * 100).toFixed(2) : 0,
    attendanceRate: totalPeriods > 0 ? ((completedPeriods + makeupPeriods) / totalPeriods * 100).toFixed(2) : 0
  };
};

// Method để lấy tiến độ theo môn học
scheduleSchema.methods.getProgressBySubject = function() {
  const subjectProgress = {};
  
  this.schedule.forEach(day => {
    day.periods.forEach(period => {
      const subjectId = period.subject.toString();
      if (!subjectProgress[subjectId]) {
        subjectProgress[subjectId] = {
          total: 0,
          completed: 0,
          absent: 0,
          makeup: 0,
          not_started: 0
        };
      }
      
      subjectProgress[subjectId].total++;
      subjectProgress[subjectId][period.status]++;
    });
  });

  // Tính phần trăm cho mỗi môn
  Object.keys(subjectProgress).forEach(subjectId => {
    const progress = subjectProgress[subjectId];
    progress.completionRate = progress.total > 0 ? (progress.completed / progress.total * 100).toFixed(2) : 0;
    progress.attendanceRate = progress.total > 0 ? ((progress.completed + progress.makeup) / progress.total * 100).toFixed(2) : 0;
  });

  return subjectProgress;
};

// Method để update trạng thái một tiết học
scheduleSchema.methods.updatePeriodStatus = function(dayOfWeek, periodNumber, status, options = {}) {
  const daySchedule = this.getScheduleByDay(dayOfWeek);
  if (!daySchedule) return false;
  
  const period = daySchedule.periods.find(p => p.periodNumber === periodNumber);
  if (!period) return false;
  
  period.status = status;
  
  // Cập nhật thời gian hoàn thành
  if (status === 'completed') {
    period.completedAt = new Date();
    period.actualDate = options.actualDate || new Date();
  }
  
  // Cập nhật attendance nếu có
  if (options.attendance) {
    period.attendance = {
      presentStudents: options.attendance.presentStudents || 0,
      absentStudents: options.attendance.absentStudents || 0,
      totalStudents: options.attendance.totalStudents || 0
    };
  }
  
  // Cập nhật notes nếu có
  if (options.notes) {
    period.notes = options.notes;
  }
  
  return true;
};

// Static method để tạo thời khóa biểu template
scheduleSchema.statics.createTemplate = function(classId, academicYear, createdBy) {
  const defaultTimeSlots = {
    morning: [
      { period: 1, start: '07:00', end: '07:45' },
      { period: 2, start: '07:50', end: '08:35' },
      { period: 3, start: '08:40', end: '09:25' },
      { period: 4, start: '09:45', end: '10:30' },
      { period: 5, start: '10:35', end: '11:20' }
    ],
    afternoon: [
      { period: 6, start: '13:30', end: '14:15' },
      { period: 7, start: '14:20', end: '15:05' }
    ]
  };

  const days = [
    { dayOfWeek: 2, dayName: 'Monday' },
    { dayOfWeek: 3, dayName: 'Tuesday' },
    { dayOfWeek: 4, dayName: 'Wednesday' },
    { dayOfWeek: 5, dayName: 'Thursday' },
    { dayOfWeek: 6, dayName: 'Friday' },
    { dayOfWeek: 7, dayName: 'Saturday' }
  ];

  const schedule = days.map(day => ({
    dayOfWeek: day.dayOfWeek,
    dayName: day.dayName,
    periods: [] // Sẽ được điền sau khi có subjects và teachers
  }));

  return new this({
    class: classId,
    academicYear,
    schedule,
    createdBy,
    status: 'active' // Tự động active sau khi tạo
  });
};

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule; 