const { body, param, validationResult } = require("express-validator");

class TeacherEvaluationValidation {
  // Middleware để handle validation errors
  handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map((error) => ({
          field: error.path,
          message: error.msg,
          value: error.value,
        })),
      });
    }
    next();
  }

  // Validation cho tạo đánh giá mới (chỉ cần validation này cho UI)
  createEvaluationValidation() {
    return [
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
      body("comments")
        .optional()
        .isLength({ max: 1000 })
        .withMessage("Comments must not exceed 1000 characters"),
      body("rating")
        .isIn(["A+", "A", "B+", "B", "C"])
        .withMessage("Rating must be one of: A+, A, B+, B, C"),
      body("absentStudents")
        .optional()
        .isArray()
        .withMessage("Absent students must be an array"),
      body("absentStudents.*.student")
        .optional()
        .isMongoId()
        .withMessage("Student ID must be a valid MongoDB ObjectId"),
      body("absentStudents.*.isApprovedLeave")
        .optional()
        .isBoolean()
        .withMessage("Is approved leave must be a boolean"),
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
      this.handleValidationErrors,
    ];
  }
}

module.exports = new TeacherEvaluationValidation();
