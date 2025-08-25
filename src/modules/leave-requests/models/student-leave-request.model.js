const mongoose = require("mongoose");

const studentLeaveRequestSchema = new mongoose.Schema({
  // Thông tin học sinh
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Loại yêu cầu: lesson (nghỉ từng tiết) hoặc day (nghỉ cả ngày)
  requestType: {
    type: String,
    enum: ["lesson", "day"],
    required: true,
  },

  // Thông tin tiết học cụ thể (chỉ dùng khi requestType = "lesson")
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lesson",
    required: function() { return this.requestType === "lesson"; }
  },

  // Thông tin lớp học
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: true,
  },

  // Thông tin môn học (chỉ dùng khi requestType = "lesson")
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: function() { return this.requestType === "lesson"; }
  },

  // Thông tin giáo viên dạy tiết đó (chỉ dùng khi requestType = "lesson")
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: function() { return this.requestType === "lesson"; }
  },

  // Thông tin thời gian
  date: {
    type: Date,
    required: true,
  },

  // Tiết học (chỉ dùng khi requestType = "lesson")
  period: {
    type: Number,
    min: 1,
    max: 10,
    required: function() { return this.requestType === "lesson"; }
  },

  // Thông tin liên lạc
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },

  // Lý do xin vắng
  reason: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500,
  },

  // Trạng thái đơn
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "cancelled"],
    default: "pending",
  },

  // Người phê duyệt
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  // Thời gian xử lý
  processedAt: {
    type: Date,
  },

  // Thời gian tạo và cập nhật
  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for better performance
studentLeaveRequestSchema.index({ studentId: 1, date: 1 });
studentLeaveRequestSchema.index({ teacherId: 1, status: 1 });
studentLeaveRequestSchema.index({ lessonId: 1 });
studentLeaveRequestSchema.index({ status: 1, createdAt: -1 });
studentLeaveRequestSchema.index({ requestType: 1, status: 1 });

// Pre-save middleware to update updatedAt
studentLeaveRequestSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for formatted date
studentLeaveRequestSchema.virtual("formattedDate").get(function () {
  return this.date.toLocaleDateString("vi-VN");
});

// Virtual for period display
studentLeaveRequestSchema.virtual("periodDisplay").get(function () {
  return `Tiết ${this.period}`;
});

// Static methods
studentLeaveRequestSchema.statics.findByStudent = function (
  studentId,
  options = {}
) {
  const query = { studentId };
  if (options.status) query.status = options.status;
  if (options.requestType) query.requestType = options.requestType;
  if (options.startDate) query.date = { $gte: options.startDate };
  if (options.endDate) query.date = { ...query.date, $lte: options.endDate };

  return this.find(query)
    .populate("lessonId", "lessonId type topic")
    .populate("subjectId", "subjectName subjectCode")
    .populate("teacherId", "name email")
    .populate("classId", "className")
    .sort({ createdAt: -1 });
};

studentLeaveRequestSchema.statics.findByTeacher = function (
  teacherId,
  options = {}
) {
  const query = { teacherId };
  if (options.status) query.status = options.status;
  if (options.requestType) query.requestType = options.requestType;
  if (options.startDate) query.date = { $gte: options.startDate };
  if (options.endDate) query.date = { ...query.date, $lte: options.endDate };

  return this.find(query)
    .populate("studentId", "name email")
    .populate("lessonId", "lessonId type topic")
    .populate("subjectId", "subjectName subjectCode")
    .populate("classId", "className")
    .sort({ createdAt: -1 });
};

studentLeaveRequestSchema.statics.findPendingByTeacher = function (teacherId) {
  return this.find({ teacherId, status: "pending", requestType: "lesson" })
    .populate("studentId", "name email")
    .populate("lessonId", "lessonId type topic scheduledDate")
    .populate("subjectId", "subjectName subjectCode")
    .populate("classId", "className")
    .sort({ createdAt: 1 }); // Oldest first for processing
};

// Tìm đơn xin nghỉ cả ngày cần duyệt bởi giáo viên chủ nhiệm
studentLeaveRequestSchema.statics.findPendingDayRequestsByHomeroomTeacher = function (classId) {
  return this.find({ 
    classId, 
    status: "pending", 
    requestType: "day" 
  })
    .populate("studentId", "name email")
    .populate("classId", "className")
    .sort({ createdAt: 1 });
};

// Instance methods
studentLeaveRequestSchema.methods.approve = function (teacherId) {
  if (this.requestType === "lesson") {
    // Nghỉ từng tiết: chỉ giáo viên bộ môn mới được duyệt
    if (this.teacherId.toString() !== teacherId.toString()) {
      throw new Error("Only the lesson teacher can approve this request");
    }
  } else if (this.requestType === "day") {
    // Nghỉ cả ngày: chỉ giáo viên chủ nhiệm mới được duyệt
    // Logic này sẽ được kiểm tra ở service level
  }

  this.status = "approved";
  this.processedAt = new Date();
  this.approvedBy = teacherId;

  return this.save();
};

studentLeaveRequestSchema.methods.reject = function (teacherId) {
  if (this.requestType === "lesson") {
    // Nghỉ từng tiết: chỉ giáo viên bộ môn mới được từ chối
    if (this.teacherId.toString() !== teacherId.toString()) {
      throw new Error("Only the lesson teacher can reject this request");
    }
  } else if (this.requestType === "day") {
    // Nghỉ cả ngày: chỉ giáo viên chủ nhiệm mới được từ chối
    // Logic này sẽ được kiểm tra ở service level
  }

  this.status = "rejected";
  this.processedAt = new Date();
  this.approvedBy = teacherId;

  return this.save();
};

studentLeaveRequestSchema.methods.cancel = function (studentId) {
  if (this.studentId.toString() !== studentId.toString()) {
    throw new Error("Only the student can cancel this request");
  }

  if (this.status !== "pending") {
    throw new Error("Can only cancel pending requests");
  }

  this.status = "cancelled";
  this.processedAt = new Date();

  return this.save();
};

studentLeaveRequestSchema.methods.canBeProcessedBy = function (teacherId) {
  if (this.requestType === "lesson") {
    // Nghỉ từng tiết: chỉ giáo viên bộ môn mới được xử lý
    return (
      this.teacherId.toString() === teacherId.toString() &&
      this.status === "pending"
    );
  } else if (this.requestType === "day") {
    // Nghỉ cả ngày: chỉ giáo viên chủ nhiệm mới được xử lý
    // Logic này sẽ được kiểm tra ở service level
    return this.status === "pending";
  }
  return false;
};

const StudentLeaveRequest = mongoose.model(
  "StudentLeaveRequest",
  studentLeaveRequestSchema
);

module.exports = StudentLeaveRequest;
