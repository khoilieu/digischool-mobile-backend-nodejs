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

  // Tiêu đề
  title: {
    type: String,
    trim: true,
    maxlength: 200,
  },

  // Nội dung chi tiết
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },

  // Chương/bài cần ôn tập
  chapters: [
    {
      chapterName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },
      topics: [
        {
          type: String,
          trim: true,
          maxlength: 150,
        },
      ],
    },
  ],

  // Tài liệu tham khảo
  references: [
    {
      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },
      description: {
        type: String,
        trim: true,
        maxlength: 300,
      },
      url: {
        type: String,
        trim: true,
        validate: {
          validator: function (v) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: "URL must start with http:// or https://",
        },
      },
    },
  ],

  // Thời gian kiểm tra dự kiến
  expectedTestDate: {
    type: Date,
  },

  // Thời gian tạo thông tin kiểm tra
  testInfoDate: {
    type: Date,
    default: Date.now,
  },

  // Độ ưu tiên
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium",
  },

  // Trạng thái
  status: {
    type: String,
    enum: ["active", "completed", "cancelled"],
    default: "active",
  },

  // Ghi chú thêm
  reminder: {
    type: String,
    trim: true,
    maxlength: 500,
  },

  // Metadata
  isVisible: {
    type: Boolean,
    default: true,
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
testInfoSchema.index({ teacher: 1, status: 1 });
testInfoSchema.index({ expectedTestDate: 1, status: 1 });
testInfoSchema.index({ testInfoDate: 1, status: 1 });

// Unique constraint: Một lesson chỉ có một test info
// (nếu muốn cho phép nhiều test info/lesson thì bỏ dòng này)
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
// options: {status, priority, testType, startDate, endDate, isVisible}
testInfoSchema.statics.getTeacherTestInfos = function (
  teacherId,
  options = {}
) {
  const query = { teacher: teacherId };

  if (options.status) query.status = options.status;
  if (options.priority) query.priority = options.priority;
  if (options.testType) query.testType = options.testType;
  if (options.startDate) query.expectedTestDate = { $gte: options.startDate };
  if (options.endDate) {
    query.expectedTestDate = {
      ...query.expectedTestDate,
      $lte: options.endDate,
    };
  }
  if (options.isVisible !== undefined) query.isVisible = options.isVisible;

  return this.find(query)
    .populate("lesson", "lessonId scheduledDate topic")
    .populate("class", "className")
    .populate("subject", "subjectName subjectCode")
    .populate("teacher", "name")
    .sort({ expectedTestDate: 1, priority: -1 });
};

// Lấy test info sắp đến hạn
// days: số ngày tới
// Trả về các test info active, isVisible, expectedTestDate trong khoảng
// (dùng cho dashboard giáo viên)
testInfoSchema.statics.getUpcomingTestInfos = function (teacherId, days = 7) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  return this.find({
    teacher: teacherId,
    status: "active",
    isVisible: true,
    expectedTestDate: {
      $gte: today,
      $lte: futureDate,
    },
  })
    .populate("lesson", "lessonId scheduledDate topic")
    .populate("class", "className")
    .populate("subject", "subjectName subjectCode")
    .sort({ expectedTestDate: 1, priority: -1 });
};

// Lấy thống kê test info
// options: {startDate, endDate}
testInfoSchema.statics.getTestInfoStats = async function (
  teacherId,
  options = {}
) {
  const matchQuery = { teacher: teacherId };

  if (options.startDate) matchQuery.createdAt = { $gte: options.startDate };
  if (options.endDate) {
    matchQuery.createdAt = { ...matchQuery.createdAt, $lte: options.endDate };
  }

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalTestInfos: { $sum: 1 },
        activeTestInfos: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
        completedTestInfos: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        highPriorityTestInfos: {
          $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] },
        },
        urgentTestInfos: {
          $sum: { $cond: [{ $eq: ["$priority", "urgent"] }, 1, 0] },
        },
        testTypeDistribution: {
          $push: "$testType",
        },
      },
    },
  ]);

  if (stats.length === 0) {
    return {
      totalTestInfos: 0,
      activeTestInfos: 0,
      completedTestInfos: 0,
      highPriorityTestInfos: 0,
      urgentTestInfos: 0,
      testTypeDistribution: {},
    };
  }

  const result = stats[0];

  // Tính phân bố test type
  const testTypeCounts = result.testTypeDistribution.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return {
    totalTestInfos: result.totalTestInfos,
    activeTestInfos: result.activeTestInfos,
    completedTestInfos: result.completedTestInfos,
    highPriorityTestInfos: result.highPriorityTestInfos,
    urgentTestInfos: result.urgentTestInfos,
    testTypeDistribution: testTypeCounts,
  };
};

// Instance methods
// Đánh dấu hoàn thành
testInfoSchema.methods.markCompleted = function () {
  this.status = "completed";
  return this.save();
};

// Đánh dấu hủy
testInfoSchema.methods.markCancelled = function () {
  this.status = "cancelled";
  return this.save();
};

// Ẩn/hiện test info
testInfoSchema.methods.hide = function () {
  this.isVisible = false;
  return this.save();
};

testInfoSchema.methods.show = function () {
  this.isVisible = true;
  return this.save();
};

const TestInfo = mongoose.model("TestInfo", testInfoSchema);

module.exports = TestInfo;
