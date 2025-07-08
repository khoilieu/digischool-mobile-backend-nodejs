const express = require("express");
const router = express.Router();
const studentEvaluationController = require("../controllers/student-evaluation.controller");
const studentEvaluationValidation = require("../middleware/student-evaluation.validation");
const authMiddleware = require("../../auth/middleware/auth.middleware");

// Áp dụng middleware xác thực cho tất cả route
router.use(authMiddleware.protect);
router.use(authMiddleware.authorize("student"));

// ===================== ĐÁNH GIÁ TIẾT HỌC =====================

// Tạo đánh giá mới cho tiết học
router.post(
  "/lessons/:lessonId/evaluate",
  studentEvaluationValidation.createEvaluationValidation,
  studentEvaluationController.createEvaluation
);

// Cập nhật đánh giá tiết học
router.put(
  "/:evaluationId",
  studentEvaluationValidation.updateEvaluationValidation,
  studentEvaluationController.updateEvaluation
);

// Lấy danh sách đánh giá của học sinh hiện tại
router.get(
  "/",
  studentEvaluationValidation.getStudentEvaluationsValidation,
  studentEvaluationController.getStudentEvaluations
);

// Lấy chi tiết một đánh giá
router.get(
  "/:evaluationId",
  studentEvaluationValidation.getEvaluationDetailValidation,
  studentEvaluationController.getEvaluationDetail
);

// Kiểm tra học sinh có thể đánh giá tiết học không
router.get(
  "/lessons/:lessonId/can-evaluate",
  studentEvaluationValidation.checkCanEvaluateValidation,
  studentEvaluationController.checkCanEvaluate
);

// Lấy danh sách tiết học có thể đánh giá
router.get(
  "/lessons/evaluable",
  studentEvaluationValidation.getEvaluableLessonsValidation,
  studentEvaluationController.getEvaluableLessons
);

module.exports = router;
