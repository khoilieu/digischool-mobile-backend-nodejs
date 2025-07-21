const mongoose = require("mongoose");

const studentLessonEvaluationSchema = new mongoose.Schema(
  {
    // Thông tin học sinh
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

    // Thông tin tiết học
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },

    // Thông tin lớp (để validate học sinh thuộc lớp này)
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    // Thông tin môn học
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    // Thông tin giáo viên
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Đánh giá theo các tiêu chí
    evaluation: {
      // Câu hỏi 1: Cảm nhận về việc giải thích bài học của giáo viên (1-5 sao)
      teachingClarity: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: {
          validator: Number.isInteger,
          message: "Teaching clarity rating must be an integer between 1 and 5",
        },
      },

      // Câu hỏi 2: Cảm nhận về sự hướng dẫn trong bài học (1-5 sao)
      teachingSupport: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: {
          validator: Number.isInteger,
          message: "Teaching support rating must be an integer between 1 and 5",
        },
      },

      // Câu hỏi 3: Cảm nhận về việc tương tác với giáo viên trong tiết học (1-5 sao)
      teacherInteraction: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: {
          validator: Number.isInteger,
          message:
            "Teacher interaction rating must be an integer between 1 and 5",
        },
      },

      // Điểm tổng quan (tự động tính từ 3 tiêu chí trên)
      overallRating: {
        type: Number,
        min: 1,
        max: 5,
      },
    },

    // Đánh giá học sinh có hoàn thành tốt tiết học không
    studentSelfAssessment: {
      // Học sinh có hoàn thành tốt tiết học không
      completedWell: {
        type: Boolean,
        required: true,
      },

      // Lý do nếu không hoàn thành tốt (optional)
      reason: {
        type: String,
        maxlength: 200,
        trim: true,
      },
    },

    // Ghi chú thêm từ học sinh
    comments: {
      type: String,
      maxlength: 500,
      trim: true,
    },

    // Thông tin thời gian đánh giá
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },

    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes để tối ưu hóa query
studentLessonEvaluationSchema.index(
  { student: 1, lesson: 1 },
  { unique: true }
); // Mỗi học sinh chỉ đánh giá 1 lần cho 1 tiết
studentLessonEvaluationSchema.index({ lesson: 1 });
studentLessonEvaluationSchema.index({ class: 1 });
studentLessonEvaluationSchema.index({ student: 1, evaluatedAt: -1 });
studentLessonEvaluationSchema.index({ teacher: 1, evaluatedAt: -1 });

// Pre-save middleware để tính overall rating
studentLessonEvaluationSchema.pre("save", function (next) {
  // Tính điểm tổng quan từ 3 tiêu chí
  const { teachingClarity, teachingSupport, teacherInteraction } =
    this.evaluation;
  this.evaluation.overallRating =
    Math.round(
      ((teachingClarity + teachingSupport + teacherInteraction) / 3) * 10
    ) / 10;

  // Cập nhật updatedAt
  this.updatedAt = new Date();
  next();
});

// Pre-save validation để kiểm tra điều kiện
studentLessonEvaluationSchema.pre("save", async function (next) {
  try {
    const User = mongoose.model("User");
    const Lesson = mongoose.model("Lesson");

    // 1. Kiểm tra học sinh thuộc lớp của tiết học
    const student = await User.findById(this.student).populate("class_id");
    if (!student) {
      throw new Error("Student not found");
    }

    if (student.class_id._id.toString() !== this.class.toString()) {
      throw new Error("Student does not belong to this class");
    }

    // 2. Kiểm tra tiết học đã hoàn thành
    const lesson = await Lesson.findById(this.lesson);
    if (!lesson) {
      throw new Error("Lesson not found");
    }

    if (lesson.status !== "completed") {
      throw new Error("Cannot evaluate lesson that is not completed");
    }

    // 3. Kiểm tra thông tin lesson khớp với evaluation
    if (lesson.class.toString() !== this.class.toString()) {
      throw new Error("Lesson class does not match evaluation class");
    }

    if (lesson.subject.toString() !== this.subject.toString()) {
      throw new Error("Lesson subject does not match evaluation subject");
    }

    if (lesson.teacher.toString() !== this.teacher.toString()) {
      throw new Error("Lesson teacher does not match evaluation teacher");
    }

    // BỎ kiểm tra học sinh có trong danh sách điểm danh của tiết học (đã tham gia tiết học)

    next();
  } catch (error) {
    next(error);
  }
});

// Static method để lấy đánh giá của học sinh
studentLessonEvaluationSchema.statics.getStudentEvaluations = function (
  studentId,
  options = {}
) {
  const query = { student: studentId };

  if (options.classId) query.class = options.classId;
  if (options.subjectId) query.subject = options.subjectId;
  if (options.teacherId) query.teacher = options.teacherId;
  if (options.startDate) query.evaluatedAt = { $gte: options.startDate };
  if (options.endDate) {
    query.evaluatedAt = { ...query.evaluatedAt, $lte: options.endDate };
  }

  return this.find(query)
    .populate("lesson", "lessonId scheduledDate topic status")
    .populate("class", "className")
    .populate("subject", "subjectName subjectCode")
    .populate("teacher", "name email")
    .sort({ evaluatedAt: -1 });
};

// Static method để lấy đánh giá cho một tiết học
studentLessonEvaluationSchema.statics.getLessonEvaluations = function (
  lessonId
) {
  return this.find({ lesson: lessonId })
    .populate("student", "name studentId")
    .sort({ evaluatedAt: -1 });
};

// Static method để lấy thống kê đánh giá cho giáo viên
studentLessonEvaluationSchema.statics.getTeacherEvaluationStats =
  async function (teacherId, options = {}) {
    const matchQuery = { teacher: teacherId };

    if (options.startDate) matchQuery.evaluatedAt = { $gte: options.startDate };
    if (options.endDate) {
      matchQuery.evaluatedAt = {
        ...matchQuery.evaluatedAt,
        $lte: options.endDate,
      };
    }
    if (options.subjectId) matchQuery.subject = options.subjectId;
    if (options.classId) matchQuery.class = options.classId;

    const stats = await this.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalEvaluations: { $sum: 1 },
          avgTeachingClarity: { $avg: "$evaluation.teachingClarity" },
          avgTeachingSupport: { $avg: "$evaluation.teachingSupport" },
          avgTeacherInteraction: { $avg: "$evaluation.teacherInteraction" },
          avgOverallRating: { $avg: "$evaluation.overallRating" },
          completedWellCount: {
            $sum: { $cond: ["$studentSelfAssessment.completedWell", 1, 0] },
          },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        totalEvaluations: 0,
        avgTeachingClarity: 0,
        avgTeachingSupport: 0,
        avgTeacherInteraction: 0,
        avgOverallRating: 0,
        completedWellRate: 0,
      };
    }

    const result = stats[0];
    return {
      totalEvaluations: result.totalEvaluations,
      avgTeachingClarity: Math.round(result.avgTeachingClarity * 10) / 10,
      avgTeachingSupport: Math.round(result.avgTeachingSupport * 10) / 10,
      avgTeacherInteraction: Math.round(result.avgTeacherInteraction * 10) / 10,
      avgOverallRating: Math.round(result.avgOverallRating * 10) / 10,
      completedWellRate: Math.round(
        (result.completedWellCount / result.totalEvaluations) * 100
      ),
    };
  };

// Static method để kiểm tra học sinh có thể đánh giá tiết học không
studentLessonEvaluationSchema.statics.canStudentEvaluateLesson =
  async function (studentId, lessonId) {
    try {
      const User = mongoose.model("User");
      const Lesson = mongoose.model("Lesson");

      // Lấy thông tin học sinh và tiết học
      const [student, lesson] = await Promise.all([
        User.findById(studentId).populate("class_id"),
        Lesson.findById(lessonId),
      ]);

      if (!student || !lesson) {
        return { canEvaluate: false, reason: "Student or lesson not found" };
      }

      // Kiểm tra học sinh có role student
      if (!student.role.includes("student")) {
        return { canEvaluate: false, reason: "User is not a student" };
      }

      // Kiểm tra tiết học đã hoàn thành
      if (lesson.status !== "completed") {
        return { canEvaluate: false, reason: "Lesson is not completed yet" };
      }

      // Kiểm tra học sinh thuộc lớp của tiết học
      if (student.class_id._id.toString() !== lesson.class.toString()) {
        return {
          canEvaluate: false,
          reason: "Student does not belong to this class",
        };
      }

      // BỎ kiểm tra học sinh có tham gia tiết học (không vắng mặt)

      // Kiểm tra đã đánh giá chưa
      const existingEvaluation = await this.findOne({
        student: studentId,
        lesson: lessonId,
      });

      if (existingEvaluation) {
        return {
          canEvaluate: false,
          reason: "Student has already evaluated this lesson",
        };
      }

      return { canEvaluate: true, reason: "Student can evaluate this lesson" };
    } catch (error) {
      return { canEvaluate: false, reason: error.message };
    }
  };

// Instance method để cập nhật đánh giá
studentLessonEvaluationSchema.methods.updateEvaluation = function (
  newEvaluation,
  newComments,
  newSelfAssessment
) {
  if (newEvaluation) {
    this.evaluation = { ...this.evaluation, ...newEvaluation };
  }

  if (newComments !== undefined) {
    this.comments = newComments;
  }

  if (newSelfAssessment) {
    this.studentSelfAssessment = {
      ...this.studentSelfAssessment,
      ...newSelfAssessment,
    };
  }

  this.updatedAt = new Date();
  return this.save();
};

const StudentLessonEvaluation = mongoose.model(
  "StudentLessonEvaluation",
  studentLessonEvaluationSchema
);

module.exports = StudentLessonEvaluation;
