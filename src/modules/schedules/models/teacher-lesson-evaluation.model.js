const mongoose = require("mongoose");

const teacherLessonEvaluationSchema = new mongoose.Schema(
  {
    // Thông tin cơ bản
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      validate: {
        validator: async function (teacherId) {
          const User = mongoose.model("User");
          const teacher = await User.findById(teacherId);
          return (
            teacher &&
            (teacher.role.includes("teacher") ||
              teacher.role.includes("homeroom_teacher"))
          );
        },
        message: "Teacher ID must reference a valid teacher user",
      },
    },

    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    // Thông tin tiết học theo UI
    curriculumLesson: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    comments: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    rating: {
      type: String,
      required: true,
      enum: ["A+", "A", "B+", "B", "C"],
      validate: {
        validator: function (value) {
          return ["A+", "A", "B+", "B", "C"].includes(value);
        },
        message: "Rating must be one of: A+, A, B+, B, C",
      },
    },

    // Học sinh vắng
    absentStudents: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
          validate: {
            validator: async function (studentId) {
              const User = mongoose.model("User");
              const student = await User.findById(studentId);
              return student && student.role.includes("student");
            },
            message: "Student ID must reference a valid student user",
          },
        },
        isApprovedLeave: {
          type: Boolean,
          default: false,
        },
        reason: {
          type: String,
          trim: true,
          maxlength: 200,
        },
      },
    ],

    // Học sinh vi phạm
    violations: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
          validate: {
            validator: async function (studentId) {
              const User = mongoose.model("User");
              const student = await User.findById(studentId);
              return student && student.role.includes("student");
            },
            message: "Student ID must reference a valid student user",
          },
        },
        description: {
          type: String,
          required: true,
          trim: true,
          maxlength: 500,
        },
      },
    ],

    // Kiểm tra miệng
    oralTests: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
          validate: {
            validator: async function (studentId) {
              const User = mongoose.model("User");
              const student = await User.findById(studentId);
              return student && student.role.includes("student");
            },
            message: "Student ID must reference a valid student user",
          },
        },
        score: {
          type: Number,
          required: true,
          min: 0,
          max: 10,
          validate: {
            validator: function (value) {
              return Number.isFinite(value) && value >= 0 && value <= 10;
            },
            message: "Score must be a number between 0 and 10",
          },
        },
      },
    ],

    // Thống kê tổng quan
    summary: {
      totalAbsent: {
        type: Number,
        default: 0,
      },
      totalViolations: {
        type: Number,
        default: 0,
      },
      totalOralTests: {
        type: Number,
        default: 0,
      },
    },

    // Trạng thái đánh giá
    status: {
      type: String,
      enum: ["draft", "completed", "submitted"],
      default: "draft",
    },

    completedAt: {
      type: Date,
    },

    submittedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
teacherLessonEvaluationSchema.index(
  { lesson: 1, teacher: 1 },
  { unique: true }
);
teacherLessonEvaluationSchema.index({ teacher: 1, createdAt: -1 });
teacherLessonEvaluationSchema.index({ class: 1, createdAt: -1 });
teacherLessonEvaluationSchema.index({ subject: 1, createdAt: -1 });
teacherLessonEvaluationSchema.index({ status: 1 });
teacherLessonEvaluationSchema.index({ rating: 1 });

// Pre-save middleware để tính toán summary
teacherLessonEvaluationSchema.pre("save", function (next) {
  // Tính thống kê kiểm tra miệng
  this.summary.totalOralTests = this.oralTests.length;

  // Tính tổng số vi phạm
  this.summary.totalViolations = this.violations.length;

  // Tính số học sinh vắng
  this.summary.totalAbsent = this.absentStudents.length;

  next();
});

// Pre-save validation
teacherLessonEvaluationSchema.pre("save", async function (next) {
  try {
    const Lesson = mongoose.model("Lesson");
    const User = mongoose.model("User");

    // Kiểm tra lesson tồn tại
    const lesson = await Lesson.findById(this.lesson);
    if (!lesson) {
      throw new Error("Lesson not found");
    }

    // Kiểm tra giáo viên có quyền đánh giá
    if (lesson.teacher.toString() !== this.teacher.toString()) {
      throw new Error("Teacher can only evaluate their own lessons");
    }

    // Kiểm tra lesson có thể đánh giá không
    if (lesson.status !== "completed") {
      throw new Error("Can only evaluate completed lessons");
    }

    // Kiểm tra thông tin class và subject khớp với lesson
    if (lesson.class.toString() !== this.class.toString()) {
      throw new Error("Class mismatch with lesson");
    }

    if (lesson.subject.toString() !== this.subject.toString()) {
      throw new Error("Subject mismatch with lesson");
    }

    // Kiểm tra tất cả học sinh trong danh sách thuộc lớp này
    const allStudentIds = [
      ...this.oralTests.map((o) => o.student),
      ...this.violations.map((v) => v.student),
      ...this.absentStudents.map((a) => a.student),
    ];

    if (allStudentIds.length > 0) {
      const uniqueStudentIds = [
        ...new Set(allStudentIds.map((id) => id.toString())),
      ];

      const students = await User.find({
        _id: { $in: uniqueStudentIds },
        class_id: this.class,
        role: "student",
      });

      if (students.length !== uniqueStudentIds.length) {
        const foundIds = students.map((s) => s._id.toString());
        const missingIds = uniqueStudentIds.filter(
          (id) => !foundIds.includes(id)
        );
        throw new Error(
          `Some students do not belong to this class. Missing: ${missingIds.join(
            ", "
          )}`
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Static methods
teacherLessonEvaluationSchema.statics.getTeacherEvaluations = function (
  teacherId,
  options = {}
) {
  const query = { teacher: teacherId };

  if (options.classId) query.class = options.classId;
  if (options.subjectId) query.subject = options.subjectId;
  if (options.status) query.status = options.status;
  if (options.rating) query.rating = options.rating;
  if (options.startDate) query.createdAt = { $gte: options.startDate };
  if (options.endDate) {
    query.createdAt = { ...query.createdAt, $lte: options.endDate };
  }

  return this.find(query)
    .populate("lesson", "lessonId scheduledDate actualDate topic")
    .populate("class", "className")
    .populate("subject", "subjectName subjectCode")
    .populate("oralTests.student", "name studentId")
    .populate("violations.student", "name studentId")
    .populate("absentStudents.student", "name studentId")
    .sort({ createdAt: -1 });
};

// Static method để lấy thống kê đánh giá của giáo viên
teacherLessonEvaluationSchema.statics.getTeacherEvaluationStats =
  async function (teacherId, options = {}) {
    const matchQuery = { teacher: teacherId };

    if (options.startDate) matchQuery.createdAt = { $gte: options.startDate };
    if (options.endDate) {
      matchQuery.createdAt = { ...matchQuery.createdAt, $lte: options.endDate };
    }
    if (options.subjectId) matchQuery.subject = options.subjectId;
    if (options.classId) matchQuery.class = options.classId;

    const stats = await this.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalEvaluations: { $sum: 1 },
          totalAbsences: { $sum: "$summary.totalAbsent" },
          totalViolations: { $sum: "$summary.totalViolations" },
          ratingDistribution: {
            $push: "$rating",
          },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        totalEvaluations: 0,
        totalAbsences: 0,
        totalViolations: 0,
        ratingDistribution: {},
      };
    }

    const result = stats[0];

    // Tính phân bố rating
    const ratingCounts = result.ratingDistribution.reduce((acc, rating) => {
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {});

    return {
      totalEvaluations: result.totalEvaluations,
      totalAbsences: result.totalAbsences,
      totalViolations: result.totalViolations,
      ratingDistribution: ratingCounts,
    };
  };

// Instance methods
teacherLessonEvaluationSchema.methods.complete = function () {
  this.status = "completed";
  this.completedAt = new Date();
  return this.save();
};

teacherLessonEvaluationSchema.methods.submit = function () {
  this.status = "submitted";
  this.submittedAt = new Date();
  if (!this.completedAt) {
    this.completedAt = new Date();
  }
  return this.save();
};

const TeacherLessonEvaluation = mongoose.model(
  "TeacherLessonEvaluation",
  teacherLessonEvaluationSchema
);

module.exports = TeacherLessonEvaluation;
