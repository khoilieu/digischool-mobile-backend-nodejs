const { body, param, query } = require("express-validator");
const { validationResult } = require("express-validator");

class PersonalActivityValidation {
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

  validateCreate() {
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
      body("date").notEmpty().withMessage("Date is required"),
      body("period").notEmpty().withMessage("Period is required"),
      body("remindMinutes")
        .optional()
        .isInt({ min: 0 })
        .withMessage("remindMinutes must be a non-negative integer"),
      this.handleValidationErrors,
    ];
  }

  validateGet() {
    return [
      query("date").notEmpty().withMessage("Date is required"),
      query("period").notEmpty().withMessage("Period is required"),
      this.handleValidationErrors,
    ];
  }

  validateUpdate() {
    return [
      param("activityId")
        .isMongoId()
        .withMessage("Activity ID must be a valid MongoDB ObjectId"),
      this.handleValidationErrors,
    ];
  }

  validateDelete() {
    return [
      param("activityId")
        .isMongoId()
        .withMessage("Activity ID must be a valid MongoDB ObjectId"),
      this.handleValidationErrors,
    ];
  }
}

module.exports = new PersonalActivityValidation();
