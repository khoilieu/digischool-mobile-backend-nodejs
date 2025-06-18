const { body, param } = require('express-validator');
const { validationResult } = require('express-validator');

const validateCourse = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Course name is required')
      .isLength({ min: 3 })
      .withMessage('Course name must be at least 3 characters long'),
    
    body('level')
      .trim()
      .notEmpty()
      .withMessage('Course level is required')
      .isIn(['Beginner', 'Intermediate', 'Advanced'])
      .withMessage('Invalid course level'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),

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
    param('id')
      .isMongoId()
      .withMessage('Invalid course ID'),

    body('name')
      .optional()
      .trim()
      .isLength({ min: 3 })
      .withMessage('Course name must be at least 3 characters long'),
    
    body('level')
      .optional()
      .trim()
      .isIn(['Beginner', 'Intermediate', 'Advanced'])
      .withMessage('Invalid course level'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),

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

  id: [
    param('id')
      .isMongoId()
      .withMessage('Invalid course ID'),

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

module.exports = validateCourse; 