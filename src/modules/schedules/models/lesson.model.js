const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
  {
    // Unique identifier cho lesson
    lessonId: {
      type: String,
      required: true,
      unique: true,
    },

    // References
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: function () {
        return this.type === "regular" || this.type === "makeup";
      },
    },

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
      default: null,
    },

    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },

    timeSlot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimeSlot",
      required: true,
    },

    // Thông tin thời gian
    scheduledDate: {
      type: Date,
      required: true,
    },

    actualDate: {
      type: Date,
      default: null,
    },

    // Loại lesson
    type: {
      type: String,
      enum: ["regular", "makeup", "extracurricular", "fixed", "empty"],
      default: "regular",
    },

    // Trạng thái
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "postponed", "absent"],
      default: "scheduled",
    },

    // Thông tin chi tiết
    topic: {
      type: String,
      maxlength: 200,
    },

    description: {
      type: String,
      maxlength: 1000,
      trim: true,
    },

    notes: {
      type: String,
      maxlength: 500,
    },

    // Đánh giá lesson
    evaluation: {
      quality: {
        type: Number,
        min: 1,
        max: 5,
      },
      effectiveness: {
        type: Number,
        min: 1,
        max: 5,
      },
      studentEngagement: {
        type: Number,
        min: 1,
        max: 5,
      },
      comments: String,
    },

    // Thông tin attendance
    attendance: {
      totalStudents: {
        type: Number,
        default: 0,
      },
      presentStudents: {
        type: Number,
        default: 0,
      },
      absentStudents: [
        {
          student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          reason: String,
        },
      ],
    },

    // Thông tin makeup lesson
    makeupInfo: {
      originalLesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
      },
      reason: String,
      originalDate: Date,
    },

    // Thông tin extracurricular
    extracurricularInfo: {
      activityName: String,
      activityType: {
        type: String,
        enum: [
          "club",
          "sport",
          "art",
          "science",
          "community_service",
          "competition",
          "other",
        ],
      },
      location: String,
      maxParticipants: Number,
    },

    // Thông tin fixed lesson
    fixedInfo: {
      type: {
        type: String,
        enum: ["flag_ceremony", "class_meeting", "assembly", "break", "other"],
      },
      description: String,
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Trạng thái đánh giá giáo viên
    isEvaluatedByTeacher: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
lessonSchema.index({ lessonId: 1 }, { unique: true });
lessonSchema.index({ class: 1, scheduledDate: 1 });
lessonSchema.index({ teacher: 1, scheduledDate: 1, timeSlot: 1 });
lessonSchema.index({ subject: 1, academicYear: 1 });
lessonSchema.index({ type: 1, status: 1 });
lessonSchema.index({ scheduledDate: 1, timeSlot: 1 });
lessonSchema.index({ academicYear: 1, class: 1 });

// Pre-save middleware để tự động tạo lessonId
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

// Virtual để lấy thông tin đầy đủ
lessonSchema.virtual("fullInfo").get(function () {
  return {
    id: this._id,
    lessonId: this.lessonId,
    type: this.type,
    status: this.status,
    scheduledDate: this.scheduledDate,
    actualDate: this.actualDate,
    topic: this.topic,
    description: this.description,
    notes: this.notes,
  };
});

// Method để cập nhật attendance
lessonSchema.methods.updateAttendance = function (
  presentStudents,
  absentStudents = []
) {
  this.attendance.presentStudents = presentStudents;
  this.attendance.absentStudents = absentStudents;
  this.attendance.totalStudents = presentStudents + absentStudents.length;
  return this.save();
};

// Method để đánh giá lesson
lessonSchema.methods.evaluate = function (evaluation) {
  this.evaluation = {
    ...this.evaluation,
    ...evaluation,
  };
  return this.save();
};

// Method để complete lesson
lessonSchema.methods.complete = function (actualDate = null, notes = null) {
  this.status = "completed";
  this.actualDate = actualDate || new Date();
  if (notes) this.notes = notes;
  return this.save();
};

// Method để cancel lesson
lessonSchema.methods.cancel = function (reason) {
  this.status = "cancelled";
  this.notes = reason;
  return this.save();
};

// Static method để kiểm tra conflict
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
    status: { $nin: ["cancelled"] },
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const conflict = await this.findOne(query);
  return !!conflict;
};

// Static method để lấy lessons theo teacher và date range
lessonSchema.statics.getTeacherLessons = function (
  teacherId,
  startDate,
  endDate
) {
  return this.find({
    $or: [{ teacher: teacherId }, { substituteTeacher: teacherId }],
    scheduledDate: { $gte: startDate, $lte: endDate },
    status: { $ne: "cancelled" },
  })
    .populate("class", "className")
    .populate("subject", "subjectName subjectCode")
    .populate("teacher", "name email")
    .populate("substituteTeacher", "name email")
    .populate("timeSlot", "period startTime endTime type")
    .sort({ scheduledDate: 1, "timeSlot.period": 1 });
};

// Static method để lấy lessons theo class và date range
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

// Static method để tạo makeup lesson
lessonSchema.statics.createMakeupLesson = async function (
  originalLessonId,
  newDate,
  newTimeSlot,
  teacherId,
  createdBy
) {
  const originalLesson = await this.findById(originalLessonId);
  if (!originalLesson) throw new Error("Original lesson not found");

  const makeupLesson = new this({
    class: originalLesson.class,
    subject: originalLesson.subject,
    teacher: teacherId || originalLesson.teacher,
    academicYear: originalLesson.academicYear,
    timeSlot: newTimeSlot,
    scheduledDate: newDate,
    type: "makeup",
    status: "scheduled",
    topic: originalLesson.topic,
    makeupInfo: {
      originalLesson: originalLessonId,
      reason: "Makeup for cancelled/postponed lesson",
      originalDate: originalLesson.scheduledDate,
    },
    createdBy,
  });

  return makeupLesson.save();
};

// Static method để lấy statistics
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
    cancelled: 0,
    absent: 0,
    byType: {
      regular: 0,
      makeup: 0,
      extracurricular: 0,
      fixed: 0,
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

const Lesson = mongoose.model("Lesson", lessonSchema);

module.exports = Lesson;
