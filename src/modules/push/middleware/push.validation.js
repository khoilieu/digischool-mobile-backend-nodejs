const { body, param, validationResult } = require("express-validator");

const validateRegisterDeviceToken = [
  body("fcmToken")
    .notEmpty()
    .withMessage("FCM token is required")
    .isString()
    .withMessage("FCM token must be a string"),
  body("platform")
    .notEmpty()
    .withMessage("Platform is required")
    .isIn(["android", "ios"])
    .withMessage("Platform must be 'android' or 'ios'"),
  body("deviceId")
    .optional()
    .isString()
    .withMessage("Device ID must be a string"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

const validateUnregisterDeviceToken = [
  body("fcmToken")
    .notEmpty()
    .withMessage("FCM token is required")
    .isString()
    .withMessage("FCM token must be a string"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

const validateSendPushNotification = [
  body("userIds")
    .notEmpty()
    .withMessage("User IDs are required")
    .isArray()
    .withMessage("User IDs must be an array"),
  body("userIds.*")
    .isMongoId()
    .withMessage("Invalid user ID format"),
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string")
    .isLength({ max: 100 })
    .withMessage("Title must be less than 100 characters"),
  body("content")
    .notEmpty()
    .withMessage("Content is required")
    .isString()
    .withMessage("Content must be a string")
    .isLength({ max: 500 })
    .withMessage("Content must be less than 500 characters"),
  body("type")
    .optional()
    .isString()
    .withMessage("Type must be a string"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

const validateUserId = [
  param("userId")
    .optional()
    .isMongoId()
    .withMessage("Invalid user ID format"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

module.exports = {
  validateRegisterDeviceToken,
  validateUnregisterDeviceToken,
  validateSendPushNotification,
  validateUserId,
};

