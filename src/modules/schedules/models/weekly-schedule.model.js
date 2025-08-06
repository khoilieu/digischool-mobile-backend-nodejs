const mongoose = require("mongoose");

/**
 * Weekly Schedule Schema
 * Định nghĩa cấu trúc dữ liệu cho thời khóa biểu tuần
 */
const weeklyScheduleSchema = new mongoose.Schema(
  {
    // ===== CORE FIELDS =====

    // Lớp học
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    // Năm học
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },

    // ===== WEEK INFORMATION =====

    // Số tuần
    weekNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 52,
    },

    // Học kỳ
    semester: {
      type: String,
      required: true,
      trim: true,
    },

    // Ngày bắt đầu tuần
    startDate: {
      type: Date,
      required: true,
    },

    // Ngày kết thúc tuần
    endDate: {
      type: Date,
      required: true,
    },

    // ===== LESSONS =====

    // Array chứa references đến lessons
    lessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
      },
    ],

    // ===== METADATA =====

    // Người tạo
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ===== INDEXES =====

weeklyScheduleSchema.index(
  { class: 1, academicYear: 1, weekNumber: 1 },
  { unique: true }
);
weeklyScheduleSchema.index({ startDate: 1, endDate: 1 });
weeklyScheduleSchema.index({ createdBy: 1 });

// Thêm index cho aggregation queries
weeklyScheduleSchema.index({ "lessons": 1 });
weeklyScheduleSchema.index({ class: 1, academicYear: 1 });
weeklyScheduleSchema.index({ weekNumber: 1 });

// ===== VIRTUALS =====

/**
 * Virtual để lấy thông tin tuần
 */
weeklyScheduleSchema.virtual("weekInfo").get(function () {
  return {
    weekNumber: this.weekNumber,
    startDate: this.startDate,
    endDate: this.endDate,
    totalDays:
      Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24)) + 1,
  };
});

// ===== INSTANCE METHODS =====

/**
 * Method để thêm lesson vào tuần
 */
weeklyScheduleSchema.methods.addLesson = function (lessonId) {
  if (!this.lessons.includes(lessonId)) {
    this.lessons.push(lessonId);
    return this.save();
  }
  return Promise.resolve(this);
};

/**
 * Method để xóa lesson khỏi tuần
 */
weeklyScheduleSchema.methods.removeLesson = function (lessonId) {
  this.lessons = this.lessons.filter((id) => !id.equals(lessonId));
  return this.save();
};

// ===== STATIC METHODS =====

/**
 * Static method để tạo tuần mới
 */
weeklyScheduleSchema.statics.createWeek = async function (
  classId,
  academicYearId,
  weekNumber,
  startDate,
  createdBy
) {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // 7 days in a week

  const weeklySchedule = new this({
    class: classId,
    academicYear: academicYearId,
    weekNumber,
    startDate,
    endDate,
    lessons: [],
    createdBy,
  });

  return weeklySchedule.save();
};

/**
 * Static method để lấy tuần theo class và week number
 */
weeklyScheduleSchema.statics.getWeekByNumber = function (
  classId,
  academicYearId,
  weekNumber
) {
  return this.findOne({
    class: classId,
    academicYear: academicYearId,
    weekNumber,
  }).populate("lessons");
};

/**
 * Static method để lấy tuần theo date range
 */
weeklyScheduleSchema.statics.getWeeksByDateRange = function (
  classId,
  academicYearId,
  startDate,
  endDate
) {
  return this.find({
    class: classId,
    academicYear: academicYearId,
    $or: [
      { startDate: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
    ],
  }).sort({ weekNumber: 1 });
};

// ===== MODEL EXPORT =====

const WeeklySchedule = mongoose.model("WeeklySchedule", weeklyScheduleSchema);

module.exports = WeeklySchedule;
