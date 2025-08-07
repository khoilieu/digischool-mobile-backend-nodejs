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
      comments,
      rating,
      absentStudents,
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
      curriculumLesson,
      content,
      comments: comments || "",
      rating,
      absentStudents: absentStudents || [],
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
      { path: "absentStudents.student", select: "name studentId" },
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
          curriculumLesson: evaluation.curriculumLesson,
          content: evaluation.content,
          comments: evaluation.comments,
          rating: evaluation.rating,
          summary: evaluation.summary,
          absentStudents: evaluation.absentStudents,
          oralTests: evaluation.oralTests,
          violations: evaluation.violations,
          status: evaluation.status,
          createdAt: evaluation.createdAt,
        },
      },
    };
  }
}

module.exports = new TeacherEvaluationService();
