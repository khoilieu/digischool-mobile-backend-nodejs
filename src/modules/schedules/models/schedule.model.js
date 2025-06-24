const mongoose = require('mongoose');

// Schema chính cho thời khóa biểu theo kiến trúc mới
const scheduleSchema = new mongoose.Schema({
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
  // Weekly schedules reference
  weeklySchedules: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WeeklySchedule'
  }],
  
  // Trạng thái thời khóa biểu
  status: {
    type: String,
    enum: ['draft', 'published', 'active', 'completed', 'archived'],
    default: 'draft'
  },
  
  // Semester (optional)
  semester: {
    type: Number,
    enum: [1, 2],
    default: 1
  },
  
  // Cấu hình mặc định
  defaultConfiguration: {
    periodsPerDay: {
      type: Number,
      default: 10,
      min: 5,
      max: 12
    },
    workingDays: [{
      type: Number,
      min: 1,
      max: 7 // 1=Sunday, 7=Saturday
    }],
    defaultTimeSlots: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeSlot'
    }]
  },
  
  // Statistics
  statistics: {
  totalWeeks: {
    type: Number,
      default: 0
    },
    totalLessons: {
      type: Number,
      default: 0
    },
    completedLessons: {
    type: Number,
      default: 0
    },
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  // Notes và comments
  notes: {
    type: String,
    maxlength: 1000
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
scheduleSchema.index({ class: 1, academicYear: 1 }, { unique: true });
scheduleSchema.index({ academicYear: 1 });
scheduleSchema.index({ status: 1 });
scheduleSchema.index({ semester: 1 });
scheduleSchema.index({ createdBy: 1 });

// Virtuals
scheduleSchema.virtual('className', {
  ref: 'Class',
  localField: 'class',
  foreignField: '_id',
  justOne: true
});

scheduleSchema.virtual('academicYearInfo', {
  ref: 'AcademicYear',
  localField: 'academicYear',
  foreignField: '_id',
  justOne: true
});

// Virtual để tính completion rate
scheduleSchema.virtual('completionRate').get(function() {
  if (this.statistics.totalLessons === 0) return 0;
  return ((this.statistics.completedLessons / this.statistics.totalLessons) * 100).toFixed(2);
});

// Methods with new architecture
scheduleSchema.methods.getWeeklySchedule = async function(weekNumber) {
  const WeeklySchedule = mongoose.model('WeeklySchedule');
  
  return await WeeklySchedule.findOne({
    _id: { $in: this.weeklySchedules },
    weekNumber: weekNumber
  }).populate({
    path: 'lessons',
    populate: [
      { path: 'subject', select: 'subjectName subjectCode' },
      { path: 'teacher', select: 'name email' },
      { path: 'timeSlot', select: 'period startTime endTime type' }
    ]
  });
};

scheduleSchema.methods.getDailySchedule = async function(date) {
  const Lesson = mongoose.model('Lesson');
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);
  
  return await Lesson.find({
    class: this.class,
    academicYear: this.academicYear,
    scheduledDate: {
      $gte: targetDate,
      $lt: nextDate
    }
        })
        .populate('subject', 'subjectName subjectCode')
        .populate('teacher', 'name email')
  .populate('timeSlot', 'period startTime endTime type name')
  .sort({ 'timeSlot.period': 1 });
};

// Method để lấy lesson theo ID
scheduleSchema.methods.getLessonById = async function(lessonId) {
  const Lesson = mongoose.model('Lesson');
  
  return await Lesson.findOne({
    _id: lessonId,
    class: this.class,
    academicYear: this.academicYear
  })
  .populate('subject', 'subjectName subjectCode')
  .populate('teacher', 'name email')
  .populate('timeSlot', 'period startTime endTime type name');
};

// Method để kiểm tra conflict teacher
scheduleSchema.methods.checkTeacherConflict = async function(teacherId, scheduledDate, timeSlotId) {
  const Lesson = mongoose.model('Lesson');
  
  const conflict = await Lesson.findOne({
    teacher: teacherId,
    scheduledDate: scheduledDate,
    timeSlot: timeSlotId,
    status: { $ne: 'cancelled' }
  });
  
  return !!conflict;
};

// Method để cập nhật statistics
scheduleSchema.methods.updateStatistics = async function() {
  const Lesson = mongoose.model('Lesson');
  const WeeklySchedule = mongoose.model('WeeklySchedule');
  
  // Update lessons statistics
  const lessonStats = await Lesson.aggregate([
    {
      $match: {
        class: this.class,
        academicYear: this.academicYear,
        type: { $ne: 'empty' }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  let totalLessons = 0;
  let completedLessons = 0;
  
  lessonStats.forEach(stat => {
    totalLessons += stat.count;
    if (stat._id === 'completed') {
      completedLessons = stat.count;
    }
  });
  
  // Update weekly schedules count
  const totalWeeks = this.weeklySchedules.length;
  
  this.statistics = {
    totalWeeks,
    totalLessons,
    completedLessons,
    overallProgress: totalLessons > 0 ? 
      ((completedLessons / totalLessons) * 100).toFixed(2) : 0
  };
  
  return this.save();
};

// Method để thêm weekly schedule
scheduleSchema.methods.addWeeklySchedule = function(weeklyScheduleId) {
  if (!this.weeklySchedules.includes(weeklyScheduleId)) {
    this.weeklySchedules.push(weeklyScheduleId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method để publish schedule
scheduleSchema.methods.publish = function() {
  this.status = 'published';
  return this.save();
};

// Method để activate schedule
scheduleSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

// Static methods
scheduleSchema.statics.createSchedule = async function(classId, academicYearId, createdBy) {
  console.log(`🏗️ Creating schedule for class ${classId}, academic year ${academicYearId}...`);
  
  const schedule = new this({
    class: classId,
    academicYear: academicYearId,
    weeklySchedules: [],
    status: 'draft',
    defaultConfiguration: {
      periodsPerDay: 10,
      workingDays: [2, 3, 4, 5, 6, 7], // Monday to Saturday
      defaultTimeSlots: []
    },
    statistics: {
      totalWeeks: 0,
      totalLessons: 0,
      completedLessons: 0,
      overallProgress: 0
    },
    createdBy
  });
  
  await schedule.save();
  console.log(`✅ Created schedule ${schedule._id}`);
  
  return schedule;
};

// Static method để tìm schedule theo class và academic year
scheduleSchema.statics.findByClassAndYear = function(classId, academicYearId) {
  return this.findOne({
    class: classId,
    academicYear: academicYearId
  })
  .populate('class', 'className')
  .populate('academicYear', 'name startDate endDate')
  .populate('weeklySchedules');
};

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule; 