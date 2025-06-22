const mongoose = require('mongoose');

// Schema cho một tiết dạy của giáo viên
const teacherPeriodSchema = new mongoose.Schema({
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
    max: 10
  },
  
  // Lớp mà giáo viên dạy trong tiết này
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  
  className: {
    type: String,
    required: true
  },
  
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: function() {
      return this.periodType === 'regular' || this.periodType === 'makeup';
    }
  },
  
  session: {
    type: String,
    enum: ['morning', 'afternoon'],
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
  
  // Phân loại tiết dạy
  periodType: {
    type: String,
    enum: ['regular', 'makeup', 'extracurricular', 'fixed', 'substitute'],
    default: 'regular'
  },
  
  // Trạng thái tiết dạy
  status: {
    type: String,
    enum: ['scheduled', 'teaching', 'completed', 'cancelled', 'absent'],
    default: 'scheduled'
  },
  
  // Ngày thực tế dạy
  actualDate: {
    type: Date,
    default: null
  },
  
  // Thời gian hoàn thành
  completedAt: {
    type: Date,
    default: null
  },
  
  // Ghi chú của giáo viên
  notes: {
    type: String,
    maxlength: 500
  },
  
  // Thông tin điểm danh
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
  
  // Phòng học
  classroom: {
    type: String,
    maxlength: 50
  },
  
  // Thông tin thay thế (nếu là tiết thay)
  substituteInfo: {
    originalTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      maxlength: 200
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Thông tin dạy bù
  makeupInfo: {
    originalDate: {
      type: Date
    },
    reason: {
      type: String,
      maxlength: 200
    },
    originalPeriodNumber: {
      type: Number,
      min: 1,
      max: 10
    }
  },
  
  // Thông tin ngoại khóa
  extracurricularInfo: {
    activityName: {
      type: String
    },
    activityType: {
      type: String,
      enum: ['club', 'sport', 'art', 'science', 'community_service', 'competition', 'other']
    },
    location: {
      type: String
    },
    maxParticipants: {
      type: Number
    }
  },
  
  // Đánh giá từ học sinh/quản lý
  evaluation: {
    studentRating: {
      type: Number,
      min: 1,
      max: 5
    },
    managerRating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String,
      maxlength: 1000
    },
    evaluatedAt: {
      type: Date
    }
  }
});

// Schema cho lịch dạy theo ngày của giáo viên
const teacherDayScheduleSchema = new mongoose.Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 2,
    max: 7
  },
  dayName: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  periods: [teacherPeriodSchema]
}, { _id: false });

// Schema cho tuần dạy của giáo viên
const teacherWeekScheduleSchema = new mongoose.Schema({
  weekNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 38
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  days: [teacherDayScheduleSchema]
}, { _id: false });

// Schema chính cho lịch dạy của giáo viên
const teacherScheduleSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
    enum: [1, 2],
    required: true,
    default: 1
  },
  
  // Thông tin về 38 tuần học
  academicStartDate: {
    type: Date,
    required: true,
    default: new Date('2024-08-12')
  },
  
  totalWeeks: {
    type: Number,
    required: true,
    default: 38
  },
  
  // Tổng số tiết dạy mỗi tuần
  totalPeriodsPerWeek: {
    type: Number,
    default: 0
  },
  
  // Danh sách lớp mà giáo viên dạy
  classes: [{
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    },
    className: String,
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    },
    periodsPerWeek: {
      type: Number,
      default: 0
    }
  }],
  
  // Mảng chứa 38 tuần
  weeks: [teacherWeekScheduleSchema],
  
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft'
  },
  
  notes: {
    type: String,
    maxlength: 500
  },
  
  // Thống kê
  statistics: {
    totalPeriods: {
      type: Number,
      default: 0
    },
    completedPeriods: {
      type: Number,
      default: 0
    },
    cancelledPeriods: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    }
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
  validateBeforeSave: false
});

// Pre-save hook cho teacher schedule để tạo periodId
teacherScheduleSchema.pre('save', function(next) {
  console.log('🔧 Teacher Schedule pre-save: Generating periodIds...');
  
  let periodIdCount = 0;
  
  // Duyệt qua tất cả weeks và days để tạo periodId
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
      });
    });
  });
  
  if (periodIdCount > 0) {
    console.log(`✅ Teacher Schedule pre-save completed: ${periodIdCount} periodIds generated`);
  }
  next();
});

// Compound index để đảm bảo mỗi giáo viên chỉ có 1 lịch active trong 1 năm học
teacherScheduleSchema.index({
  teacher: 1,
  academicYear: 1,
  status: 1
}, {
  unique: true,
  partialFilterExpression: { status: 'active' }
});

// Indexes khác
teacherScheduleSchema.index({ academicYear: 1 });
teacherScheduleSchema.index({ status: 1 });
teacherScheduleSchema.index({ semester: 1 });
teacherScheduleSchema.index({ 'weeks.weekNumber': 1 });
teacherScheduleSchema.index({ 'weeks.days.date': 1 });
teacherScheduleSchema.index({ 'weeks.days.periods.periodId': 1 });

// Virtual để lấy tên giáo viên
teacherScheduleSchema.virtual('teacherName', {
  ref: 'User',
  localField: 'teacher',
  foreignField: '_id',
  justOne: true,
  get: function(teacher) {
    return teacher ? teacher.name : null;
  }
});

// Method để tính tổng số tiết đã lên lịch
teacherScheduleSchema.methods.getTotalScheduledPeriods = function() {
  let total = 0;
  this.weeks.forEach(week => {
    week.days.forEach(day => {
      total += day.periods.length;
    });
  });
  return total;
};

// Method để lấy lịch theo tuần cụ thể
teacherScheduleSchema.methods.getScheduleByWeek = function(weekNumber) {
  return this.weeks.find(week => week.weekNumber === weekNumber);
};

// Method để lấy lịch theo ngày cụ thể
teacherScheduleSchema.methods.getScheduleByDate = function(date) {
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

// Method để lấy tiết dạy theo periodId
teacherScheduleSchema.methods.getPeriodByPeriodId = function(periodId) {
  for (const week of this.weeks) {
    for (const day of week.days) {
      for (const period of day.periods) {
        if (period.periodId === periodId) {
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

// Method để cập nhật trạng thái tiết dạy
teacherScheduleSchema.methods.updatePeriodStatus = function(periodId, status, options = {}) {
  const periodInfo = this.getPeriodByPeriodId(periodId);
  if (!periodInfo) return false;
  
  const period = periodInfo.period;
  period.status = status;
  
  if (status === 'completed') {
    period.completedAt = new Date();
    period.actualDate = options.actualDate || new Date();
  }
  
  if (options.attendance) {
    period.attendance = {
      presentStudents: options.attendance.presentStudents || 0,
      absentStudents: options.attendance.absentStudents || 0,
      totalStudents: options.attendance.totalStudents || 0
    };
  }
  
  if (options.notes) {
    period.notes = options.notes;
  }
  
  return true;
};

// Method để lấy thống kê giảng dạy
teacherScheduleSchema.methods.getTeachingStatistics = function() {
  let totalPeriods = 0;
  let completedPeriods = 0;
  let cancelledPeriods = 0;
  let absentPeriods = 0;
  
  const classCounts = {};
  const subjectCounts = {};
  
  this.weeks.forEach(week => {
    week.days.forEach(day => {
      day.periods.forEach(period => {
        totalPeriods++;
        
        // Đếm theo trạng thái
        switch(period.status) {
          case 'completed':
            completedPeriods++;
            break;
          case 'cancelled':
            cancelledPeriods++;
            break;
          case 'absent':
            absentPeriods++;
            break;
        }
        
        // Đếm theo lớp
        if (period.className) {
          classCounts[period.className] = (classCounts[period.className] || 0) + 1;
        }
        
        // Đếm theo môn học
        if (period.subject) {
          const subjectId = period.subject.toString();
          subjectCounts[subjectId] = (subjectCounts[subjectId] || 0) + 1;
        }
      });
    });
  });
  
  return {
    totalPeriods,
    completedPeriods,
    cancelledPeriods,
    absentPeriods,
    pendingPeriods: totalPeriods - completedPeriods - cancelledPeriods - absentPeriods,
    completionRate: totalPeriods > 0 ? (completedPeriods / totalPeriods * 100).toFixed(2) : 0,
    classCounts,
    subjectCounts
  };
};

// Static method để tạo template lịch dạy cho giáo viên
teacherScheduleSchema.statics.createTemplate = function(teacherId, academicYear, createdBy, teachingAssignments = []) {
  const startDate = new Date('2024-08-12');
  const totalWeeks = 38;
  
  const weeks = [];
  
  // Tạo 38 tuần
  for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
    const weekStartDate = new Date(startDate);
    weekStartDate.setDate(startDate.getDate() + (weekNum - 1) * 7);
    
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 5);
    
    const days = [];
    
    // Tạo 6 ngày trong tuần (thứ 2 đến thứ 7)
    for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
      const dayDate = new Date(weekStartDate);
      dayDate.setDate(weekStartDate.getDate() + dayIndex);
      
      const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIndex];
      
      days.push({
        dayOfWeek: dayIndex + 2,
        dayName: dayName,
        date: new Date(dayDate),
        periods: [] // Sẽ được điền khi có phân công giảng dạy
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
    teacher: teacherId,
    academicYear,
    academicStartDate: new Date(startDate),
    totalWeeks: totalWeeks,
    classes: teachingAssignments,
    weeks: weeks,
    createdBy,
    status: 'draft'
  });
};

const TeacherSchedule = mongoose.model('TeacherSchedule', teacherScheduleSchema);

module.exports = TeacherSchedule; 