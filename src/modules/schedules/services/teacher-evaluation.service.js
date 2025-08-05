const TeacherLessonEvaluation = require("../models/teacher-lesson-evaluation.model");
const Lesson = require("../models/lesson.model");
const User = require("../../auth/models/user.model");
const notificationService = require("../../notification/services/notification.service");
const parentNotificationService = require("../../notification/services/parent-notification.service");

class TeacherEvaluationService {
  async createEvaluation({ user, params, body }) {
    const { lessonId } = params;
    const {
      curriculumLesson,
      content,
      description,
      rating,
      comments,
      evaluationDetails,
      oralTests,
      violations,
    } = body;
    const teacherId = user._id;
    if (!curriculumLesson || !content || !rating) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Missing required fields: curriculumLesson, content, rating",
        },
      };
    }
    if (!["A+", "A", "B+", "B", "C"].includes(rating)) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Rating must be one of: A+, A, B+, B, C",
        },
      };
    }
    const lesson = await Lesson.findById(lessonId)
      .populate("class", "className")
      .populate("subject", "subjectName subjectCode");
    if (!lesson) {
      return {
        status: 404,
        body: {
          success: false,
          message: "Lesson not found",
        },
      };
    }
    const isMainTeacher =
      lesson.teacher && lesson.teacher._id.toString() === teacherId.toString();
    const isSubstituteTeacher =
      lesson.substituteTeacher &&
      lesson.substituteTeacher._id.toString() === teacherId.toString();
    if (!isMainTeacher && !isSubstituteTeacher) {
      return {
        status: 403,
        body: {
          success: false,
          message:
            "Only the assigned teacher or substitute teacher can evaluate this lesson",
        },
      };
    }
    if (lesson.status !== "completed") {
      return {
        status: 400,
        body: {
          success: false,
          message: "Can only evaluate completed lessons",
        },
      };
    }
    const existingEvaluation = await TeacherLessonEvaluation.findOne({
      lesson: lessonId,
      teacher: teacherId,
    });
    if (existingEvaluation) {
      return {
        status: 409,
        body: {
          success: false,
          message: "Lesson has already been evaluated",
        },
      };
    }
    const evaluation = new TeacherLessonEvaluation({
      lesson: lessonId,
      teacher: teacherId,
      class: lesson.class._id,
      subject: lesson.subject._id,
      lessonContent: {
        curriculumLesson,
        content,
        description: description || "",
      },
      evaluation: {
        rating,
        comments: comments || "",
        details: evaluationDetails || {},
      },
      oralTests: oralTests || [],
      violations: violations || [],
      status: "draft",
    });
    await evaluation.save();
    await evaluation.populate([
      { path: "lesson", select: "lessonId scheduledDate actualDate topic" },
      { path: "class", select: "className" },
      { path: "subject", select: "subjectName subjectCode" },
      { path: "oralTests.student", select: "name studentId" },
      { path: "violations.student", select: "name studentId" },
    ]);
    return {
      status: 201,
      body: {
        success: true,
        message: "Tạo đánh giá tiết học thành công",
        data: {
          evaluationId: evaluation._id,
          lesson: {
            lessonId: evaluation.lesson.lessonId,
            scheduledDate: evaluation.lesson.scheduledDate,
            actualDate: evaluation.lesson.actualDate,
            topic: evaluation.lesson.topic,
          },
          class: evaluation.class.className,
          subject: {
            name: evaluation.subject.subjectName,
            code: evaluation.subject.subjectCode,
          },
          lessonContent: evaluation.lessonContent,
          evaluation: evaluation.evaluation,
          summary: evaluation.summary,
          oralTests: evaluation.oralTests,
          violations: evaluation.violations,
          status: evaluation.status,
          createdAt: evaluation.createdAt,
        },
      },
    };
  }

  async updateEvaluation({ user, params, body }) {
    const { evaluationId } = params;
    const {
      curriculumLesson,
      content,
      description,
      rating,
      comments,
      evaluationDetails,
      oralTests,
      violations,
    } = body;
    const teacherId = user._id;
    const evaluation = await TeacherLessonEvaluation.findById(evaluationId);
    if (!evaluation) {
      return {
        status: 404,
        body: {
          success: false,
          message: "Evaluation not found",
        },
      };
    }
    if (evaluation.teacher.toString() !== teacherId.toString()) {
      return {
        status: 403,
        body: {
          success: false,
          message: "You can only update your own evaluations",
        },
      };
    }
    if (evaluation.status === "submitted") {
      return {
        status: 400,
        body: {
          success: false,
          message: "Cannot update submitted evaluation",
        },
      };
    }
    if (curriculumLesson)
      evaluation.lessonContent.curriculumLesson = curriculumLesson;
    if (content) evaluation.lessonContent.content = content;
    if (description !== undefined)
      evaluation.lessonContent.description = description;
    if (rating) {
      if (!["A+", "A", "B+", "B", "C"].includes(rating)) {
        return {
          status: 400,
          body: {
            success: false,
            message: "Rating must be one of: A+, A, B+, B, C",
          },
        };
      }
      evaluation.evaluation.rating = rating;
    }
    if (comments) evaluation.evaluation.comments = comments;
    if (evaluationDetails) {
      evaluation.evaluation.details = {
        ...evaluation.evaluation.details,
        ...evaluationDetails,
      };
    }
    if (oralTests !== undefined) evaluation.oralTests = oralTests;
    if (violations !== undefined) evaluation.violations = violations;
    await evaluation.save();
    await evaluation.populate([
      { path: "lesson", select: "lessonId scheduledDate actualDate topic" },
      { path: "class", select: "className" },
      { path: "subject", select: "subjectName subjectCode" },
      { path: "oralTests.student", select: "name studentId" },
      { path: "violations.student", select: "name studentId" },
    ]);
    return {
      status: 200,
      body: {
        success: true,
        message: "Cập nhật đánh giá thành công",
        data: {
          evaluationId: evaluation._id,
          lessonContent: evaluation.lessonContent,
          evaluation: evaluation.evaluation,
          summary: evaluation.summary,
          oralTests: evaluation.oralTests,
          violations: evaluation.violations,
          status: evaluation.status,
          updatedAt: evaluation.updatedAt,
        },
      },
    };
  }

  async getTeacherEvaluations({ user, query }) {
    const teacherId = user._id;
    const {
      classId,
      subjectId,
      status,
      rating,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;
    const options = {};
    if (classId) options.classId = classId;
    if (subjectId) options.subjectId = subjectId;
    if (status) options.status = status;
    if (rating) options.rating = rating;
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const evaluations = await TeacherLessonEvaluation.getTeacherEvaluations(
      teacherId,
      options
    )
      .skip(skip)
      .limit(parseInt(limit));
    const total = await TeacherLessonEvaluation.countDocuments({
      teacher: teacherId,
      ...(options.classId && { class: options.classId }),
      ...(options.subjectId && { subject: options.subjectId }),
      ...(options.status && { status: options.status }),
      ...(options.rating && { "evaluation.rating": options.rating }),
      ...(options.startDate && { createdAt: { $gte: options.startDate } }),
      ...(options.endDate && { createdAt: { ...{}, $lte: options.endDate } }),
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
              actualDate: evaluation.lesson.actualDate,
              topic: evaluation.lesson.topic,
            },
            class: evaluation.class.className,
            subject: {
              name: evaluation.subject.subjectName,
              code: evaluation.subject.subjectCode,
            },
            lessonContent: evaluation.lessonContent,
            evaluation: evaluation.evaluation,
            summary: evaluation.summary,
            status: evaluation.status,
            createdAt: evaluation.createdAt,
            updatedAt: evaluation.updatedAt,
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
    const teacherId = user._id;
    const evaluation = await TeacherLessonEvaluation.findById(evaluationId)
      .populate(
        "lesson",
        "lessonId scheduledDate actualDate topic status notes"
      )
      .populate("class", "className academicYear")
      .populate("subject", "subjectName subjectCode")
      .populate("teacher", "name email")
      .populate("oralTests.student", "name studentId email")
      .populate("violations.student", "name studentId email");
    if (!evaluation) {
      return {
        status: 404,
        body: {
          success: false,
          message: "Evaluation not found",
        },
      };
    }
    if (!user.role.includes("manager") && !user.role.includes("admin")) {
      if (evaluation.teacher._id.toString() !== teacherId.toString()) {
        return {
          status: 403,
          body: {
            success: false,
            message: "You can only view your own evaluations",
          },
        };
      }
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
          lessonContent: evaluation.lessonContent,
          evaluation: evaluation.evaluation,
          oralTests: evaluation.oralTests.map((test) => ({
            student: {
              id: test.student._id,
              name: test.student.name,
              studentId: test.student.studentId,
              email: test.student.email,
            },
            score: test.score,
            question: test.question,
            comment: test.comment,
            testedAt: test.testedAt,
          })),
          violations: evaluation.violations.map((violation) => ({
            student: {
              id: violation.student._id,
              name: violation.student.name,
              studentId: violation.student.studentId,
              email: violation.student.email,
            },
            description: violation.description,
            type: violation.type,
            severity: violation.severity,
            action: violation.action,
            recordedAt: violation.recordedAt,
          })),
          summary: evaluation.summary,
          status: evaluation.status,
          completedAt: evaluation.completedAt,
          submittedAt: evaluation.submittedAt,
          createdAt: evaluation.createdAt,
          updatedAt: evaluation.updatedAt,
        },
      },
    };
  }

  async completeEvaluation({ user, params }) {
    const { evaluationId } = params;
    const teacherId = user._id;
    const evaluation = await TeacherLessonEvaluation.findById(evaluationId);
    if (!evaluation) {
      return {
        status: 404,
        body: {
          success: false,
          message: "Evaluation not found",
        },
      };
    }
    if (evaluation.teacher.toString() !== teacherId.toString()) {
      return {
        status: 403,
        body: {
          success: false,
          message: "You can only complete your own evaluations",
        },
      };
    }
    if (evaluation.status === "submitted") {
      return {
        status: 400,
        body: {
          success: false,
          message: "Evaluation is already submitted",
        },
      };
    }
    await evaluation.complete();
    const lesson = await Lesson.findById(evaluation.lesson);
    if (lesson) {
      lesson.status = "completed";
      await lesson.save();
      if (lesson.type === "makeup") {
        const LessonRequestService = require("../services/lesson-request.service");
        const lessonRequestService = new LessonRequestService();
        await lessonRequestService.handleMakeupLessonCompleted(lesson._id);
      }
    }
    return {
      status: 200,
      body: {
        success: true,
        message: "Hoàn thành đánh giá thành công",
        data: {
          evaluationId: evaluation._id,
          status: evaluation.status,
          completedAt: evaluation.completedAt,
        },
      },
    };
  }

  async submitEvaluation({ user, params }) {
    const { evaluationId } = params;
    const teacherId = user._id;
    const evaluation = await TeacherLessonEvaluation.findById(evaluationId);
    if (!evaluation) {
      return {
        status: 404,
        body: {
          success: false,
          message: "Evaluation not found",
        },
      };
    }
    if (evaluation.teacher.toString() !== teacherId.toString()) {
      return {
        status: 403,
        body: {
          success: false,
          message: "You can only submit your own evaluations",
        },
      };
    }
    if (evaluation.status === "submitted") {
      return {
        status: 400,
        body: {
          success: false,
          message: "Evaluation is already submitted",
        },
      };
    }
    await evaluation.submit();
    const lesson = await Lesson.findById(evaluation.lesson);
    if (lesson) {
      lesson.status = "completed";
      await lesson.save();
      if (lesson.type === "makeup") {
        const LessonRequestService = require("../services/lesson-request.service");
        const lessonRequestService = new LessonRequestService();
        await lessonRequestService.handleMakeupLessonCompleted(lesson._id);
      }
    }

    // Gửi notification cho phụ huynh về đánh giá tiết học
    await parentNotificationService.notifyLessonEvaluation(
      evaluation._id,
      evaluation.lesson,
      teacherId
    );
    return {
      status: 200,
      body: {
        success: true,
        message: "Submit đánh giá thành công",
        data: {
          evaluationId: evaluation._id,
          status: evaluation.status,
          completedAt: evaluation.completedAt,
          submittedAt: evaluation.submittedAt,
        },
      },
    };
  }

  async addOralTest({ user, params, body }) {
    const { evaluationId } = params;
    const { studentId, score, question, comment } = body;
    const teacherId = user._id;
    if (!studentId || score === undefined) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Student ID and score are required",
        },
      };
    }
    if (typeof score !== "number" || score < 0 || score > 10) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Score must be a number between 0 and 10",
        },
      };
    }
    const evaluation = await TeacherLessonEvaluation.findById(evaluationId);
    if (!evaluation) {
      return {
        status: 404,
        body: {
          success: false,
          message: "Evaluation not found",
        },
      };
    }
    if (evaluation.teacher.toString() !== teacherId.toString()) {
      return {
        status: 403,
        body: {
          success: false,
          message: "You can only modify your own evaluations",
        },
      };
    }
    if (evaluation.status === "submitted") {
      return {
        status: 400,
        body: {
          success: false,
          message: "Cannot modify submitted evaluation",
        },
      };
    }
    await evaluation.addOralTest(
      studentId,
      score,
      question || "",
      comment || ""
    );
    return {
      status: 200,
      body: {
        success: true,
        message: "Thêm kiểm tra miệng thành công",
        data: {
          evaluationId: evaluation._id,
          summary: evaluation.summary,
        },
      },
    };
  }

  async addViolation({ user, params, body }) {
    const { evaluationId } = params;
    const { studentId, description, type, severity, action } = body;
    const teacherId = user._id;
    if (!studentId || !description) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Student ID and description are required",
        },
      };
    }
    const evaluation = await TeacherLessonEvaluation.findById(evaluationId);
    if (!evaluation) {
      return {
        status: 404,
        body: {
          success: false,
          message: "Evaluation not found",
        },
      };
    }
    if (evaluation.teacher.toString() !== teacherId.toString()) {
      return {
        status: 403,
        body: {
          success: false,
          message: "You can only modify your own evaluations",
        },
      };
    }
    if (evaluation.status === "submitted") {
      return {
        status: 400,
        body: {
          success: false,
          message: "Cannot modify submitted evaluation",
        },
      };
    }
    await evaluation.addViolation(
      studentId,
      description,
      type || "other",
      severity || "minor",
      action || ""
    );
    return {
      status: 200,
      body: {
        success: true,
        message: "Thêm vi phạm thành công",
        data: {
          evaluationId: evaluation._id,
          summary: evaluation.summary,
        },
      },
    };
  }

  async getEvaluationStats({ user, query }) {
    const teacherId = user._id;
    const { startDate, endDate, subjectId, classId } = query;
    const options = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);
    if (subjectId) options.subjectId = subjectId;
    if (classId) options.classId = classId;
    const stats = await TeacherLessonEvaluation.getTeacherEvaluationStats(
      teacherId,
      options
    );
    return {
      status: 200,
      body: {
        success: true,
        message: "Lấy thống kê đánh giá thành công",
        data: stats,
      },
    };
  }
}

module.exports = new TeacherEvaluationService();
