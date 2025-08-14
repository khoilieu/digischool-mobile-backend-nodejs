const { body, param, query } = require("express-validator");
const { validationResult } = require("express-validator");

class NoteValidation {
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

  // Validation cho tạo ghi chú mới
  validateCreateNote() {
    return [
      body("title")
        .trim()
        .notEmpty()
        .withMessage("Title is required")
        .isLength({ min: 1, max: 50 })
        .withMessage("Title must be between 1 and 50 characters"),

      body("content")
        .trim()
        .notEmpty()
        .withMessage("Content is required")
        .isLength({ min: 1, max: 200 })
        .withMessage("Content must be between 1 and 200 characters"),

      body("lesson")
        .trim()
        .notEmpty()
        .withMessage("Lesson is required")
        .isMongoId()
        .withMessage("Lesson must be a valid MongoDB ObjectId"),

      body("remindMinutes")
        .optional()
        .isInt({ min: 0 })
        .withMessage("remindMinutes must be a non-negative integer"),

      this.handleValidationErrors,
    ];
  }

  // Validation cho cập nhật ghi chú
  validateUpdateNote() {
    return [
      param("id")
        .isMongoId()
        .withMessage("Note ID must be a valid MongoDB ObjectId"),

      body("title")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Title must be a non-empty string")
        .isLength({ min: 1, max: 200 })
        .withMessage("Title must be between 1 and 200 characters"),

      body("content")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Content must be a non-empty string")
        .isLength({ min: 1, max: 5000 })
        .withMessage("Content must be between 1 and 5000 characters"),

      body("remindMinutes")
        .optional()
        .isInt({ min: 0 })
        .withMessage("remindMinutes must be a non-negative integer"),

      this.handleValidationErrors,
    ];
  }

  // Validation cho lấy ghi chú theo tiết học
  validateGetNotesByLesson() {
    return [
      query("lesson")
        .trim()
        .notEmpty()
        .withMessage("Lesson ID is required")
        .isMongoId()
        .withMessage("Lesson ID must be a valid MongoDB ObjectId"),

      this.handleValidationErrors,
    ];
  }

  // Validation cho xóa ghi chú
  validateDeleteNote() {
    return [
      param("id")
        .isMongoId()
        .withMessage("Note ID must be a valid MongoDB ObjectId"),

      this.handleValidationErrors,
    ];
  }
}

module.exports = new NoteValidation();
