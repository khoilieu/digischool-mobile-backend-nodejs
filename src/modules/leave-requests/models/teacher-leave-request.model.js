const mongoose = require("mongoose");

const teacherLeaveRequestSchema = new mongoose.Schema({
  // Thông tin giáo viên xin nghỉ
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    validate: {
      validator: async function (teacherId) {
        const User = mongoose.model("User");
        const teacher = await User.findById(teacherId);
        return teacher && teacher.role.includes("teacher");
      },
      message: "Teacher ID must reference a valid teacher user",
    },
  },

  // Thông tin tiết học cần xin nghỉ
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lesson",
    required: true,
  },

  // Thông tin lớp học
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: true,
  },

  // Thông tin môn học
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },

  // Thông tin thời gian
  date: {
    type: Date,
    required: true,
  },

  period: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },

  // Lý do xin nghỉ
  reason: {
    type: String,
    required: true,
    trim: true,
    minLength: 1,
    maxLength: 300,
  },

  // Trạng thái đơn
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "cancelled"],
    default: "pending",
  },

  // Thông tin duyệt (chỉ manager mới có quyền duyệt)
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    validate: {
      validator: async function (managerId) {
        if (!managerId) return true; // Optional field
        const User = mongoose.model("User");
        const manager = await User.findById(managerId);
        return (
          manager &&
          (manager.role.includes("manager") || manager.role.includes("admin"))
        );
      },
      message: "Manager ID must reference a valid manager or admin user",
    },
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
teacherLeaveRequestSchema.index({ teacherId: 1, date: 1 });
teacherLeaveRequestSchema.index({ managerId: 1, status: 1 });
teacherLeaveRequestSchema.index({ lessonId: 1 });
teacherLeaveRequestSchema.index({ status: 1, date: 1 });

// Pre-save middleware to update updatedAt
teacherLeaveRequestSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for formatted date
teacherLeaveRequestSchema.virtual("formattedDate").get(function () {
  return this.date.toLocaleDateString("vi-VN");
});

// Virtual for period display
teacherLeaveRequestSchema.virtual("periodDisplay").get(function () {
  return `Tiết ${this.period}`;
});

// Static methods
teacherLeaveRequestSchema.statics.findByTeacher = function (
  teacherId,
  options = {}
) {
  const query = { teacherId };
  if (options.status) query.status = options.status;
  if (options.startDate) query.date = { $gte: options.startDate };
  if (options.endDate) query.date = { ...query.date, $lte: options.endDate };

  return this.find(query)
    .populate("lessonId", "lessonId type topic scheduledDate")
    .populate("subjectId", "subjectName subjectCode")
    .populate("classId", "className")
    .sort({ createdAt: -1 });
};

teacherLeaveRequestSchema.statics.findPendingByManager = function (
  options = {}
) {
  const query = { status: "pending" };
  if (options.startDate) query.date = { $gte: options.startDate };
  if (options.endDate) query.date = { ...query.date, $lte: options.endDate };

  return this.find(query)
    .populate("teacherId", "name email fullName")
    .populate("lessonId", "lessonId type topic scheduledDate")
    .populate("subjectId", "subjectName subjectCode")
    .populate("classId", "className")
    .sort({ createdAt: 1 }); // Oldest first for processing
};

// Instance methods
teacherLeaveRequestSchema.methods.approve = function (managerId) {
  this.status = "approved";
  this.managerId = managerId;
  this.processedAt = new Date();

  return this.save();
};

teacherLeaveRequestSchema.methods.reject = function (managerId) {
  this.status = "rejected";
  this.managerId = managerId;
  this.processedAt = new Date();

  return this.save();
};

teacherLeaveRequestSchema.methods.cancel = function (teacherId) {
  if (this.teacherId.toString() !== teacherId.toString()) {
    throw new Error("Only the teacher can cancel this request");
  }

  if (this.status !== "pending") {
    throw new Error("Can only cancel pending requests");
  }

  this.status = "cancelled";
  this.processedAt = new Date();

  return this.save();
};

teacherLeaveRequestSchema.methods.canBeProcessedBy = function (managerId) {
  return this.status === "pending";
};

const TeacherLeaveRequest = mongoose.model(
  "TeacherLeaveRequest",
  teacherLeaveRequestSchema
);

module.exports = TeacherLeaveRequest;
