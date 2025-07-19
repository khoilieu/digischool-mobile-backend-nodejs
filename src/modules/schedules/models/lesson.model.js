const mongoose = require("mongoose");

/**
 * Lesson Schema
 * Định nghĩa cấu trúc dữ liệu cho một tiết học
 */
const lessonSchema = new mongoose.Schema(
  {
    // ===== CORE FIELDS =====

    // Unique identifier cho lesson
    lessonId: {
      type: String,
      required: true,
      unique: true,
    },

    // ===== REFERENCES =====

    // Lớp học
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: function () {
        return this.type !== "empty";
      },
    },

    // Môn học
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: function () {
        return this.type === "regular" || this.type === "makeup";
      },
    },

    // Giáo viên chính
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.type !== "empty";
      },
    },

    // Giáo viên dạy bù (không thay thế giáo viên gốc)
    substituteTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
      sparse: true, // Chỉ lưu khi có giá trị
    },

    // Năm học
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },

    // Khung giờ
    timeSlot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimeSlot",
      required: true,
    },

    // ===== TIME INFORMATION =====

    // Ngày học
    scheduledDate: {
      type: Date,
      required: true,
    },

    // ===== LESSON PROPERTIES =====

    // Loại lesson
    type: {
      type: String,
      enum: ["regular", "makeup", "empty", "fixed"],
      default: "regular",
    },

    // Trạng thái
    status: {
      type: String,
      enum: ["scheduled", "completed", "absent"],
      default: "scheduled",
    },

    // ===== CONTENT FIELDS =====

    // Chủ đề bài học
    topic: {
      type: String,
      maxlength: 200,
    },

    // Mô tả chi tiết
    description: {
      type: String,
      maxlength: 1000,
      trim: true,
    },

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

lessonSchema.index({ lessonId: 1 }, { unique: true });
lessonSchema.index({ class: 1, scheduledDate: 1 });
lessonSchema.index({ teacher: 1, scheduledDate: 1, timeSlot: 1 });
lessonSchema.index({ subject: 1, academicYear: 1 });
lessonSchema.index({ type: 1, status: 1 });
lessonSchema.index({ scheduledDate: 1, timeSlot: 1 });
lessonSchema.index({ academicYear: 1, class: 1 });

// ===== MIDDLEWARE =====

/**
 * Pre-save middleware để tự động tạo lessonId
 */
lessonSchema.pre("save", function (next) {
  if (!this.lessonId && this.class && this.scheduledDate && this.timeSlot) {
    const classId = this.class.toString().slice(-6);
    const date = this.scheduledDate
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");
    const timeSlotId = this.timeSlot.toString().slice(-4);

    this.lessonId = `${classId}_${date}_${timeSlotId}`;
  }
  next();
});

// ===== VIRTUALS =====

/**
 * Virtual để lấy thông tin đầy đủ
 */
lessonSchema.virtual("fullInfo").get(function () {
  return {
    id: this._id,
    lessonId: this.lessonId,
    type: this.type,
    status: this.status,
    scheduledDate: this.scheduledDate,
    topic: this.topic,
    description: this.description,
  };
});

// ===== INSTANCE METHODS =====

/**
 * Method để complete lesson
 */
lessonSchema.methods.complete = function () {
  this.status = "completed";
  return this.save();
};

/**
 * Method để cancel lesson
 */
lessonSchema.methods.cancel = function (reason) {
  this.status = "absent";
  this.description = reason;
  return this.save();
};

// ===== STATIC METHODS =====

/**
 * Static method để kiểm tra conflict
 */
lessonSchema.statics.checkConflict = async function (
  teacherId,
  scheduledDate,
  timeSlotId,
  excludeId = null
) {
  const query = {
    teacher: teacherId,
    scheduledDate: scheduledDate,
    timeSlot: timeSlotId,
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const conflict = await this.findOne(query);
  return !!conflict;
};

/**
 * Static method để lấy lessons theo teacher và date range
 */
lessonSchema.statics.getTeacherLessons = function (
  teacherId,
  startDate,
  endDate
) {
  return this.find({
    $or: [{ teacher: teacherId }, { substituteTeacher: teacherId }],
    scheduledDate: { $gte: startDate, $lte: endDate },
    status: { $ne: "absent" },
  })
    .populate("class", "className")
    .populate("subject", "subjectName subjectCode")
    .populate("teacher", "name email")
    .populate("substituteTeacher", "name email")
    .populate("timeSlot", "period startTime endTime type")
    .sort({ scheduledDate: 1, "timeSlot.period": 1 });
};

/**
 * Static method để lấy lessons theo class và date range
 */
lessonSchema.statics.getClassLessons = function (classId, startDate, endDate) {
  return this.find({
    class: classId,
    scheduledDate: { $gte: startDate, $lte: endDate },
  })
    .populate("subject", "subjectName subjectCode")
    .populate("teacher", "name email")
    .populate("substituteTeacher", "name email")
    .populate("timeSlot", "period startTime endTime type")
    .sort({ scheduledDate: 1, "timeSlot.period": 1 });
};

/**
 * Static method để lấy statistics
 */
lessonSchema.statics.getStatistics = async function (classId, academicYearId) {
  const stats = await this.aggregate([
    {
      $match: {
        class: classId,
        academicYear: academicYearId,
        type: { $ne: "empty" },
      },
    },
    {
      $group: {
        _id: { status: "$status", type: "$type" },
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    completed: 0,
    scheduled: 0,
    absent: 0,
    byType: {
      regular: 0,
      makeup: 0,
    },
  };

  stats.forEach((stat) => {
    result.total += stat.count;
    result[stat._id.status] = (result[stat._id.status] || 0) + stat.count;
    result.byType[stat._id.type] =
      (result.byType[stat._id.type] || 0) + stat.count;
  });

  result.completionRate =
    result.total > 0 ? ((result.completed / result.total) * 100).toFixed(2) : 0;

  return result;
};

// ===== MODEL EXPORT =====

const Lesson = mongoose.model("Lesson", lessonSchema);

module.exports = Lesson;
