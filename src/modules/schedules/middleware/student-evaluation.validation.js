const { body, param, query } = require("express-validator");

// Validation cho tạo đánh giá mới
const createEvaluationValidation = [
  param("lessonId")
    .isMongoId()
    .withMessage("Lesson ID must be a valid MongoDB ObjectId"),
  body("teachingClarity")
    .isInt({ min: 1, max: 5 })
    .withMessage("Teaching clarity rating must be an integer between 1 and 5"),
  body("teachingSupport")
    .isInt({ min: 1, max: 5 })
    .withMessage("Teaching support rating must be an integer between 1 and 5"),
  body("teacherInteraction")
    .isInt({ min: 1, max: 5 })
    .withMessage(
      "Teacher interaction rating must be an integer between 1 and 5"
    ),
  body("completedWell")
    .isBoolean()
    .withMessage("Completed well must be a boolean value"),
  body("reason")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Reason must not exceed 200 characters"),
  body("comments")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Comments must not exceed 500 characters"),
];

// Validation cho cập nhật đánh giá
const updateEvaluationValidation = [
  param("evaluationId")
    .isMongoId()
    .withMessage("Evaluation ID must be a valid MongoDB ObjectId"),
  body("teachingClarity")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Teaching clarity rating must be an integer between 1 and 5"),
  body("teachingSupport")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Teaching support rating must be an integer between 1 and 5"),
  body("teacherInteraction")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage(
      "Teacher interaction rating must be an integer between 1 and 5"
    ),
  body("completedWell")
    .optional()
    .isBoolean()
    .withMessage("Completed well must be a boolean value"),
  body("reason")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Reason must not exceed 200 characters"),
  body("comments")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Comments must not exceed 500 characters"),
];

// Validation cho lấy danh sách đánh giá
const getStudentEvaluationsValidation = [
  query("classId")
    .optional()
    .isMongoId()
    .withMessage("Class ID must be a valid MongoDB ObjectId"),
  query("subjectId")
    .optional()
    .isMongoId()
    .withMessage("Subject ID must be a valid MongoDB ObjectId"),
  query("teacherId")
    .optional()
    .isMongoId()
    .withMessage("Teacher ID must be a valid MongoDB ObjectId"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be in ISO 8601 format"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be in ISO 8601 format"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

// Validation cho lấy chi tiết đánh giá
const getEvaluationDetailValidation = [
  param("evaluationId")
    .isMongoId()
    .withMessage("Evaluation ID must be a valid MongoDB ObjectId"),
];

// Validation cho kiểm tra có thể đánh giá tiết học không
const checkCanEvaluateValidation = [
  param("lessonId")
    .isMongoId()
    .withMessage("Lesson ID must be a valid MongoDB ObjectId"),
];

// Validation cho lấy danh sách tiết học có thể đánh giá
const getEvaluableLessonsValidation = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be in ISO 8601 format"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be in ISO 8601 format"),
  query("subjectId")
    .optional()
    .isMongoId()
    .withMessage("Subject ID must be a valid MongoDB ObjectId"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

module.exports = {
  createEvaluationValidation,
  updateEvaluationValidation,
  getStudentEvaluationsValidation,
  getEvaluationDetailValidation,
  checkCanEvaluateValidation,
  getEvaluableLessonsValidation,
};
