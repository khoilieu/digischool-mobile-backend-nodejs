const { body, param, query } = require("express-validator");

// Validation cho tạo đánh giá mới
const createEvaluationValidation = [
  param("lessonId")
    .isMongoId()
    .withMessage("Lesson ID must be a valid MongoDB ObjectId"),
  body("curriculumLesson")
    .notEmpty()
    .withMessage("Curriculum lesson is required")
    .isLength({ max: 100 })
    .withMessage("Curriculum lesson must not exceed 100 characters"),
  body("content")
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ max: 1000 })
    .withMessage("Content must not exceed 1000 characters"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  body("rating")
    .isIn(["A+", "A", "B+", "B", "C"])
    .withMessage("Rating must be one of: A+, A, B+, B, C"),
  body("comments")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Comments must not exceed 1000 characters"),
  body("evaluationDetails")
    .optional()
    .isObject()
    .withMessage("Evaluation details must be an object"),
  body("absentStudents")
    .optional()
    .isArray()
    .withMessage("Absent students must be an array"),
  body("absentStudents.*.student")
    .optional()
    .isMongoId()
    .withMessage("Student ID must be a valid MongoDB ObjectId"),
  body("absentStudents.*.isExcused")
    .optional()
    .isBoolean()
    .withMessage("Is excused must be a boolean"),
  body("absentStudents.*.reason")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Reason must not exceed 200 characters"),
  body("oralTests")
    .optional()
    .isArray()
    .withMessage("Oral tests must be an array"),
  body("oralTests.*.student")
    .optional()
    .isMongoId()
    .withMessage("Student ID must be a valid MongoDB ObjectId"),
  body("oralTests.*.score")
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage("Score must be a number between 0 and 10"),
  body("violations")
    .optional()
    .isArray()
    .withMessage("Violations must be an array"),
  body("violations.*.student")
    .optional()
    .isMongoId()
    .withMessage("Student ID must be a valid MongoDB ObjectId"),
  body("violations.*.description")
    .optional()
    .notEmpty()
    .withMessage("Violation description is required")
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
];

// Validation cho cập nhật đánh giá
const updateEvaluationValidation = [
  param("evaluationId")
    .isMongoId()
    .withMessage("Evaluation ID must be a valid MongoDB ObjectId"),
  body("curriculumLesson")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Curriculum lesson must not exceed 100 characters"),
  body("content")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Content must not exceed 1000 characters"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  body("rating")
    .optional()
    .isIn(["A+", "A", "B+", "B", "C"])
    .withMessage("Rating must be one of: A+, A, B+, B, C"),
  body("comments")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Comments must not exceed 1000 characters"),
  body("evaluationDetails")
    .optional()
    .isObject()
    .withMessage("Evaluation details must be an object"),
  body("absentStudents")
    .optional()
    .isArray()
    .withMessage("Absent students must be an array"),
  body("oralTests")
    .optional()
    .isArray()
    .withMessage("Oral tests must be an array"),
  body("violations")
    .optional()
    .isArray()
    .withMessage("Violations must be an array"),
];

// Validation cho lấy danh sách đánh giá
const getTeacherEvaluationsValidation = [
  query("classId")
    .optional()
    .isMongoId()
    .withMessage("Class ID must be a valid MongoDB ObjectId"),
  query("subjectId")
    .optional()
    .isMongoId()
    .withMessage("Subject ID must be a valid MongoDB ObjectId"),
  query("status")
    .optional()
    .isIn(["draft", "completed", "submitted"])
    .withMessage("Status must be one of: draft, completed, submitted"),
  query("rating")
    .optional()
    .isIn(["A+", "A", "B+", "B", "C"])
    .withMessage("Rating must be one of: A+, A, B+, B, C"),
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

// Validation cho hoàn thành đánh giá
const completeEvaluationValidation = [
  param("evaluationId")
    .isMongoId()
    .withMessage("Evaluation ID must be a valid MongoDB ObjectId"),
];

// Validation cho submit đánh giá
const submitEvaluationValidation = [
  param("evaluationId")
    .isMongoId()
    .withMessage("Evaluation ID must be a valid MongoDB ObjectId"),
];

// Validation cho thêm học sinh vắng
const addAbsentStudentValidation = [
  param("evaluationId")
    .isMongoId()
    .withMessage("Evaluation ID must be a valid MongoDB ObjectId"),
  body("studentId")
    .isMongoId()
    .withMessage("Student ID must be a valid MongoDB ObjectId"),
  body("isExcused")
    .optional()
    .isBoolean()
    .withMessage("Is excused must be a boolean"),
  body("reason")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Reason must not exceed 200 characters"),
];

// Validation cho thêm kiểm tra miệng
const addOralTestValidation = [
  param("evaluationId")
    .isMongoId()
    .withMessage("Evaluation ID must be a valid MongoDB ObjectId"),
  body("studentId")
    .isMongoId()
    .withMessage("Student ID must be a valid MongoDB ObjectId"),
  body("score")
    .isFloat({ min: 0, max: 10 })
    .withMessage("Score must be a number between 0 and 10"),
  body("question")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Question must not exceed 500 characters"),
  body("comment")
    .optional()
    .isLength({ max: 300 })
    .withMessage("Comment must not exceed 300 characters"),
];

// Validation cho thêm vi phạm
const addViolationValidation = [
  param("evaluationId")
    .isMongoId()
    .withMessage("Evaluation ID must be a valid MongoDB ObjectId"),
  body("studentId")
    .isMongoId()
    .withMessage("Student ID must be a valid MongoDB ObjectId"),
  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  body("type")
    .optional()
    .isIn([
      "late",
      "disruptive",
      "unprepared",
      "disrespectful",
      "cheating",
      "other",
    ])
    .withMessage(
      "Type must be one of: late, disruptive, unprepared, disrespectful, cheating, other"
    ),
  body("severity")
    .optional()
    .isIn(["minor", "moderate", "serious"])
    .withMessage("Severity must be one of: minor, moderate, serious"),
  body("action")
    .optional()
    .isLength({ max: 300 })
    .withMessage("Action must not exceed 300 characters"),
];

// Validation cho lấy thống kê đánh giá
const getEvaluationStatsValidation = [
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
  query("classId")
    .optional()
    .isMongoId()
    .withMessage("Class ID must be a valid MongoDB ObjectId"),
];

module.exports = {
  createEvaluationValidation,
  updateEvaluationValidation,
  getTeacherEvaluationsValidation,
  getEvaluationDetailValidation,
  completeEvaluationValidation,
  submitEvaluationValidation,
  addAbsentStudentValidation,
  addOralTestValidation,
  addViolationValidation,
  getEvaluationStatsValidation,
};
