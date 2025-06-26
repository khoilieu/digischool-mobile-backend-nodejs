const mongoose = require("mongoose");

// Schema cho một tiết học cụ thể (model riêng biệt)
const periodSchema = new mongoose.Schema(
  {
    // ID tự động với format: scheduleId_week{weekNumber}_day{dayOfWeek}_period{periodNumber}
    periodId: {
      type: String,
      required: true,
      unique: true,
    },

    periodNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },

    // Reference đến lớp học
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    // Reference đến schedule chính
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      required: true,
    },

    // Thông tin vị trí trong thời khóa biểu
    location: {
      weekNumber: {
        type: Number,
        required: true,
        min: 1,
        max: 38,
      },
      dayOfWeek: {
        type: Number,
        required: true,
        min: 1, // Chủ nhật = 1
        max: 7, // Thứ 7 = 7
      },
      dayName: {
        type: String,
        enum: [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        required: true,
      },
      date: {
        type: Date,
        required: true,
      },
      periodNumber: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
      },
    },

    // Thông tin thời gian và vị trí (compatibility với code cũ)
    weekNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 38,
    },

    dayOfWeek: {
      type: Number,
      required: true,
      min: 1, // Chủ nhật = 1
      max: 7, // Thứ 7 = 7
    },

    dayName: {
      type: String,
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    // Thông tin môn học và giáo viên
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: false,
      default: null,
      validate: {
        validator: function (v) {
          // Subject is only required for regular periods (not empty, fixed, etc.)
          if (this.periodType === "regular" && !v) {
            return false;
          }
          return true;
        },
        message: "Subject is required for regular periods",
      },
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
      validate: {
        validator: function (v) {
          // Teacher is only required for regular periods (not empty, fixed, etc.)
          if (this.periodType === "regular" && !v) {
            return false;
          }
          return true;
        },
        message: "Teacher is required for regular periods",
      },
    },

    // Thông tin thời gian
    session: {
      type: String,
      enum: ["morning", "afternoon"],
      required: false,
    },

    timeStart: {
      type: String,
      required: false,
    },

    timeEnd: {
      type: String,
      required: false,
    },

    // Phân loại tiết học
    periodType: {
      type: String,
      enum: ["regular", "makeup", "extracurricular", "fixed", "empty"],
      default: "regular",
    },

    // Trạng thái học tập
    status: {
      type: String,
      enum: ["not_started", "completed", "absent", "makeup"],
      default: "not_started",
    },

    // Thông tin thực tế
    actualDate: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      maxlength: 200,
    },

    // Đánh dấu tiết học cố định (DEPRECATED, sử dụng periodType = 'fixed')
    fixed: {
      type: Boolean,
      default: false,
    },

    specialType: {
      type: String,
      enum: ["flag_ceremony", "class_meeting"],
      required: false,
    },

    // Phòng học
    classroom: {
      type: String,
      maxlength: 50,
    },

    // Thông tin bổ sung cho tiết dạy bù
    makeupInfo: {
      originalDate: {
        type: Date,
        required: false,
      },
      reason: {
        type: String,
        maxlength: 200,
        required: false,
      },
      originalPeriodNumber: {
        type: Number,
        min: 1,
        max: 10,
      },
      originalWeekNumber: {
        type: Number,
        min: 1,
        max: 38,
      },
      originalDayOfWeek: {
        type: Number,
        min: 1,
        max: 7,
      },
    },

    // Thông tin bổ sung cho hoạt động ngoại khóa
    extracurricularInfo: {
      activityName: {
        type: String,
        required: false,
      },
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
        required: false,
      },
      location: {
        type: String,
        maxlength: 100,
      },
      maxParticipants: {
        type: Number,
        min: 1,
      },
    },

    // Thông tin thay thế (nếu là tiết thay)
    substituteInfo: {
      originalTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reason: {
        type: String,
        maxlength: 200,
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
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
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook để xử lý cleanup trước validation
periodSchema.pre("validate", function (next) {
  // Sync location object với top-level fields
  if (this.weekNumber && this.dayOfWeek && this.date && this.periodNumber) {
    this.location = {
      weekNumber: this.weekNumber,
      dayOfWeek: this.dayOfWeek,
      dayName: this.dayName,
      date: this.date,
      periodNumber: this.periodNumber,
    };
  }

  // Đối với empty periods, xóa các fields không cần thiết
  if (this.periodType === "empty") {
    this.subject = undefined;
    this.teacher = undefined;
    this.session = undefined;
  }

  // Đối với regular periods, đảm bảo session được set
  if (this.periodType === "regular" && !this.session) {
    this.session = this.periodNumber <= 5 ? "morning" : "afternoon";
  }

  next();
});

// Pre-save hook để tạo periodId tự động với format mới
periodSchema.pre("save", function (next) {
  // Tạo periodId với format: scheduleId_week{weekNumber}_day{dayOfWeek}_period{periodNumber}
  if (
    !this.periodId &&
    this.schedule &&
    this.weekNumber &&
    this.dayOfWeek &&
    this.periodNumber
  ) {
    const scheduleId = this.schedule.toString().slice(-6); // Lấy 6 ký tự cuối của schedule ID
    const weekNum = String(this.weekNumber).padStart(2, "0");
    const dayNum = String(this.dayOfWeek);
    const periodNum = String(this.periodNumber).padStart(2, "0");

    // Format: scheduleId_week{weekNumber}_day{dayOfWeek}_period{periodNumber}
    this.periodId = `${scheduleId}_week${weekNum}_day${dayNum}_period${periodNum}`;

    console.log(
      `🆔 Generated periodId: ${this.periodId} for Schedule: ${this.schedule}`
    );
  }

  // Ensure required fields for different period types
  if (this.periodType === "regular" || this.periodType === "fixed") {
    // Đảm bảo session được set đúng
    if (!this.session) {
      this.session = this.periodNumber <= 5 ? "morning" : "afternoon";
    }

    // Đảm bảo timeStart và timeEnd được set
    if (!this.timeStart || !this.timeEnd) {
      const timeSlots = [
        { start: "07:00", end: "07:45" }, // Tiết 1
        { start: "07:50", end: "08:35" }, // Tiết 2
        { start: "08:40", end: "09:25" }, // Tiết 3
        { start: "09:45", end: "10:30" }, // Tiết 4
        { start: "10:35", end: "11:20" }, // Tiết 5
        { start: "12:30", end: "13:15" }, // Tiết 6
        { start: "13:20", end: "14:05" }, // Tiết 7
        { start: "14:10", end: "14:55" }, // Tiết 8
        { start: "15:00", end: "15:45" }, // Tiết 9
        { start: "15:50", end: "16:35" }, // Tiết 10
      ];
      const timeSlot = timeSlots[this.periodNumber - 1];
      if (timeSlot) {
        this.timeStart = timeSlot.start;
        this.timeEnd = timeSlot.end;
      }
    }
  }

  next();
});

// Indexes cho performance
periodSchema.index({ periodId: 1 }, { unique: true });
periodSchema.index({ class: 1, schedule: 1 });
periodSchema.index({
  schedule: 1,
  weekNumber: 1,
  dayOfWeek: 1,
  periodNumber: 1,
});
periodSchema.index({ teacher: 1, date: 1, periodNumber: 1 }); // Để check conflicts
periodSchema.index({ subject: 1, date: 1 });
periodSchema.index({ periodType: 1, status: 1 });
periodSchema.index({ date: 1, periodNumber: 1 });
periodSchema.index({
  "location.weekNumber": 1,
  "location.dayOfWeek": 1,
  "location.periodNumber": 1,
});

// Virtual để lấy tên ngày bằng tiếng Việt
periodSchema.virtual("dayNameVN").get(function () {
  const dayNames = [
    "",
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];
  return dayNames[this.dayOfWeek] || "Unknown";
});

// Virtual để lấy tên buổi bằng tiếng Việt
periodSchema.virtual("sessionVN").get(function () {
  return this.session === "morning" ? "Sáng" : "Chiều";
});

// Virtual để lấy thông tin vị trí đầy đủ
periodSchema.virtual("fullLocation").get(function () {
  return {
    schedule: this.schedule,
    week: this.weekNumber,
    day: this.dayOfWeek,
    dayName: this.dayName,
    dayNameVN: this.dayNameVN,
    period: this.periodNumber,
    date: this.date,
    session: this.session,
    sessionVN: this.sessionVN,
    timeSlot: `${this.timeStart} - ${this.timeEnd}`,
  };
});

// Method để check xung đột giáo viên
periodSchema.statics.checkTeacherConflict = async function (
  teacherId,
  date,
  periodNumber,
  excludePeriodId = null
) {
  const query = {
    teacher: teacherId,
    date: date,
    periodNumber: periodNumber,
    status: { $ne: "cancelled" },
  };

  if (excludePeriodId) {
    query._id = { $ne: excludePeriodId };
  }

  const conflictingPeriod = await this.findOne(query);
  return !!conflictingPeriod;
};

// Method để lấy periods theo teacher và date range
periodSchema.statics.getTeacherPeriods = function (
  teacherId,
  startDate,
  endDate
) {
  return this.find({
    teacher: teacherId,
    date: { $gte: startDate, $lte: endDate },
  })
    .populate("class", "className")
    .populate("subject", "subjectName subjectCode")
    .sort({ date: 1, periodNumber: 1 });
};

// Method để lấy periods theo class và date range
periodSchema.statics.getClassPeriods = function (classId, startDate, endDate) {
  return this.find({
    class: classId,
    date: { $gte: startDate, $lte: endDate },
  })
    .populate("subject", "subjectName subjectCode")
    .populate("teacher", "name email")
    .sort({ date: 1, periodNumber: 1 });
};

// Method để bulk create periods với improved error handling và periodId generation
periodSchema.statics.bulkCreatePeriods = async function (periodsData) {
  try {
    console.log(`🔄 Bulk creating ${periodsData.length} periods...`);

    // Validate và tạo periodId cho tất cả periods trước khi insert
    const validatedData = periodsData.map((period, index) => {
      // Tạo periodId nếu chưa có
      if (
        !period.periodId &&
        period.schedule &&
        period.weekNumber &&
        period.dayOfWeek &&
        period.periodNumber
      ) {
        const scheduleId = period.schedule.toString().slice(-6);
        const weekNum = String(period.weekNumber).padStart(2, "0");
        const dayNum = String(period.dayOfWeek);
        const periodNum = String(period.periodNumber).padStart(2, "0");
        period.periodId = `${scheduleId}_week${weekNum}_day${dayNum}_period${periodNum}`;
      }

      // Validate required fields
      if (!period.periodId) {
        throw new Error(
          `Period ${
            index + 1
          }: Cannot generate periodId - missing required fields`
        );
      }

      if (!period.class || !period.schedule || !period.createdBy) {
        throw new Error(
          `Period ${
            index + 1
          }: Missing required fields (class, schedule, or createdBy)`
        );
      }

      return period;
    });

    console.log(`✅ Generated periodIds for ${validatedData.length} periods`);

    const results = await this.insertMany(validatedData, { ordered: false });

    console.log(`✅ Successfully created ${results.length} periods`);

    return {
      success: true,
      created: results.length,
      periods: results,
    };
  } catch (error) {
    console.error("❌ Error in bulkCreatePeriods:", error.message);

    if (error.code === 11000) {
      // Duplicate key errors
      const successful = error.insertedDocs || [];
      console.log(
        `⚠️ Partial success: ${successful.length} periods created with some duplicates`
      );
      return {
        success: false,
        created: successful.length,
        periods: successful,
        errors: error.writeErrors || [],
        message: `Created ${successful.length} periods, some duplicates were skipped`,
      };
    }
    throw error;
  }
};

// Method để update period status
periodSchema.methods.updateStatus = function (status, options = {}) {
  this.status = status;

  if (status === "completed") {
    this.completedAt = new Date();
    this.actualDate = options.actualDate || new Date();
  }

  if (options.notes) {
    this.notes = options.notes;
  }

  if (options.updatedBy) {
    this.lastModifiedBy = options.updatedBy;
  }

  return this.save();
};

// Method để convert empty period to other types
periodSchema.methods.convertToMakeup = function (
  teacherId,
  subjectId,
  makeupInfo,
  updatedBy
) {
  if (this.periodType !== "empty") {
    throw new Error("Can only convert empty periods to makeup");
  }

  this.periodType = "makeup";
  this.subject = subjectId;
  this.teacher = teacherId;
  this.status = "not_started";
  this.makeupInfo = makeupInfo;
  this.lastModifiedBy = updatedBy;

  return this.save();
};

periodSchema.methods.convertToExtracurricular = function (
  teacherId,
  extracurricularInfo,
  updatedBy
) {
  if (this.periodType !== "empty") {
    throw new Error("Can only convert empty periods to extracurricular");
  }

  this.periodType = "extracurricular";
  this.subject = null;
  this.teacher = teacherId;
  this.status = "not_started";
  this.extracurricularInfo = extracurricularInfo;
  this.lastModifiedBy = updatedBy;

  return this.save();
};

// Method để revert to empty period
periodSchema.methods.revertToEmpty = function (updatedBy) {
  if (this.periodType === "regular" || this.periodType === "fixed") {
    throw new Error("Cannot revert regular or fixed periods to empty");
  }

  this.periodType = "empty";
  this.subject = null;
  this.teacher = null;
  this.status = "not_started";
  this.makeupInfo = undefined;
  this.extracurricularInfo = undefined;
  this.substituteInfo = undefined;
  this.lastModifiedBy = updatedBy;

  return this.save();
};

// Method để lấy thông tin vị trí period trong schedule
periodSchema.methods.getScheduleLocation = function () {
  return {
    scheduleId: this.schedule,
    classId: this.class,
    position: {
      week: this.weekNumber,
      day: this.dayOfWeek,
      period: this.periodNumber,
    },
    date: this.date,
    periodId: this.periodId,
    fullLocation: this.fullLocation,
  };
};

const Period = mongoose.model("Period", periodSchema);

module.exports = Period;
