const express = require("express");
const router = express.Router();
const teacherEvaluationController = require("../controllers/teacher-evaluation.controller");
const authMiddleware = require("../../auth/middleware/auth.middleware");
const teacherEvaluationValidation = require("../middleware/teacher-evaluation.validation");

// Áp dụng middleware xác thực và role cho tất cả route
router.use(authMiddleware.protect);
router.use(authMiddleware.authorize("teacher", "homeroom_teacher"));

// ===================== ĐÁNH GIÁ TIẾT HỌC =====================

// Tạo đánh giá mới cho tiết học (chỉ cần API này cho UI)
router.post(
  "/lessons/:lessonId/evaluate",
  teacherEvaluationValidation.createEvaluationValidation(),
  teacherEvaluationController.createEvaluation
);

module.exports = router;
