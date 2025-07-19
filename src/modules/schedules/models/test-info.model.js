const mongoose = require("mongoose");

// Schema cho thông tin kiểm tra tiết học
const testInfoSchema = new mongoose.Schema({
  // Liên kết với tiết học
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lesson",
    index: true,
  },

  // Giáo viên tạo thông tin kiểm tra
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },

  // Lớp học
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
  },

  // Môn học
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
  },

  // Loại kiểm tra
  testType: {
    type: String,
    enum: [
      "kiemtra15",
      "kiemtra1tiet",
      "kiemtrathuchanh",
      "kiemtramieng",
      "baitap",
      "other",
    ],
    required: true,
    default: "kiemtra15",
  },

  // Nội dung chi tiết
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },

  // Ghi chú thêm
  reminder: {
    type: String,
    trim: true,
    maxlength: 500,
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

// Indexes
testInfoSchema.index({ lesson: 1, teacher: 1 });
testInfoSchema.index({ teacher: 1 });

// Unique constraint: Một lesson chỉ có một test info
testInfoSchema.index({ lesson: 1 }, { unique: true });

// Middleware để update updatedAt
testInfoSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save validation
testInfoSchema.pre("save", async function (next) {
  try {
    const Lesson = mongoose.model("Lesson");
    const User = mongoose.model("User");

    // Kiểm tra lesson tồn tại
    const lesson = await Lesson.findById(this.lesson);
    if (!lesson) {
      throw new Error("Lesson not found");
    }

    // Kiểm tra lesson có status 'scheduled'
    if (lesson.status !== "scheduled") {
      throw new Error("Can only create test info for scheduled lessons");
    }

    // Kiểm tra giáo viên có quyền tạo test info cho lesson này
    if (lesson.teacher.toString() !== this.teacher.toString()) {
      throw new Error(
        "Teacher can only create test info for their own lessons"
      );
    }

    // Kiểm tra thông tin class và subject khớp với lesson
    if (lesson.class.toString() !== this.class.toString()) {
      throw new Error("Class mismatch with lesson");
    }

    if (lesson.subject.toString() !== this.subject.toString()) {
      throw new Error("Subject mismatch with lesson");
    }

    // Kiểm tra teacher có role 'teacher'
    const teacher = await User.findById(this.teacher);
    if (!teacher || !teacher.role.includes("teacher")) {
      throw new Error("Only teachers can create test info");
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Static methods
// Lấy danh sách test info của giáo viên
testInfoSchema.statics.getTeacherTestInfos = function (teacherId) {
  return this.find({ teacher: teacherId })
    .populate("lesson", "lessonId scheduledDate topic")
    .populate("class", "className")
    .populate("subject", "subjectName subjectCode")
    .populate("teacher", "name")
    .sort({ createdAt: -1 });
};

const TestInfo = mongoose.model("TestInfo", testInfoSchema);

module.exports = TestInfo;
