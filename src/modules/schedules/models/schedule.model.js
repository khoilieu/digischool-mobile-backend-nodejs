const mongoose = require('mongoose');

// Schema cho một tiết học cụ thể
const periodSchema = new mongoose.Schema({
  // ID riêng cho mỗi tiết học
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()
  },
  
  // ID tự động với format: period + số tiết + thứ + ngày tháng năm
  periodId: {
    type: String,
    required: true
  },
  
  periodNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 10 // Tăng lên 10 để có thể thêm tiết rỗng
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: false,
    default: null,
    validate: {
      validator: function(v) {
        // Subject is only required for regular periods (not empty, fixed, etc.)
        if (this.periodType === 'regular' && !v) {
          return false; // Subject is required for regular periods
        }
        return true; // All other cases are valid
      },
      message: 'Subject is required for regular periods'
    }
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null,
    validate: {
      validator: function(v) {
        // Teacher is only required for regular periods (not empty, fixed, etc.)
        if (this.periodType === 'regular' && !v) {
          return false; // Teacher is required for regular periods
        }
        return true; // All other cases are valid
      },
      message: 'Teacher is required for regular periods'
    }
  },
  session: {
    type: String,
    enum: ['morning', 'afternoon'], // Buổi sáng hoặc chiều
    required: false
  },
  timeStart: {
    type: String,
    required: false
  },
  timeEnd: {
    type: String,
    required: false
  },
  // Phân loại tiết học
  periodType: {
    type: String,
    enum: ['regular', 'makeup', 'extracurricular', 'fixed', 'empty'], // Thêm 'empty' cho tiết rỗng
    default: 'regular'
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
  // Đánh dấu tiết học cố định (chào cờ, sinh hoạt lớp) - DEPRECATED, sử dụng periodType = 'fixed'
  fixed: {
    type: Boolean,
    default: false
  },
  specialType: {
    type: String,
    enum: ['flag_ceremony', 'class_meeting'],
    required: false
  },
  // Thông tin bổ sung cho tiết dạy bù
  makeupInfo: {
    originalDate: {
      type: Date, // Ngày gốc bị vắng
      required: false
    },
    reason: {
      type: String, // Lý do dạy bù
      maxlength: 200,
      required: false
    },
    originalPeriodNumber: {
      type: Number, // Tiết gốc bị vắng
      min: 1,
      max: 10
    },
    originalWeekNumber: {
      type: Number, // Tuần gốc bị vắng
      min: 1,
      max: 38
    },
    originalDayOfWeek: {
      type: Number, // Ngày gốc bị vắng
      min: 2,
      max: 7
    }
  },
  // Thông tin bổ sung cho hoạt động ngoại khóa
  extracurricularInfo: {
    activityName: {
      type: String,
      required: false
    },
    activityType: {
      type: String,
      enum: ['club', 'sport', 'art', 'science', 'community_service', 'competition', 'other'],
      required: false
    },
    location: {
      type: String,
      maxlength: 100
    },
    maxParticipants: {
      type: Number,
      min: 1
    }
  },
  
  // Đánh giá tiết học
  evaluation: {
    // Đánh giá chung
    overallRating: { 
      type: Number, 
      min: 1, 
      max: 5, 
      default: null 
    },
    
    // Đánh giá chi tiết
    criteria: {
      content: { type: Number, min: 1, max: 5, default: null }, // Nội dung bài học
      delivery: { type: Number, min: 1, max: 5, default: null }, // Cách truyền đạt
      interaction: { type: Number, min: 1, max: 5, default: null }, // Tương tác với học sinh
      preparation: { type: Number, min: 1, max: 5, default: null }, // Chuẩn bị bài giảng
      timeManagement: { type: Number, min: 1, max: 5, default: null } // Quản lý thời gian
    },
    
    // Nhận xét
    feedback: {
      strengths: { type: String, default: '' }, // Điểm mạnh
      improvements: { type: String, default: '' }, // Cần cải thiện
      suggestions: { type: String, default: '' }, // Đề xuất
      generalComment: { type: String, default: '' } // Nhận xét chung
    },
    
    // Thông tin đánh giá
    evaluatedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      default: null 
    },
    evaluatedAt: { type: Date, default: null },
    evaluatorRole: { 
      type: String, 
      enum: ['admin', 'manager', 'principal', 'head_teacher', 'peer_teacher'],
      default: null 
    }
  }
});

// Pre-validate hook để xử lý cleanup trước validation
periodSchema.pre('validate', function(next) {
  // Đối với empty periods, xóa các fields không cần thiết
  if (this.periodType === 'empty') {
    this.subject = undefined;
    this.teacher = undefined;
    this.session = undefined;
  }
  
  // Đối với regular periods, đảm bảo session được set
  if (this.periodType === 'regular' && !this.session) {
    this.session = this.periodNumber <= 5 ? 'morning' : 'afternoon';
  }
  
  next();
});

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
  date: {
    type: Date,
    required: true // Ngày cụ thể trong tuần
  },
  periods: [periodSchema]
}, { _id: false });

// Schema cho tuần học
const weekScheduleSchema = new mongoose.Schema({
  weekNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 38
  },
  startDate: {
    type: Date,
    required: true // Ngày bắt đầu tuần
  },
  endDate: {
    type: Date,
    required: true // Ngày kết thúc tuần  
  },
  days: [dayScheduleSchema]
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
  // Thông tin về 38 tuần học
  academicStartDate: {
    type: Date,
    required: true,
    default: new Date('2024-08-12') // Bắt đầu từ 12/8/2024
  },
  totalWeeks: {
    type: Number,
    required: true,
    default: 38
  },
  totalPeriodsPerWeek: {
    type: Number,
    default: 33,
    min: 30,
    max: 35
  },
  // Mảng chứa 38 tuần
  weeks: [weekScheduleSchema],
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
  timestamps: true,
  validateBeforeSave: false // Tắt validation tự động
});

// Pre-save hook để xử lý validation và cleanup dữ liệu
scheduleSchema.pre('save', function(next) {
  console.log('🔧 Pre-save hook: Cleaning up schedule data and generating periodIds...');
  
  let cleanupCount = 0;
  let periodIdCount = 0;
  
  // Duyệt qua tất cả weeks và days để cleanup periods và tạo periodId
  this.weeks.forEach((week) => {
    week.days.forEach((day) => {
      day.periods.forEach((period) => {
        // Tạo periodId nếu chưa có
        if (!period.periodId && day.date && period.periodNumber && day.dayOfWeek) {
          const date = new Date(day.date);
          const dayNum = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          const periodNum = String(period.periodNumber).padStart(2, '0');
          const dayOfWeek = day.dayOfWeek;
          
          // Format: period + số tiết + thứ + ngày tháng năm
          period.periodId = `period${periodNum}_${dayOfWeek}_${dayNum}${month}${year}`;
          periodIdCount++;
        }
        
        // Cleanup empty periods
        if (period.periodType === 'empty') {
          // Xóa các fields không cần thiết cho empty periods
          if (period.subject !== undefined) {
            period.subject = undefined;
            cleanupCount++;
          }
          if (period.teacher !== undefined) {
            period.teacher = undefined;
            cleanupCount++;
          }
          if (period.session !== undefined) {
            period.session = undefined;
            cleanupCount++;
          }
          if (period.timeStart !== undefined) {
            period.timeStart = undefined;
            cleanupCount++;
          }
          if (period.timeEnd !== undefined) {
            period.timeEnd = undefined;
            cleanupCount++;
          }
        }
        
        // Ensure regular periods have required fields
        if (period.periodType === 'regular') {
          // Đảm bảo session được set đúng
          if (!period.session) {
            period.session = period.periodNumber <= 5 ? 'morning' : 'afternoon';
          }
          // Đảm bảo timeStart và timeEnd được set cho regular periods
          if (!period.timeStart || !period.timeEnd) {
            const timeSlots = [
              { start: '07:00', end: '07:45' }, // Tiết 1
              { start: '07:50', end: '08:35' }, // Tiết 2
              { start: '08:40', end: '09:25' }, // Tiết 3
              { start: '09:45', end: '10:30' }, // Tiết 4
              { start: '10:35', end: '11:20' }, // Tiết 5
              { start: '13:30', end: '14:15' }, // Tiết 6
              { start: '14:20', end: '15:05' }, // Tiết 7
              { start: '15:10', end: '15:55' }, // Tiết 8
              { start: '16:00', end: '16:45' }, // Tiết 9
              { start: '16:50', end: '17:35' }  // Tiết 10
            ];
            const timeSlot = timeSlots[period.periodNumber - 1];
            if (timeSlot) {
              period.timeStart = timeSlot.start;
              period.timeEnd = timeSlot.end;
            }
          }
        }
        
        // Ensure fixed periods have required fields
        if (period.periodType === 'fixed') {
          if (!period.session) {
            period.session = period.periodNumber <= 5 ? 'morning' : 'afternoon';
          }
          if (!period.timeStart || !period.timeEnd) {
            const timeSlots = [
              { start: '07:00', end: '07:45' }, // Tiết 1
              { start: '07:50', end: '08:35' }, // Tiết 2
              { start: '08:40', end: '09:25' }, // Tiết 3
              { start: '09:45', end: '10:30' }, // Tiết 4
              { start: '10:35', end: '11:20' }, // Tiết 5
              { start: '13:30', end: '14:15' }, // Tiết 6
              { start: '14:20', end: '15:05' }  // Tiết 7
            ];
            const timeSlot = timeSlots[period.periodNumber - 1];
            if (timeSlot) {
              period.timeStart = timeSlot.start;
              period.timeEnd = timeSlot.end;
            }
          }
        }
      });
    });
  });
  
  if (cleanupCount > 0 || periodIdCount > 0) {
    console.log(`✅ Pre-save completed: ${cleanupCount} fields cleaned, ${periodIdCount} periodIds generated`);
  }
  next();
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
scheduleSchema.index({ 'weeks.weekNumber': 1 });
scheduleSchema.index({ 'weeks.days.date': 1 });

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
  this.weeks.forEach(week => {
    week.days.forEach(day => {
      // Chỉ đếm các tiết không phải là tiết rỗng
      total += day.periods.filter(period => period.periodType !== 'empty').length;
    });
  });
  return total;
};

// Method để lấy lịch theo tuần cụ thể
scheduleSchema.methods.getScheduleByWeek = function(weekNumber) {
  return this.weeks.find(week => week.weekNumber === weekNumber);
};

// Method để lấy lịch theo ngày cụ thể
scheduleSchema.methods.getScheduleByDate = function(date) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  for (const week of this.weeks) {
    for (const day of week.days) {
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);
      if (dayDate.getTime() === targetDate.getTime()) {
        return { 
          week: week, 
          day: day,
          weekNumber: week.weekNumber,
          dayOfWeek: day.dayOfWeek 
        };
      }
    }
  }
  return null;
};

// Method để lấy tiết học theo ID
scheduleSchema.methods.getPeriodById = function(periodId) {
  for (const week of this.weeks) {
    for (const day of week.days) {
      for (const period of day.periods) {
        if (period._id.toString() === periodId.toString()) {
          return {
            period: period,
            day: day,
            week: week,
            weekNumber: week.weekNumber,
            dayOfWeek: day.dayOfWeek,
            date: day.date
          };
        }
      }
    }
  }
  return null;
};

// Method để kiểm tra xung đột giáo viên
scheduleSchema.methods.checkTeacherConflict = function(teacherId, weekNumber, dayOfWeek, periodNumber) {
  const week = this.getScheduleByWeek(weekNumber);
  if (!week) return false;
  
  const day = week.days.find(d => d.dayOfWeek === dayOfWeek);
  if (!day) return false;
  
  return day.periods.some(period => 
    period.teacher && period.teacher.toString() === teacherId.toString() && 
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

  this.weeks.forEach(week => {
    week.days.forEach(day => {
      day.periods.forEach(period => {
        // Chỉ tính các tiết không phải là tiết rỗng
        if (period.periodType !== 'empty') {
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
        }
      });
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
  
  this.weeks.forEach(week => {
    week.days.forEach(day => {
      day.periods.forEach(period => {
        if (period.subject && period.periodType !== 'empty') {
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
        }
      });
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

// Method để update trạng thái một tiết học bằng ID
scheduleSchema.methods.updatePeriodStatusById = function(periodId, status, options = {}) {
  const periodInfo = this.getPeriodById(periodId);
  if (!periodInfo) return false;
  
  const period = periodInfo.period;
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

// Method để update trạng thái một tiết học (compatibility với code cũ)
scheduleSchema.methods.updatePeriodStatus = function(dayOfWeek, periodNumber, status, options = {}) {
  // Tìm trong tuần hiện tại (tuần đầu tiên có ngày này)
  for (const week of this.weeks) {
    const day = week.days.find(d => d.dayOfWeek === dayOfWeek);
    if (day) {
      const period = day.periods.find(p => p.periodNumber === periodNumber);
      if (period) {
        return this.updatePeriodStatusById(period._id, status, options);
      }
    }
  }
  return false;
};

// Method để lấy thống kê theo loại tiết học
scheduleSchema.methods.getPeriodTypeStatistics = function() {
  const stats = {
    regular: { total: 0, completed: 0, absent: 0, pending: 0 },
    makeup: { total: 0, completed: 0, absent: 0, pending: 0 },
    extracurricular: { total: 0, completed: 0, absent: 0, pending: 0 },
    fixed: { total: 0, completed: 0, absent: 0, pending: 0 },
    empty: { total: 0, completed: 0, absent: 0, pending: 0 }
  };

  this.weeks.forEach(week => {
    week.days.forEach(day => {
      day.periods.forEach(period => {
        const periodType = period.periodType || 'regular';
        if (stats[periodType]) {
          stats[periodType].total++;
          
          switch(period.status) {
            case 'completed':
              stats[periodType].completed++;
              break;
            case 'absent':
              stats[periodType].absent++;
              break;
            case 'not_started':
            default:
              stats[periodType].pending++;
              break;
          }
        }
      });
    });
  });

  // Tính phần trăm
  Object.keys(stats).forEach(type => {
    const stat = stats[type];
    stat.completionRate = stat.total > 0 ? (stat.completed / stat.total * 100).toFixed(2) : 0;
  });

  return stats;
};

// Method để tìm tiết học theo loại
scheduleSchema.methods.getPeriodsByType = function(periodType) {
  const periods = [];
  
  this.weeks.forEach(week => {
    week.days.forEach(day => {
      day.periods.forEach(period => {
        if (period.periodType === periodType) {
          periods.push({
            weekNumber: week.weekNumber,
            dayOfWeek: day.dayOfWeek,
            dayName: day.dayName,
            date: day.date,
            periodNumber: period.periodNumber,
            periodId: period._id,
            subject: period.subject,
            teacher: period.teacher,
            status: period.status,
            timeStart: period.timeStart,
            timeEnd: period.timeEnd,
            notes: period.notes,
            makeupInfo: period.makeupInfo,
            extracurricularInfo: period.extracurricularInfo
          });
        }
      });
    });
  });
  
  return periods;
};

// Method để tìm tiết rỗng có thể sử dụng
scheduleSchema.methods.getAvailableEmptySlots = function(weekNumber = null) {
  const emptySlots = [];
  
  const weeksToCheck = weekNumber ? [this.getScheduleByWeek(weekNumber)] : this.weeks;
  
  weeksToCheck.forEach(week => {
    if (week) {
      week.days.forEach(day => {
        day.periods.forEach(period => {
          if (period.periodType === 'empty') {
            emptySlots.push({
              weekNumber: week.weekNumber,
              dayOfWeek: day.dayOfWeek,
              dayName: day.dayName,
              date: day.date,
              periodNumber: period.periodNumber,
              periodId: period._id,
              timeStart: period.timeStart,
              timeEnd: period.timeEnd,
              session: period.session
            });
          }
        });
      });
    }
  });
  
  return emptySlots;
};

// Method để thêm tiết dạy bù vào slot rỗng
scheduleSchema.methods.addMakeupPeriodToEmptySlot = function(periodId, teacherId, subjectId, makeupInfo) {
  const periodInfo = this.getPeriodById(periodId);
  if (!periodInfo || periodInfo.period.periodType !== 'empty') {
    return false;
  }
  
  const period = periodInfo.period;
  
  // Chuyển từ tiết rỗng sang tiết dạy bù
  period.periodType = 'makeup';
  period.subject = subjectId;
  period.teacher = teacherId;
  period.status = 'not_started';
  period.makeupInfo = {
    originalDate: makeupInfo.originalDate,
    reason: makeupInfo.reason,
    originalPeriodNumber: makeupInfo.originalPeriodNumber,
    originalWeekNumber: makeupInfo.originalWeekNumber,
    originalDayOfWeek: makeupInfo.originalDayOfWeek
  };
  
  return true;
};

// Method để thêm hoạt động ngoại khóa vào slot rỗng
scheduleSchema.methods.addExtracurricularToEmptySlot = function(periodId, teacherId, extracurricularInfo) {
  const periodInfo = this.getPeriodById(periodId);
  if (!periodInfo || periodInfo.period.periodType !== 'empty') {
    return false;
  }
  
  const period = periodInfo.period;
  
  // Chuyển từ tiết rỗng sang hoạt động ngoại khóa
  period.periodType = 'extracurricular';
  period.subject = null;
  period.teacher = teacherId;
  period.status = 'not_started';
  period.extracurricularInfo = {
    activityName: extracurricularInfo.activityName,
    activityType: extracurricularInfo.activityType,
    location: extracurricularInfo.location,
    maxParticipants: extracurricularInfo.maxParticipants
  };
  
  return true;
};

// Method để lấy chi tiết đầy đủ của một tiết học theo ID
scheduleSchema.methods.getPeriodDetailsById = function(periodId) {
  const periodInfo = this.getPeriodById(periodId);
  if (!periodInfo) return null;
  
  const { period, day, week } = periodInfo;
  
  // Tính toán thời lượng tiết học
  const startTime = new Date(`2000-01-01T${period.timeStart || '00:00'}:00`);
  const endTime = new Date(`2000-01-01T${period.timeEnd || '00:00'}:00`);
  const durationMinutes = (endTime - startTime) / (1000 * 60);
  
  // Xác định buổi học bằng tiếng Việt
  const sessionVN = period.session === 'morning' ? 'Sáng' : 'Chiều';
  
  // Xác định trạng thái bằng tiếng Việt
  const statusVN = {
    'not_started': 'Chưa học',
    'completed': 'Đã hoàn thành',
    'absent': 'Vắng tiết',
    'makeup': 'Tiết bù'
  };
  
  // Xác định loại tiết học bằng tiếng Việt
  const periodTypeVN = {
    'regular': 'Chính quy',
    'makeup': 'Dạy bù',
    'extracurricular': 'Ngoại khóa',
    'fixed': 'Cố định',
    'empty': 'Tiết rỗng'
  };
  
  return {
    // Thông tin ID
    id: period._id,
    
    // Thông tin vị trí
    location: {
      weekNumber: week.weekNumber,
      dayOfWeek: day.dayOfWeek,
      dayName: day.dayName,
      dayNameVN: ['', 'Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][day.dayOfWeek],
      date: day.date,
      periodNumber: period.periodNumber
    },
    
    // Thông tin cơ bản
    basic: {
      session: period.session,
      sessionVN: sessionVN,
      timeStart: period.timeStart,
      timeEnd: period.timeEnd,
      duration: `${durationMinutes} phút`
    },
    
    // Thông tin môn học và giáo viên
    academic: {
      subject: period.subject,
      teacher: period.teacher,
      isFixed: period.fixed || period.periodType === 'fixed',
      specialType: period.specialType
    },
    
    // Thông tin trạng thái
    status: {
      current: period.status,
      currentVN: statusVN[period.status] || 'Không xác định',
      actualDate: period.actualDate,
      completedAt: period.completedAt,
      notes: period.notes || ''
    },
    
    // Thông tin loại tiết học
    type: {
      periodType: period.periodType || 'regular',
      periodTypeVN: periodTypeVN[period.periodType || 'regular'],
      isRegular: period.periodType === 'regular' || !period.periodType,
      isMakeup: period.periodType === 'makeup',
      isExtracurricular: period.periodType === 'extracurricular',
      isFixed: period.periodType === 'fixed' || period.fixed,
      isEmpty: period.periodType === 'empty'
    },
    
    // Thông tin điểm danh
    attendance: {
      presentStudents: period.attendance?.presentStudents || 0,
      absentStudents: period.attendance?.absentStudents || 0,
      totalStudents: period.attendance?.totalStudents || 0,
      attendanceRate: period.attendance?.totalStudents > 0 
        ? ((period.attendance.presentStudents / period.attendance.totalStudents) * 100).toFixed(1) + '%'
        : 'Chưa có dữ liệu'
    },
    
    // Thông tin dạy bù (nếu có)
    makeupInfo: period.periodType === 'makeup' ? {
      originalDate: period.makeupInfo?.originalDate,
      reason: period.makeupInfo?.reason,
      originalPeriodNumber: period.makeupInfo?.originalPeriodNumber,
      originalWeekNumber: period.makeupInfo?.originalWeekNumber,
      originalDayOfWeek: period.makeupInfo?.originalDayOfWeek,
      originalLocation: period.makeupInfo?.originalWeekNumber && period.makeupInfo?.originalDayOfWeek
        ? `Tuần ${period.makeupInfo.originalWeekNumber}, ${['', 'CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][period.makeupInfo.originalDayOfWeek]}, Tiết ${period.makeupInfo.originalPeriodNumber}`
        : null
    } : null,
    
    // Thông tin ngoại khóa (nếu có)
    extracurricularInfo: period.periodType === 'extracurricular' ? {
      activityName: period.extracurricularInfo?.activityName,
      activityType: period.extracurricularInfo?.activityType,
      activityTypeVN: {
        'club': 'Câu lạc bộ',
        'sport': 'Thể thao', 
        'art': 'Nghệ thuật',
        'science': 'Khoa học',
        'community_service': 'Phục vụ cộng đồng',
        'competition': 'Thi đấu',
        'other': 'Khác'
      }[period.extracurricularInfo?.activityType] || 'Không xác định',
      location: period.extracurricularInfo?.location,
      maxParticipants: period.extracurricularInfo?.maxParticipants
    } : null,
    
    // Thông tin đánh giá (nếu có)
    evaluation: period.evaluation ? {
      overallRating: period.evaluation.overallRating,
      overallRatingText: ['', 'Kém', 'Trung bình', 'Khá', 'Tốt', 'Xuất sắc'][period.evaluation.overallRating] || 'Chưa đánh giá',
      criteria: {
        content: period.evaluation.criteria?.content,
        delivery: period.evaluation.criteria?.delivery, 
        interaction: period.evaluation.criteria?.interaction,
        preparation: period.evaluation.criteria?.preparation,
        timeManagement: period.evaluation.criteria?.timeManagement,
        averageScore: period.evaluation.criteria ? (
          (period.evaluation.criteria.content || 0) + 
          (period.evaluation.criteria.delivery || 0) + 
          (period.evaluation.criteria.interaction || 0) + 
          (period.evaluation.criteria.preparation || 0) + 
          (period.evaluation.criteria.timeManagement || 0)
        ) / 5 : null
      },
      feedback: period.evaluation.feedback,
      evaluatedBy: period.evaluation.evaluatedBy,
      evaluatedAt: period.evaluation.evaluatedAt,
      evaluatorRole: period.evaluation.evaluatorRole,
      evaluatorRoleVN: {
        'admin': 'Quản trị viên',
        'manager': 'Quản lý',
        'principal': 'Hiệu trưởng',
        'head_teacher': 'Tổ trưởng',
        'peer_teacher': 'Giáo viên đồng nghiệp'
      }[period.evaluation.evaluatorRole] || 'Không xác định'
    } : null,
    
    // Metadata
    metadata: {
      canEdit: period.status === 'not_started' || period.status === 'absent',
      canMarkCompleted: period.status === 'not_started',
      canMarkAbsent: period.status === 'not_started' || period.status === 'completed',
      requiresAttendance: period.periodType === 'regular' || period.periodType === 'makeup',
      allowsNotes: true,
      canEvaluate: period.status === 'completed',
      hasEvaluation: !!period.evaluation?.evaluatedBy,
      canConvertToActivity: period.periodType === 'empty',
      canRestore: period.periodType !== 'regular' && period.periodType !== 'fixed'
    }
  };
};

// Method để đánh giá tiết học bằng ID
scheduleSchema.methods.evaluatePeriodById = function(periodId, evaluationData, evaluatorId, evaluatorRole) {
  const periodInfo = this.getPeriodById(periodId);
  if (!periodInfo) return null;
  
  const period = periodInfo.period;
  
  // Cập nhật thông tin đánh giá
  period.evaluation = {
    overallRating: evaluationData.overallRating,
    criteria: {
      content: evaluationData.criteria?.content || null,
      delivery: evaluationData.criteria?.delivery || null,
      interaction: evaluationData.criteria?.interaction || null,
      preparation: evaluationData.criteria?.preparation || null,
      timeManagement: evaluationData.criteria?.timeManagement || null
    },
    feedback: {
      strengths: evaluationData.feedback?.strengths || '',
      improvements: evaluationData.feedback?.improvements || '',
      suggestions: evaluationData.feedback?.suggestions || '',
      generalComment: evaluationData.feedback?.generalComment || ''
    },
    evaluatedBy: evaluatorId,
    evaluatedAt: new Date(),
    evaluatorRole: evaluatorRole
  };
  
  return period.evaluation;
};

// Method để đánh giá tiết học (compatibility với code cũ)
scheduleSchema.methods.evaluatePeriod = function(dayOfWeek, periodNumber, evaluationData, evaluatorId, evaluatorRole) {
  // Tìm trong tuần hiện tại (tuần đầu tiên có ngày này)
  for (const week of this.weeks) {
    const day = week.days.find(d => d.dayOfWeek === dayOfWeek);
    if (day) {
      const period = day.periods.find(p => p.periodNumber === periodNumber);
      if (period) {
        return this.evaluatePeriodById(period._id, evaluationData, evaluatorId, evaluatorRole);
      }
    }
  }
  return null;
};

// Static method để tạo thời khóa biểu template với 38 tuần
scheduleSchema.statics.createTemplate = function(classId, academicYear, createdBy, homeroomTeacherId = null) {
  const startDate = new Date('2024-08-12'); // Ngày bắt đầu
  const totalWeeks = 38;
  
  // Subject ID for empty periods as requested
  const emptyPeriodSubjectId = '6856dabbb11173a0c87c0cba';
  
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
      { period: 7, start: '14:20', end: '15:05' },
      { period: 8, start: '15:10', end: '15:55' }, // Tiết rỗng bổ sung
      { period: 9, start: '16:00', end: '16:45' }, // Tiết rỗng bổ sung
      { period: 10, start: '16:50', end: '17:35' } // Tiết rỗng bổ sung
    ]
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const weeks = [];
  
  // Tạo 38 tuần
  for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
    const weekStartDate = new Date(startDate);
    weekStartDate.setDate(startDate.getDate() + (weekNum - 1) * 7);
    
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 5); // Kết thúc vào thứ 7
    
    const days = [];
    
    // Tạo 6 ngày trong tuần (thứ 2 đến thứ 7)
    for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
      const dayDate = new Date(weekStartDate);
      dayDate.setDate(weekStartDate.getDate() + dayIndex);
      
      const periods = [];
      
      // Tạo các tiết trong ngày
      [...defaultTimeSlots.morning, ...defaultTimeSlots.afternoon].forEach(timeSlot => {
        // Xác định periodType dựa trên ngày và period
        let periodType;
        
        if (dayIndex === 5) { // Saturday (Thứ 7)
          // Saturday: chỉ có 3 tiết học chính quy (1, 6, 7), các tiết còn lại là dự phòng
          if ([1, 6, 7].includes(timeSlot.period)) {
            periodType = 'regular';
          } else {
            periodType = 'empty';
          }
        } else {
          // Các ngày khác (Thứ 2-6): có 8 tiết học chính quy (1,2,3,4,5,6,7,8), còn lại là dự phòng
          periodType = timeSlot.period <= 8 ? 'regular' : 'empty';
        }
        
        const periodData = {
          _id: new mongoose.Types.ObjectId(),
          periodNumber: timeSlot.period,
          periodType: periodType,
          status: 'not_started'
        };
        
        // Add appropriate fields based on period type
        if (periodType === 'empty') {
          // For empty periods, assign the specific subject and homeroom teacher
          if (homeroomTeacherId) {
            periodData.subject = emptyPeriodSubjectId;
            periodData.teacher = homeroomTeacherId;
            periodData.session = timeSlot.period <= 5 ? 'morning' : 'afternoon';
            periodData.timeStart = timeSlot.start;
            periodData.timeEnd = timeSlot.end;
          }
        } else {
          // For regular periods
          periodData.session = timeSlot.period <= 5 ? 'morning' : 'afternoon';
          periodData.timeStart = timeSlot.start;
          periodData.timeEnd = timeSlot.end;
          // Don't explicitly set subject and teacher to null - let schema defaults handle it
        }
        
        periods.push(periodData);
      });
      
      days.push({
        dayOfWeek: dayIndex + 2, // Thứ 2 = 2, ..., Thứ 7 = 7
        dayName: dayNames[dayIndex],
        date: new Date(dayDate),
        periods: periods
      });
    }
    
    weeks.push({
      weekNumber: weekNum,
      startDate: new Date(weekStartDate),
      endDate: new Date(weekEndDate),
      days: days
    });
  }

  return new this({
    class: classId,
    academicYear,
    academicStartDate: new Date(startDate),
    totalWeeks: totalWeeks,
    weeks: weeks,
    createdBy,
    status: 'draft' // Bắt đầu với draft, sẽ active sau khi điền đầy đủ thông tin
  });
};

// Compatibility methods để không ảnh hưởng đến code cũ
scheduleSchema.methods.getScheduleByDay = function(dayOfWeek) {
  // Trả về ngày đầu tiên trong tuần đầu tiên có dayOfWeek này
  for (const week of this.weeks) {
    for (const day of week.days) {
      if (day.dayOfWeek === dayOfWeek) {
        return day;
      }
    }
  }
  return null;
};

scheduleSchema.methods.canAddPeriod = function(dayOfWeek, periodNumber) {
  // Kiểm tra trong tuần đầu tiên
  const week = this.weeks[0];
  if (!week) return false;
  
  const day = week.days.find(d => d.dayOfWeek === dayOfWeek);
  if (!day) return false;
  
  // Kiểm tra xem có tiết rỗng ở vị trí này không
  const period = day.periods.find(p => p.periodNumber === periodNumber);
  return period && period.periodType === 'empty';
};

// Deprecated methods - giữ lại để tương thích
scheduleSchema.methods.addMakeupPeriod = function(dayOfWeek, periodNumber, teacherId, subjectId, makeupInfo, timeSlot) {
  console.warn('addMakeupPeriod is deprecated. Use addMakeupPeriodToEmptySlot with periodId instead.');
  
  // Tìm tiết rỗng phù hợp
  const week = this.weeks[0];
  if (!week) return false;
  
  const day = week.days.find(d => d.dayOfWeek === dayOfWeek);
  if (!day) return false;
  
  const period = day.periods.find(p => p.periodNumber === periodNumber && p.periodType === 'empty');
  if (!period) return false;
  
  return this.addMakeupPeriodToEmptySlot(period._id, teacherId, subjectId, makeupInfo);
};

scheduleSchema.methods.addExtracurricularPeriod = function(dayOfWeek, periodNumber, teacherId, extracurricularInfo, timeSlot) {
  console.warn('addExtracurricularPeriod is deprecated. Use addExtracurricularToEmptySlot with periodId instead.');
  
  // Tìm tiết rỗng phù hợp
  const week = this.weeks[0];
  if (!week) return false;
  
  const day = week.days.find(d => d.dayOfWeek === dayOfWeek);
  if (!day) return false;
  
  const period = day.periods.find(p => p.periodNumber === periodNumber && p.periodType === 'empty');
  if (!period) return false;
  
  return this.addExtracurricularToEmptySlot(period._id, teacherId, extracurricularInfo);
};

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule; 