const { body, param, query, validationResult } = require("express-validator");

class TestInfoValidation {
  // Middleware để handle validation errors
  handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array().map((error) => ({
          field: error.path || error.param,
          message: error.msg,
          value: error.value,
        })),
      });
    }
    next();
  }

  // Validation cho tạo nhắc nhở
  createTestInfoValidation() {
    return [
      body("testType")
        .notEmpty()
        .isIn([
          "kiemtra15",
          "kiemtra1tiet",
          "kiemtrathuchanh",
          "kiemtramieng",
          "baitap",
          "other",
        ])
        .withMessage(
          "Test type must be one of: kiemtra15, kiemtra1tiet, kiemtrathuchanh, kiemtramieng, baitap, other"
        ),

      body("content")
        .notEmpty()
        .isLength({ min: 1, max: 1000 })
        .withMessage("Content must be between 1 and 1000 characters")
        .trim(),

      body("reminder")
        .optional()
        .isLength({ max: 500 })
        .withMessage("Reminder must not exceed 500 characters")
        .trim(),

      param("lessonId").isMongoId().withMessage("Invalid lesson ID format"),
      this.handleValidationErrors,
    ];
  }

  // Validation cho cập nhật nhắc nhở
  updateTestInfoValidation() {
    return [
      body("testType")
        .optional()
        .isIn([
          "kiemtra15",
          "kiemtra1tiet",
          "kiemtrathuchanh",
          "kiemtramieng",
          "baitap",
          "other",
        ])
        .withMessage(
          "Test type must be one of: kiemtra15, kiemtra1tiet, kiemtrathuchanh, kiemtramieng, baitap, other"
        ),

      body("content")
        .optional()
        .isLength({ min: 1, max: 1000 })
        .withMessage("Content must be between 1 and 1000 characters")
        .trim(),

      body("reminder")
        .optional()
        .isLength({ max: 500 })
        .withMessage("Reminder must not exceed 500 characters")
        .trim(),

      param("testInfoId").isMongoId().withMessage("Invalid testInfo ID format"),
      this.handleValidationErrors,
    ];
  }

  // Validation cho query parameters
  queryValidation() {
    return [
      query("testType")
        .optional()
        .isIn([
          "kiemtra15",
          "kiemtra1tiet",
          "kiemtrathuchanh",
          "kiemtramieng",
          "baitap",
          "other",
        ])
        .withMessage(
          "Test type must be one of: kiemtra15, kiemtra1tiet, kiemtrathuchanh, kiemtramieng, baitap, other"
        ),

      query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),

      query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
      this.handleValidationErrors,
    ];
  }

  // Validation cho param ID
  paramIdValidation() {
    return [
      param("testInfoId").isMongoId().withMessage("Invalid testInfo ID format"),
      this.handleValidationErrors,
    ];
  }
}

module.exports = new TestInfoValidation();
