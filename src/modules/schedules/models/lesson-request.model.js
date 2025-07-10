const mongoose = require("mongoose");

const lessonRequestSchema = new mongoose.Schema(
  {
    // Unique identifier cho lesson request
    requestId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },

    // Loại yêu cầu
    requestType: {
      type: String,
      enum: ["swap", "makeup", "substitute"],
      required: true,
    },

    // Thông tin giáo viên yêu cầu
    requestingTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ================================ FIELDS CHO SWAP & MAKEUP ================================

    // Thông tin tiết học gốc (tiết cần đổi hoặc tiết absent cần dạy bù)
    originalLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: function () {
        return this.requestType === "swap" || this.requestType === "makeup";
      },
    },

    // Thông tin tiết học thay thế
    // - Với swap: tiết có giáo viên dạy sẽ được đổi
    // - Với makeup: tiết trống sẽ được tạo thành tiết makeup
    replacementLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: function () {
        return this.requestType === "swap" || this.requestType === "makeup";
      },
    },

    // ================================ FIELDS CHO SUBSTITUTE ================================

    // Thông tin tiết học cần dạy thay
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: function () {
        return this.requestType === "substitute";
      },
    },

    // Danh sách giáo viên được đề xuất dạy thay
    candidateTeachers: [
      {
        teacher: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: function () {
            return this.requestType === "substitute";
          },
        },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        responseDate: {
          type: Date,
        },
      },
    ],

    // Giáo viên được chấp nhận dạy thay
    approvedTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ================================ COMMON FIELDS ================================

    // Lý do yêu cầu
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },

    // Trạng thái yêu cầu
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },

    // Thông tin manager xử lý (chỉ cho swap & makeup)
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Thời gian xử lý
    processedAt: {
      type: Date,
    },

    // Thông tin bổ sung (chỉ cho swap & makeup)
    additionalInfo: {
      // Thông tin lớp học
      classInfo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
      },

      // Thông tin môn học
      subjectInfo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },

      // Thông tin năm học
      academicYear: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademicYear",
      },

      // Tuần học
      weekInfo: {
        startOfWeek: Date,
        endOfWeek: Date,
      },
    },

    // Thông tin đặc biệt cho makeup
    makeupInfo: {
      // Ngày gốc của tiết absent
      originalDate: Date,
      // Tiết makeup đã được tạo (sau khi approve)
      createdMakeupLesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
      },
    },

    // Thông tin đặc biệt cho swap
    swapInfo: {
      // Giáo viên của tiết replacement (để tracking)
      replacementTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      // Trạng thái phản hồi của giáo viên replacement
      replacementTeacherResponse: {
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
        },
        responseDate: Date,
      },
      // Thông tin về conflict check
      hasConflict: {
        type: Boolean,
      },
      conflictDetails: {
        type: String,
        maxlength: 500,
      },
    },

    // Lịch sử email đã gửi
    emailsSent: [
      {
        type: {
          type: String,
          enum: ["request", "approval", "rejection", "notification"],
        },
        recipients: [String],
        sentAt: {
          type: Date,
          default: Date.now,
        },
        subject: String,
      },
    ],

    // Ghi chú
    notes: {
      type: String,
      maxlength: 500,
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

// Indexes
lessonRequestSchema.index({ requestId: 1 }, { unique: true });
lessonRequestSchema.index({ requestingTeacher: 1, status: 1 });
lessonRequestSchema.index({ originalLesson: 1 });
lessonRequestSchema.index({ replacementLesson: 1 });
lessonRequestSchema.index({ status: 1, createdAt: -1 });
lessonRequestSchema.index({ requestType: 1, status: 1 });
lessonRequestSchema.index({ "additionalInfo.classInfo": 1 });
lessonRequestSchema.index({ "additionalInfo.academicYear": 1 });

// Indexes cho substitute
lessonRequestSchema.index({ lesson: 1 });
lessonRequestSchema.index({ "candidateTeachers.teacher": 1 });

// Virtual để lấy thông tin chi tiết
lessonRequestSchema.virtual("originalLessonDetails", {
  ref: "Lesson",
  localField: "originalLesson",
  foreignField: "_id",
  justOne: true,
});

lessonRequestSchema.virtual("replacementLessonDetails", {
  ref: "Lesson",
  localField: "replacementLesson",
  foreignField: "_id",
  justOne: true,
});

lessonRequestSchema.virtual("lessonDetails", {
  ref: "Lesson",
  localField: "lesson",
  foreignField: "_id",
  justOne: true,
});

// Pre-save hook cho requestId
lessonRequestSchema.pre("save", function (next) {
  if (!this.requestId) {
    if (this.requestType === "substitute") {
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const random = Math.random().toString(36).substr(2, 6).toUpperCase();
      this.requestId = `SUB_${date}_${random}`;
    } else {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 5);
      const prefix = this.requestType === "swap" ? "SWAP" : "MAKEUP";
      this.requestId = `${prefix}_${timestamp}_${random}`.toUpperCase();
    }
  }
  next();
});

// ================================ STATIC METHODS CHO SWAP & MAKEUP ================================

// Static method để tìm requests theo teacher (swap & makeup)
lessonRequestSchema.statics.findByTeacher = function (teacherId, options = {}) {
  const query = {
    requestingTeacher: teacherId,
    requestType: { $in: ["swap", "makeup"] },
  };

  if (options.status) query.status = options.status;
  if (options.requestType) query.requestType = options.requestType;
  if (options.startDate) query.createdAt = { $gte: options.startDate };
  if (options.endDate) {
    query.createdAt = { ...query.createdAt, $lte: options.endDate };
  }

  return this.find(query)
    .populate({
      path: "originalLesson",
      select: "lessonId scheduledDate timeSlot topic status type",
      populate: {
        path: "timeSlot",
        select: "period name startTime endTime",
      },
    })
    .populate({
      path: "replacementLesson",
      select: "lessonId scheduledDate timeSlot topic status type",
      populate: {
        path: "timeSlot",
        select: "period name startTime endTime",
      },
    })
    .populate("requestingTeacher", "name email fullName")
    .populate("processedBy", "name email fullName")
    .populate("additionalInfo.classInfo", "className gradeLevel")
    .populate("additionalInfo.subjectInfo", "subjectName subjectCode")
    .populate("additionalInfo.academicYear", "name startDate endDate")
    .populate(
      "makeupInfo.createdMakeupLesson",
      "lessonId scheduledDate timeSlot status"
    )
    .sort({ createdAt: -1 });
};

// Static method để tìm pending requests (swap & makeup)
lessonRequestSchema.statics.findPendingRequests = function (options = {}) {
  const query = {
    status: "pending",
    requestType: { $in: ["swap", "makeup"] },
  };

  if (options.requestType) query.requestType = options.requestType;
  if (options.academicYear)
    query["additionalInfo.academicYear"] = options.academicYear;
  if (options.classId) query["additionalInfo.classInfo"] = options.classId;

  return this.find(query)
    .populate({
      path: "originalLesson",
      select: "lessonId scheduledDate timeSlot topic status type",
      populate: {
        path: "timeSlot",
        select: "period name startTime endTime",
      },
    })
    .populate({
      path: "replacementLesson",
      select: "lessonId scheduledDate timeSlot topic status type",
      populate: {
        path: "timeSlot",
        select: "period name startTime endTime",
      },
    })
    .populate("requestingTeacher", "name email fullName")
    .populate("additionalInfo.classInfo", "className gradeLevel")
    .populate("additionalInfo.subjectInfo", "subjectName subjectCode")
    .populate("additionalInfo.academicYear", "name startDate endDate")
    .populate(
      "makeupInfo.createdMakeupLesson",
      "lessonId scheduledDate timeSlot status"
    )
    .sort({ createdAt: -1 });
};

// ================================ STATIC METHODS CHO SUBSTITUTE ================================

// Static: findAvailableTeachers (chỉ dùng cho substitute)
lessonRequestSchema.statics.findAvailableTeachers = async function (lessonId) {
  const Lesson = mongoose.model("Lesson");
  const User = mongoose.model("User");

  // Lấy thông tin tiết học
  const lesson = await Lesson.findById(lessonId)
    .populate("subject", "subjectName")
    .populate("timeSlot", "period startTime endTime");
  if (!lesson) throw new Error("Lesson not found");

  // Lấy danh sách giáo viên có thể dạy môn học này
  const availableTeachers = await User.find({
    role: { $in: ["teacher"] },
    $or: [{ subject: lesson.subject._id }, { subjects: lesson.subject._id }],
    _id: { $ne: lesson.teacher },
  }).select("name email subject subjects");

  const teachersWithConflictInfo = [];

  for (const teacher of availableTeachers) {
    // Kiểm tra xung đột thời gian
    const conflictLesson = await Lesson.findOne({
      teacher: teacher._id,
      scheduledDate: lesson.scheduledDate,
      timeSlot: lesson.timeSlot._id,
      status: { $nin: ["cancelled", "absent"] },
    })
      .populate("class", "className")
      .populate("subject", "subjectName");

    // Kiểm tra pending substitute requests của giáo viên này
    const pendingRequests = await this.find({
      requestType: "substitute",
      status: "pending",
      "candidateTeachers.teacher": teacher._id,
      "candidateTeachers.status": "pending",
    });

    teachersWithConflictInfo.push({
      ...teacher.toObject(),
      hasConflict: !!conflictLesson,
      hasPendingRequests: pendingRequests.length > 0,
      conflictLesson: conflictLesson
        ? {
            className: conflictLesson.class.className,
            subjectName: conflictLesson.subject.subjectName,
            lessonId: conflictLesson.lessonId,
          }
        : null,
      pendingRequestsCount: pendingRequests.length,
    });
  }

  // Lọc ra những giáo viên không có xung đột (có thể có pending requests)
  const filteredTeachers = teachersWithConflictInfo.filter(
    (teacher) => !teacher.hasConflict
  );

  return filteredTeachers;
};

// Static: getTeacherRequests (chỉ dùng cho substitute)
lessonRequestSchema.statics.getTeacherRequests = function (
  teacherId,
  status = null
) {
  const query = {
    requestType: "substitute",
    $or: [
      { requestingTeacher: teacherId },
      { "candidateTeachers.teacher": teacherId },
    ],
  };
  if (status) query.status = status;
  return this.find(query)
    .populate("lesson", "lessonId scheduledDate topic status")
    .populate("lesson.class", "className")
    .populate("lesson.subject", "subjectName")
    .populate("lesson.timeSlot", "period startTime endTime")
    .populate("requestingTeacher", "name email")
    .populate("candidateTeachers.teacher", "name email")
    .populate("approvedTeacher", "name email")
    .sort({ createdAt: -1 });
};

// ================================ INSTANCE METHODS CHO SUBSTITUTE ================================

// Method: approveByTeacher (chỉ dùng cho substitute)
lessonRequestSchema.methods.approveByTeacher = async function (teacherId) {
  if (this.requestType !== "substitute")
    throw new Error("Not a substitute request");
  const candidate = this.candidateTeachers.find((c) => {
    const candidateId = c.teacher._id
      ? c.teacher._id.toString()
      : c.teacher.toString();
    const teacherIdStr = teacherId._id
      ? teacherId._id.toString()
      : teacherId.toString();
    return candidateId === teacherIdStr;
  });
  if (!candidate) throw new Error("Teacher not found in candidate list");
  if (candidate.status !== "pending")
    throw new Error("Request already responded to by this teacher");
  if (this.status !== "pending")
    throw new Error("Request is no longer pending");
  candidate.status = "approved";
  candidate.responseDate = new Date();
  this.status = "approved";
  this.approvedTeacher = teacherId;
  this.approvalDate = new Date();
  this.candidateTeachers.forEach((c) => {
    const candidateId = c.teacher._id
      ? c.teacher._id.toString()
      : c.teacher.toString();
    const teacherIdStr = teacherId._id
      ? teacherId._id.toString()
      : teacherId.toString();
    if (candidateId !== teacherIdStr && c.status === "pending") {
      c.status = "rejected";
      c.responseDate = new Date();
    }
  });
  await this.save();
  return this;
};

// Method: rejectByTeacher (chỉ dùng cho substitute)
lessonRequestSchema.methods.rejectByTeacher = async function (teacherId) {
  if (this.requestType !== "substitute")
    throw new Error("Not a substitute request");
  const candidate = this.candidateTeachers.find((c) => {
    const candidateId = c.teacher._id
      ? c.teacher._id.toString()
      : c.teacher.toString();
    const teacherIdStr = teacherId._id
      ? teacherId._id.toString()
      : teacherId.toString();
    return candidateId === teacherIdStr;
  });
  if (!candidate) throw new Error("Teacher not found in candidate list");
  if (candidate.status !== "pending")
    throw new Error("Request already responded to by this teacher");
  candidate.status = "rejected";
  candidate.responseDate = new Date();
  const allRejected = this.candidateTeachers.every(
    (c) => c.status === "rejected"
  );
  if (allRejected) this.status = "rejected";
  await this.save();
  return this;
};

// Method: cancel (chỉ dùng cho substitute)
lessonRequestSchema.methods.cancel = async function () {
  if (this.requestType !== "substitute")
    throw new Error("Not a substitute request");
  if (this.status !== "pending")
    throw new Error("Can only cancel pending requests");
  this.status = "cancelled";
  await this.save();
  return this;
};

const LessonRequest = mongoose.model("LessonRequest", lessonRequestSchema);

module.exports = LessonRequest;
