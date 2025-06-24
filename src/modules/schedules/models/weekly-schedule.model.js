const mongoose = require('mongoose');

const weeklyScheduleSchema = new mongoose.Schema({
  // References
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: true
  },
  
  // Thông tin tuần
  weekNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 52
  },
  
  startDate: {
    type: Date,
    required: true
  },
  
  endDate: {
    type: Date,
    required: true
  },
  
  // Array chứa references đến lessons
  lessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  }],
  
  // Trạng thái tuần học
  status: {
    type: String,
    enum: ['draft', 'published', 'completed', 'archived'],
    default: 'draft'
  },
  
  // Thông tin bổ sung
  notes: {
    type: String,
    maxlength: 500
  },
  
  // Metadata cho tuần đặc biệt
  specialWeek: {
    isSpecial: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      enum: ['exam', 'holiday', 'event', 'other']
    },
    description: String
  },
  
  // Thống kê tuần
  statistics: {
    totalLessons: {
      type: Number,
      default: 0
    },
    completedLessons: {
      type: Number,
      default: 0
    },
    cancelledLessons: {
      type: Number,
      default: 0
    },
    attendanceRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
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
weeklyScheduleSchema.index({ class: 1, academicYear: 1, weekNumber: 1 }, { unique: true });
weeklyScheduleSchema.index({ startDate: 1, endDate: 1 });
weeklyScheduleSchema.index({ status: 1 });
weeklyScheduleSchema.index({ 'specialWeek.isSpecial': 1 });

// Virtual để lấy thông tin tuần
weeklyScheduleSchema.virtual('weekInfo').get(function() {
  return {
    weekNumber: this.weekNumber,
    startDate: this.startDate,
    endDate: this.endDate,
    totalDays: Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24)) + 1,
    status: this.status
  };
});

// Method để cập nhật statistics
weeklyScheduleSchema.methods.updateStatistics = async function() {
  const Lesson = mongoose.model('Lesson');
  
  const stats = await Lesson.aggregate([
    { $match: { _id: { $in: this.lessons } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgAttendance: { $avg: '$attendance.presentStudents' }
      }
    }
  ]);
  
  let totalLessons = 0;
  let completedLessons = 0;
  let cancelledLessons = 0;
  let totalAttendance = 0;
  let attendanceCount = 0;
  
  stats.forEach(stat => {
    totalLessons += stat.count;
    
    if (stat._id === 'completed') {
      completedLessons = stat.count;
      if (stat.avgAttendance) {
        totalAttendance += stat.avgAttendance * stat.count;
        attendanceCount += stat.count;
      }
    } else if (stat._id === 'cancelled') {
      cancelledLessons = stat.count;
    }
  });
  
  this.statistics = {
    totalLessons,
    completedLessons,
    cancelledLessons,
    attendanceRate: attendanceCount > 0 ? (totalAttendance / attendanceCount).toFixed(2) : 0
  };
  
  return this.save();
};

// Method để thêm lesson vào tuần
weeklyScheduleSchema.methods.addLesson = function(lessonId) {
  if (!this.lessons.includes(lessonId)) {
    this.lessons.push(lessonId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method để xóa lesson khỏi tuần
weeklyScheduleSchema.methods.removeLesson = function(lessonId) {
  this.lessons = this.lessons.filter(id => !id.equals(lessonId));
  return this.save();
};

// Method để publish tuần
weeklyScheduleSchema.methods.publish = function() {
  this.status = 'published';
  return this.save();
};

// Method để complete tuần
weeklyScheduleSchema.methods.complete = function() {
  this.status = 'completed';
  return this.updateStatistics();
};

// Static method để tạo tuần mới
weeklyScheduleSchema.statics.createWeek = async function(classId, academicYearId, weekNumber, startDate, createdBy) {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // 7 days in a week
  
  const weeklySchedule = new this({
    class: classId,
    academicYear: academicYearId,
    weekNumber,
    startDate,
    endDate,
    lessons: [],
    createdBy
  });
  
  return weeklySchedule.save();
};

// Static method để lấy tuần theo class và week number
weeklyScheduleSchema.statics.getWeekByNumber = function(classId, academicYearId, weekNumber) {
  return this.findOne({
    class: classId,
    academicYear: academicYearId,
    weekNumber
  }).populate('lessons');
};

// Static method để lấy tuần theo date range
weeklyScheduleSchema.statics.getWeeksByDateRange = function(classId, academicYearId, startDate, endDate) {
  return this.find({
    class: classId,
    academicYear: academicYearId,
    $or: [
      { startDate: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
    ]
  }).sort({ weekNumber: 1 });
};

// Static method để lấy statistics tổng quan
weeklyScheduleSchema.statics.getOverallStatistics = async function(classId, academicYearId) {
  const stats = await this.aggregate([
    { 
      $match: { 
        class: classId,
        academicYear: academicYearId 
      } 
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalLessons: { $sum: '$statistics.totalLessons' },
        completedLessons: { $sum: '$statistics.completedLessons' },
        cancelledLessons: { $sum: '$statistics.cancelledLessons' },
        avgAttendanceRate: { $avg: '$statistics.attendanceRate' }
      }
    }
  ]);
  
  const result = {
    totalWeeks: 0,
    publishedWeeks: 0,
    completedWeeks: 0,
    totalLessons: 0,
    completedLessons: 0,
    cancelledLessons: 0,
    overallAttendanceRate: 0
  };
  
  let totalAttendanceSum = 0;
  let attendanceWeeks = 0;
  
  stats.forEach(stat => {
    result.totalWeeks += stat.count;
    result.totalLessons += stat.totalLessons || 0;
    result.completedLessons += stat.completedLessons || 0;
    result.cancelledLessons += stat.cancelledLessons || 0;
    
    if (stat._id === 'published') {
      result.publishedWeeks = stat.count;
    } else if (stat._id === 'completed') {
      result.completedWeeks = stat.count;
    }
    
    if (stat.avgAttendanceRate > 0) {
      totalAttendanceSum += stat.avgAttendanceRate * stat.count;
      attendanceWeeks += stat.count;
    }
  });
  
  result.overallAttendanceRate = attendanceWeeks > 0 ? 
    (totalAttendanceSum / attendanceWeeks).toFixed(2) : 0;
  
  result.completionRate = result.totalLessons > 0 ? 
    ((result.completedLessons / result.totalLessons) * 100).toFixed(2) : 0;
  
  return result;
};

const WeeklySchedule = mongoose.model('WeeklySchedule', weeklyScheduleSchema);

module.exports = WeeklySchedule; 