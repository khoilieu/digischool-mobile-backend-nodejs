const StudentLessonEvaluation = require("../models/student-lesson-evaluation.model");
const Lesson = require("../models/lesson.model");
const User = require("../../auth/models/user.model");

class StudentEvaluationService {
  async createEvaluation({ user, params, body }) {
    const { lessonId } = params;
    const {
      teachingClarity,
      teachingSupport,
      teacherInteraction,
      completedWell,
      reason,
      comments,
    } = body;
    const studentId = user._id;

    // Validate required fields
    if (
      !teachingClarity ||
      !teachingSupport ||
      !teacherInteraction ||
      completedWell === undefined
    ) {
      return {
        status: 400,
        body: {
          success: false,
          message:
            "Missing required evaluation fields: teachingClarity, teachingSupport, teacherInteraction, completedWell",
        },
      };
    }
    // Validate rating values
    const ratings = [teachingClarity, teachingSupport, teacherInteraction];
    if (
      ratings.some(
        (rating) => !Number.isInteger(rating) || rating < 1 || rating > 5
      )
    ) {
      return {
        status: 400,
        body: {
          success: false,
          message: "All ratings must be integers between 1 and 5",
        },
      };
    }
    // Kiểm tra học sinh có thể đánh giá tiết học này không
    const canEvaluate = await StudentLessonEvaluation.canStudentEvaluateLesson(
      studentId,
      lessonId
    );
    if (!canEvaluate.canEvaluate) {
      return {
        status: 403,
        body: {
          success: false,
          message: canEvaluate.reason,
        },
      };
    }
    // Lấy thông tin tiết học để có class, subject, teacher
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return {
        status: 404,
        body: {
          success: false,
          message: "Lesson not found",
        },
      };
    }
    // Tạo đánh giá mới
    const evaluation = new StudentLessonEvaluation({
      student: studentId,
      lesson: lessonId,
      class: lesson.class,
      subject: lesson.subject,
      teacher: lesson.teacher,
      evaluation: {
        teachingClarity,
        teachingSupport,
        teacherInteraction,
      },
      studentSelfAssessment: {
        completedWell,
        reason: completedWell ? null : reason,
      },
      comments: comments || "",
    });
    await evaluation.save();
    await evaluation.populate([
      { path: "lesson", select: "lessonId scheduledDate topic" },
      { path: "class", select: "className" },
      { path: "subject", select: "subjectName subjectCode" },
      { path: "teacher", select: "name email" },
    ]);
    return {
      status: 201,
      body: {
        success: true,
        message: "Đánh giá tiết học thành công",
        data: {
          evaluationId: evaluation._id,
          lesson: {
            lessonId: evaluation.lesson.lessonId,
            scheduledDate: evaluation.lesson.scheduledDate,
            topic: evaluation.lesson.topic,
          },
          class: evaluation.class.className,
          subject: {
            name: evaluation.subject.subjectName,
            code: evaluation.subject.subjectCode,
          },
          teacher: {
            name: evaluation.teacher.name,
            email: evaluation.teacher.email,
          },
          evaluation: evaluation.evaluation,
          studentSelfAssessment: evaluation.studentSelfAssessment,
          comments: evaluation.comments,
          evaluatedAt: evaluation.evaluatedAt,
        },
      },
    };
  }

  async updateEvaluation({ user, params, body }) {
    const { evaluationId } = params;
    const {
      teachingClarity,
      teachingSupport,
      teacherInteraction,
      completedWell,
      reason,
      comments,
    } = body;
    const studentId = user._id;
    // Tìm đánh giá
    const evaluation = await StudentLessonEvaluation.findById(evaluationId);
    if (!evaluation) {
      return {
        status: 404,
        body: {
          success: false,
          message: "Evaluation not found",
        },
      };
    }
    // Kiểm tra quyền sở hữu
    if (evaluation.student.toString() !== studentId.toString()) {
      return {
        status: 403,
        body: {
          success: false,
          message: "You can only update your own evaluations",
        },
      };
    }
    // Validate rating values nếu có
    if (teachingClarity || teachingSupport || teacherInteraction) {
      const ratings = [
        teachingClarity,
        teachingSupport,
        teacherInteraction,
      ].filter((r) => r !== undefined);
      if (
        ratings.some(
          (rating) => !Number.isInteger(rating) || rating < 1 || rating > 5
        )
      ) {
        return {
          status: 400,
          body: {
            success: false,
            message: "All ratings must be integers between 1 and 5",
          },
        };
      }
    }
    // Cập nhật đánh giá
    const newEvaluation = {};
    if (teachingClarity) newEvaluation.teachingClarity = teachingClarity;
    if (teachingSupport) newEvaluation.teachingSupport = teachingSupport;
    if (teacherInteraction)
      newEvaluation.teacherInteraction = teacherInteraction;
    const newSelfAssessment = {};
    if (completedWell !== undefined) {
      newSelfAssessment.completedWell = completedWell;
      newSelfAssessment.reason = completedWell ? null : reason;
    }
    await evaluation.updateEvaluation(
      newEvaluation,
      comments,
      newSelfAssessment
    );
    await evaluation.populate([
      { path: "lesson", select: "lessonId scheduledDate topic" },
      { path: "class", select: "className" },
      { path: "subject", select: "subjectName subjectCode" },
      { path: "teacher", select: "name email" },
    ]);
    return {
      status: 200,
      body: {
        success: true,
        message: "Cập nhật đánh giá thành công",
        data: {
          evaluationId: evaluation._id,
          lesson: {
            lessonId: evaluation.lesson.lessonId,
            scheduledDate: evaluation.lesson.scheduledDate,
            topic: evaluation.lesson.topic,
          },
          evaluation: evaluation.evaluation,
          studentSelfAssessment: evaluation.studentSelfAssessment,
          comments: evaluation.comments,
          evaluatedAt: evaluation.evaluatedAt,
          updatedAt: evaluation.updatedAt,
        },
      },
    };
  }

  async getStudentEvaluations({ user, query }) {
    const studentId = user._id;
    const {
      classId,
      subjectId,
      teacherId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;
    const options = {};
    if (classId) options.classId = classId;
    if (subjectId) options.subjectId = subjectId;
    if (teacherId) options.teacherId = teacherId;
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const evaluations = await StudentLessonEvaluation.getStudentEvaluations(
      studentId,
      options
    )
      .skip(skip)
      .limit(parseInt(limit));
    const total = await StudentLessonEvaluation.countDocuments({
      student: studentId,
      ...(options.classId && { class: options.classId }),
      ...(options.subjectId && { subject: options.subjectId }),
      ...(options.teacherId && { teacher: options.teacherId }),
      ...(options.startDate && { evaluatedAt: { $gte: options.startDate } }),
      ...(options.endDate && { evaluatedAt: { ...{}, $lte: options.endDate } }),
    });
    const totalPages = Math.ceil(total / parseInt(limit));
    return {
      status: 200,
      body: {
        success: true,
        message: "Lấy danh sách đánh giá thành công",
        data: {
          evaluations: evaluations.map((evaluation) => ({
            evaluationId: evaluation._id,
            lesson: {
              lessonId: evaluation.lesson.lessonId,
              scheduledDate: evaluation.lesson.scheduledDate,
              topic: evaluation.lesson.topic,
              status: evaluation.lesson.status,
            },
            class: evaluation.class.className,
            subject: {
              name: evaluation.subject.subjectName,
              code: evaluation.subject.subjectCode,
            },
            teacher: {
              name: evaluation.teacher.name,
              email: evaluation.teacher.email,
            },
            evaluation: evaluation.evaluation,
            studentSelfAssessment: evaluation.studentSelfAssessment,
            comments: evaluation.comments,
            evaluatedAt: evaluation.evaluatedAt,
          })),
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    };
  }

  async getEvaluationDetail({ user, params }) {
    const { evaluationId } = params;
    const studentId = user._id;
    const evaluation = await StudentLessonEvaluation.findById(evaluationId)
      .populate(
        "lesson",
        "lessonId scheduledDate actualDate topic status notes"
      )
      .populate("class", "className")
      .populate("subject", "subjectName subjectCode")
      .populate("teacher", "name email");
    if (!evaluation) {
      return {
        status: 404,
        body: {
          success: false,
          message: "Evaluation not found",
        },
      };
    }
    if (evaluation.student.toString() !== studentId.toString()) {
      return {
        status: 403,
        body: {
          success: false,
          message: "You can only view your own evaluations",
        },
      };
    }
    return {
      status: 200,
      body: {
        success: true,
        message: "Lấy chi tiết đánh giá thành công",
        data: {
          evaluationId: evaluation._id,
          lesson: {
            lessonId: evaluation.lesson.lessonId,
            scheduledDate: evaluation.lesson.scheduledDate,
            actualDate: evaluation.lesson.actualDate,
            topic: evaluation.lesson.topic,
            status: evaluation.lesson.status,
            notes: evaluation.lesson.notes,
          },
          class: {
            name: evaluation.class.className,
            academicYear: evaluation.class.academicYear,
          },
          subject: {
            name: evaluation.subject.subjectName,
            code: evaluation.subject.subjectCode,
          },
          teacher: {
            name: evaluation.teacher.name,
            email: evaluation.teacher.email,
          },
          evaluation: evaluation.evaluation,
          studentSelfAssessment: evaluation.studentSelfAssessment,
          comments: evaluation.comments,
          evaluatedAt: evaluation.evaluatedAt,
          updatedAt: evaluation.updatedAt,
        },
      },
    };
  }

  async checkCanEvaluate({ user, params }) {
    const { lessonId } = params;
    const studentId = user._id;
    const result = await StudentLessonEvaluation.canStudentEvaluateLesson(
      studentId,
      lessonId
    );
    if (result.canEvaluate) {
      const lesson = await Lesson.findById(lessonId)
        .populate("class", "className")
        .populate("subject", "subjectName subjectCode")
        .populate("teacher", "name email");
      return {
        status: 200,
        body: {
          success: true,
          canEvaluate: true,
          message: "Học sinh có thể đánh giá tiết học này",
          data: {
            lesson: {
              lessonId: lesson.lessonId,
              scheduledDate: lesson.scheduledDate,
              actualDate: lesson.actualDate,
              topic: lesson.topic,
              status: lesson.status,
            },
            class: lesson.class.className,
            subject: {
              name: lesson.subject.subjectName,
              code: lesson.subject.subjectCode,
            },
            teacher: {
              name: lesson.teacher.name,
              email: lesson.teacher.email,
            },
          },
        },
      };
    } else {
      return {
        status: 403,
        body: {
          success: false,
          canEvaluate: false,
          message: result.reason,
        },
      };
    }
  }

  async getEvaluableLessons({ user, query }) {
    const studentId = user._id;
    const { startDate, endDate, subjectId, page = 1, limit = 20 } = query;
    const student = await User.findById(studentId).populate("class_id");
    if (!student || !student.class_id) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Student not found or not assigned to any class",
        },
      };
    }
    const lessonQuery = {
      class: student.class_id._id,
      status: "completed",
    };
    if (startDate) lessonQuery.scheduledDate = { $gte: new Date(startDate) };
    if (endDate) {
      lessonQuery.scheduledDate = {
        ...lessonQuery.scheduledDate,
        $lte: new Date(endDate),
      };
    }
    if (subjectId) lessonQuery.subject = subjectId;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const completedLessons = await Lesson.find(lessonQuery)
      .populate("subject", "subjectName subjectCode")
      .populate("teacher", "name email")
      .sort({ scheduledDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const evaluatedLessonIds = await StudentLessonEvaluation.find({
      student: studentId,
      lesson: { $in: completedLessons.map((l) => l._id) },
    }).distinct("lesson");
    const evaluableLessons = completedLessons.filter((lesson) => {
      const notEvaluated = !evaluatedLessonIds.some(
        (id) => id.toString() === lesson._id.toString()
      );
      const wasPresent = !lesson.attendance.absentStudents.some(
        (absent) => absent.student.toString() === studentId
      );
      return notEvaluated && wasPresent;
    });
    const totalQuery = await Lesson.countDocuments(lessonQuery);
    const totalPages = Math.ceil(totalQuery / parseInt(limit));
    return {
      status: 200,
      body: {
        success: true,
        message: "Lấy danh sách tiết học có thể đánh giá thành công",
        data: {
          lessons: evaluableLessons.map((lesson) => ({
            lessonId: lesson._id,
            lessonCode: lesson.lessonId,
            scheduledDate: lesson.scheduledDate,
            actualDate: lesson.actualDate,
            topic: lesson.topic,
            subject: {
              name: lesson.subject.subjectName,
              code: lesson.subject.subjectCode,
            },
            teacher: {
              name: lesson.teacher.name,
              email: lesson.teacher.email,
            },
            canEvaluate: true,
          })),
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: evaluableLessons.length,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    };
  }
}

module.exports = new StudentEvaluationService();
