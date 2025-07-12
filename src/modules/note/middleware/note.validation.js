const { body } = require('express-validator');
const { validationResult } = require('express-validator');

const validateNote = {
  create: [
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required'),
    body('content')
      .trim()
      .notEmpty().withMessage('Content is required'),
    body('lesson')
      .trim()
      .notEmpty().withMessage('Lesson is required'),
    body('remindMinutes')
      .isInt({ min: 0 }).withMessage('remindMinutes must be a non-negative integer'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      next();
    }
  ],
  update: [
    body('title')
      .optional()
      .trim()
      .notEmpty().withMessage('Title must be a non-empty string'),
    body('content')
      .optional()
      .trim()
      .notEmpty().withMessage('Content must be a non-empty string'),
    body('remindMinutes')
      .optional()
      .isInt({ min: 0 }).withMessage('remindMinutes must be a non-negative integer'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      next();
    }
  ]
};

module.exports = validateNote; 