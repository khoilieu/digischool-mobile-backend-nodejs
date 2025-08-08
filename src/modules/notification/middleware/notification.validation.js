const { body, query, param, validationResult } = require("express-validator");

class NotificationValidation {
  validateCreateNotification() {
    return [
      body("type")
        .isIn(["user", "activity", "system", "school", "teacher"])
        .withMessage("type phải là user, activity, system, school hoặc teacher"),
      body("title")
        .isString()
        .isLength({ min: 1, max: 200 })
        .withMessage("title là bắt buộc, tối đa 200 ký tự"),
      body("content")
        .isString()
        .isLength({ min: 1, max: 2000 })
        .withMessage("content là bắt buộc, tối đa 2000 ký tự"),
      body("receiverScope.type")
        .isIn(["school", "department", "grade", "class", "user"])
        .withMessage("receiverScope.type không hợp lệ"),
      body("receiverScope.ids")
        .isArray({ min: 1 })
        .withMessage("receiverScope.ids phải là mảng chứa ít nhất 1 phần tử"),
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        next();
      },
    ];
  }

  validateCreateManualNotification() {
    return [
      body("title")
        .isString()
        .isLength({ min: 1, max: 200 })
        .withMessage("title là bắt buộc, tối đa 200 ký tự"),
      body("content")
        .isString()
        .isLength({ min: 1, max: 2000 })
        .withMessage("content là bắt buộc, tối đa 2000 ký tự"),
      body("scopeType")
        .optional()
        .isIn(["Toàn trường", "Bộ môn", "Khối", "Lớp"])
        .withMessage("scopeType không hợp lệ"),
      body("department")
        .optional()
        .isString()
        .withMessage("department phải là string"),
      body("grade")
        .optional()
        .isString()
        .withMessage("grade phải là string"),
      body("selectedClass")
        .optional()
        .isString()
        .withMessage("selectedClass phải là string"),
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ 
            success: false,
            errors: errors.array() 
          });
        }
        next();
      },
    ];
  }

  validateGetUserNotifications() {
    return [
      query("type")
        .optional()
        .isIn(["user", "activity", "system", "school", "teacher"])
        .withMessage("type không hợp lệ"),
      query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("page phải là số nguyên dương"),
      query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("limit phải là số nguyên dương <= 100"),
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        next();
      },
    ];
  }

  validateMarkAsRead() {
    return [
      param("id").isMongoId().withMessage("id không hợp lệ"),
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        next();
      },
    ];
  }

  validateMarkAllAsRead() {
    return [
      (req, res, next) => {
        next();
      },
    ];
  }
}

module.exports = new NotificationValidation();
