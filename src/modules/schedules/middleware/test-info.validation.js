const { body, param, query, validationResult } = require("express-validator");

// Validation cho tạo nhắc nhở
const createTestInfoValidation = [
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

  body("title")
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage("Title must be between 5 and 200 characters")
    .trim(),

  body("content")
    .notEmpty()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Content must be between 10 and 1000 characters")
    .trim(),

  body("expectedTestDate")
    .optional()
    .isISO8601()
    .withMessage("Expected test date must be a valid date")
    .custom((value) => {
      if (value) {
        const testDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (testDate < today) {
          throw new Error("Expected test date cannot be in the past");
        }
      }
      return true;
    }),

  // Tất cả các trường sau đây là optional
  body("chapters")
    .optional()
    .isArray()
    .withMessage("Chapters must be an array"),

  body("chapters.*.chapterName")
    .if(body("chapters").exists())
    .optional()
    .isLength({ max: 100 })
    .withMessage("Chapter name must not exceed 100 characters")
    .trim(),

  body("chapters.*.topics")
    .optional()
    .isArray()
    .withMessage("Topics must be an array"),

  body("chapters.*.topics.*")
    .if(body("chapters.*.topics").exists())
    .optional()
    .isLength({ max: 150 })
    .withMessage("Topic must not exceed 150 characters")
    .trim(),

  body("references")
    .optional()
    .isArray()
    .withMessage("References must be an array"),

  body("references.*.title")
    .if(body("references").exists())
    .optional()
    .isLength({ max: 200 })
    .withMessage("Reference title must not exceed 200 characters")
    .trim(),

  body("references.*.description")
    .optional()
    .isLength({ max: 300 })
    .withMessage("Reference description must not exceed 300 characters")
    .trim(),

  body("references.*.url")
    .optional()
    .isURL()
    .withMessage("Reference URL must be a valid URL"),

  body("testInfoDate")
    .optional()
    .isISO8601()
    .withMessage("Test info date must be a valid date"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be one of: low, medium, high, urgent"),

  body("reminder")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Reminder must not exceed 500 characters")
    .trim(),

  param("lessonId").isMongoId().withMessage("Invalid lesson ID format"),
];

// Validation cho cập nhật nhắc nhở
const updateTestInfoValidation = [
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

  body("title")
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage("Title must be between 5 and 200 characters")
    .trim(),

  body("content")
    .optional()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Content must be between 10 and 1000 characters")
    .trim(),

  body("chapters")
    .optional()
    .isArray()
    .withMessage("Chapters must be an array"),

  body("chapters.*.chapterName")
    .if(body("chapters").exists())
    .notEmpty()
    .withMessage("Chapter name is required")
    .isLength({ max: 100 })
    .withMessage("Chapter name must not exceed 100 characters")
    .trim(),

  body("chapters.*.topics")
    .optional()
    .isArray()
    .withMessage("Topics must be an array"),

  body("chapters.*.topics.*")
    .if(body("chapters.*.topics").exists())
    .isLength({ max: 150 })
    .withMessage("Topic must not exceed 150 characters")
    .trim(),

  body("references")
    .optional()
    .isArray()
    .withMessage("References must be an array"),

  body("references.*.title")
    .if(body("references").exists())
    .notEmpty()
    .withMessage("Reference title is required")
    .isLength({ max: 200 })
    .withMessage("Reference title must not exceed 200 characters")
    .trim(),

  body("references.*.description")
    .optional()
    .isLength({ max: 300 })
    .withMessage("Reference description must not exceed 300 characters")
    .trim(),

  body("references.*.url")
    .optional()
    .isURL()
    .withMessage("Reference URL must be a valid URL"),

  body("expectedTestDate")
    .optional()
    .isISO8601()
    .withMessage("Expected test date must be a valid date")
    .custom((value) => {
      if (value) {
        const testDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (testDate < today) {
          throw new Error("Expected test date cannot be in the past");
        }
      }
      return true;
    }),

  body("testInfoDate")
    .optional()
    .isISO8601()
    .withMessage("Test info date must be a valid date"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be one of: low, medium, high, urgent"),

  body("reminder")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Reminder must not exceed 500 characters")
    .trim(),

  param("testInfoId").isMongoId().withMessage("Invalid testInfo ID format"),
];

// Validation cho query parameters
const queryValidation = [
  query("status")
    .optional()
    .isIn(["active", "completed", "cancelled"])
    .withMessage("Status must be one of: active, completed, cancelled"),

  query("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be one of: low, medium, high, urgent"),

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

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("days")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("Days must be between 1 and 365"),
];

// Validation cho param ID
const paramIdValidation = [
  param("testInfoId").isMongoId().withMessage("Invalid testInfo ID format"),
];

// Middleware để xử lý lỗi validation
const handleValidationErrors = (req, res, next) => {
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
};

module.exports = {
  createTestInfoValidation: [
    ...createTestInfoValidation,
    handleValidationErrors,
  ],
  updateTestInfoValidation: [
    ...updateTestInfoValidation,
    handleValidationErrors,
  ],
  queryValidation: [...queryValidation, handleValidationErrors],
  paramIdValidation: [...paramIdValidation, handleValidationErrors],
};
