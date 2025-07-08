const express = require("express");
const router = express.Router();
const teacherEvaluationController = require("../controllers/teacher-evaluation.controller");
const authMiddleware = require("../../auth/middleware/auth.middleware");
const teacherEvaluationValidation = require("../middleware/teacher-evaluation.validation");


// Áp dụng middleware xác thực và role cho tất cả route
router.use(authMiddleware.protect);
router.use(authMiddleware.authorize("teacher", "homeroom_teacher"));

// ===================== ĐÁNH GIÁ TIẾT HỌC =====================

// Tạo đánh giá mới cho tiết học
router.post(
  "/lessons/:lessonId/evaluate",
  teacherEvaluationValidation.createEvaluationValidation,
  teacherEvaluationController.createEvaluation
);

// Cập nhật đánh giá tiết học
router.put(
  "/:evaluationId",
  teacherEvaluationValidation.updateEvaluationValidation,
  teacherEvaluationController.updateEvaluation
);

// Lấy danh sách đánh giá của giáo viên hiện tại
router.get(
  "/",
  teacherEvaluationValidation.getTeacherEvaluationsValidation,
  teacherEvaluationController.getTeacherEvaluations
);

// Lấy chi tiết một đánh giá
router.get(
  "/:evaluationId",
  teacherEvaluationValidation.getEvaluationDetailValidation,
  teacherEvaluationController.getEvaluationDetail
);

// Hoàn thành đánh giá
router.post(
  "/:evaluationId/complete",
  teacherEvaluationValidation.completeEvaluationValidation,
  teacherEvaluationController.completeEvaluation
);

// Submit đánh giá
router.post(
  "/:evaluationId/submit",
  teacherEvaluationValidation.submitEvaluationValidation,
  teacherEvaluationController.submitEvaluation
);

// Thêm học sinh vắng
router.post(
  "/:evaluationId/absent-students",
  teacherEvaluationValidation.addAbsentStudentValidation,
  teacherEvaluationController.addAbsentStudent
);

// Thêm kiểm tra miệng
router.post(
  "/:evaluationId/oral-tests",
  teacherEvaluationValidation.addOralTestValidation,
  teacherEvaluationController.addOralTest
);

// Thêm vi phạm
router.post(
  "/:evaluationId/violations",
  teacherEvaluationValidation.addViolationValidation,
  teacherEvaluationController.addViolation
);

// ===================== THỐNG KÊ =====================

// Lấy thống kê đánh giá của giáo viên
router.get(
  "/stats/summary",
  teacherEvaluationValidation.getEvaluationStatsValidation,
  teacherEvaluationController.getEvaluationStats
);

module.exports = router;
