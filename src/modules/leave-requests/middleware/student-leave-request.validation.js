const { body, param, query, validationResult } = require("express-validator");

// Validation for creating lesson leave requests (requestType = "lesson")
const createLessonLeaveRequests = [
  body("lessonIds")
    .isArray({ min: 1, max: 10 })
    .withMessage("Lesson IDs must be an array with 1-10 items"),

  body("lessonIds.*")
    .isMongoId()
    .withMessage("Each lesson ID must be a valid MongoDB ObjectId"),

  body("phoneNumber")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[0-9+\-\s\(\)]{10,15}$/)
    .withMessage("Phone number must be valid (10-15 digits)"),

  body("reason")
    .notEmpty()
    .withMessage("Reason is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Reason must be between 1-200 characters")
    .trim(),
];

// Validation for creating day leave request (requestType = "day")
const createDayLeaveRequest = [
  body("date")
    .notEmpty()
    .withMessage("Date is required")
    .isISO8601()
    .withMessage("Date must be a valid ISO date")
    .custom((date) => {
      const requestDate = new Date(date);
      const now = new Date();
      if (requestDate < now.setHours(0, 0, 0, 0)) {
        throw new Error("Cannot request leave for past dates");
      }
      return true;
    }),

  body("phoneNumber")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[0-9+\-\s\(\)]{10,15}$/)
    .withMessage("Phone number must be valid (10-15 digits)"),

  body("reason")
    .notEmpty()
    .withMessage("Reason is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Reason must be between 1-200 characters")
    .trim(),
];

// Validation for request ID parameter
const validateRequestId = [
  param("requestId")
    .isMongoId()
    .withMessage("Request ID must be a valid MongoDB ObjectId"),
];

// Validation for approving request
const validateApproveRequest = [
  ...validateRequestId,
  body("comment")
    .optional()
    .isLength({ max: 300 })
    .withMessage("Comment cannot exceed 300 characters")
    .trim(),
];

// Validation for rejecting request
const validateRejectRequest = [
  ...validateRequestId,
  // Bỏ validate comment
];

// Validation for date range queries
const validateDateRange = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO date")
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate) {
        const start = new Date(req.query.startDate);
        const end = new Date(endDate);
        const diffDays = (end - start) / (1000 * 60 * 60 * 24);

        if (diffDays < 0) {
          throw new Error("End date must be after start date");
        }

        if (diffDays > 90) {
          throw new Error("Date range cannot exceed 90 days");
        }
      }
      return true;
    }),
];

// Validation for pagination
const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Page must be a positive integer (max 1000)"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1-100"),
];

// Validation for status filter
const validateStatusFilter = [
  query("status")
    .optional()
    .isIn(["pending", "approved", "rejected", "cancelled"])
    .withMessage("Status must be one of: pending, approved, rejected, cancelled"),
];

// Validation for available lessons query
const validateAvailableLessons = [
  query("startDate")
    .notEmpty()
    .withMessage("Start date is required")
    .isISO8601()
    .withMessage("Start date must be a valid ISO date"),

  query("endDate")
    .notEmpty()
    .withMessage("End date is required")
    .isISO8601()
    .withMessage("End date must be a valid ISO date")
    .custom((endDate, { req }) => {
      const start = new Date(req.query.startDate);
      const end = new Date(endDate);
      const now = new Date();
      const diffDays = (end - start) / (1000 * 60 * 60 * 24);

      if (end <= now) {
        throw new Error("End date must be in the future");
      }

      if (diffDays < 0) {
        throw new Error("End date must be after start date");
      }

      if (diffDays > 30) {
        throw new Error("Date range cannot exceed 30 days");
      }

      return true;
    }),
];

// Validation for batch processing
const validateBatchProcess = [
  body("requests")
    .isArray({ min: 1, max: 20 })
    .withMessage("Requests must be an array with 1-20 items"),

  body("requests.*.requestId")
    .isMongoId()
    .withMessage("Each request must have a valid requestId"),

  body("requests.*.action")
    .isIn(["approve", "reject"])
    .withMessage("Action must be either approve or reject"),

  body("requests.*.comment")
    .optional()
    .isLength({ max: 300 })
    .withMessage("Comment cannot exceed 300 characters")
    .custom((comment, { req }) => {
      const requestIndex = req.body.requests.findIndex(
        (r) => r.comment === comment
      );
      const request = req.body.requests[requestIndex];

      if (
        request &&
        request.action === "reject" &&
        (!comment || !comment.trim())
      ) {
        throw new Error("Comment is required when rejecting a request");
      }

      return true;
    }),
];

// Validation for stats query
const validateStatsQuery = [
  query("teacherId")
    .optional()
    .isMongoId()
    .withMessage("Teacher ID must be a valid MongoDB ObjectId"),

  query("studentId")
    .optional()
    .isMongoId()
    .withMessage("Student ID must be a valid MongoDB ObjectId"),

  query("classId")
    .optional()
    .isMongoId()
    .withMessage("Class ID must be a valid MongoDB ObjectId"),

  ...validateDateRange,
];

// Error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
      value: error.value,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errorMessages,
    });
  }

  next();
};

const studentLeaveRequestValidation = {
  createLessonLeaveRequests: [...createLessonLeaveRequests, handleValidationErrors],
  createDayLeaveRequest: [...createDayLeaveRequest, handleValidationErrors],
  validateRequestId: [...validateRequestId, handleValidationErrors],
  validateApproveRequest: [...validateApproveRequest, handleValidationErrors],
  validateRejectRequest: [...validateRejectRequest, handleValidationErrors],
  validateDateRange: [...validateDateRange, handleValidationErrors],
  validatePagination: [...validatePagination, handleValidationErrors],
  validateStatusFilter: [...validateStatusFilter, handleValidationErrors],
  validateAvailableLessons: [
    ...validateAvailableLessons,
    handleValidationErrors,
  ],
  validateBatchProcess: [...validateBatchProcess, handleValidationErrors],
  validateStatsQuery: [...validateStatsQuery, handleValidationErrors],

  // Combined validations for common use cases
  validateGetRequests: [
    ...validateDateRange,
    ...validatePagination,
    ...validateStatusFilter,
    handleValidationErrors,
  ],
};

module.exports = studentLeaveRequestValidation;
