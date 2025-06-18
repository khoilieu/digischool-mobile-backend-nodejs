const { body, validationResult } = require('express-validator');

const validateSubjectCreate = [
  body('subjectName')
    .notEmpty()
    .withMessage('Subject name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Subject name must be between 2 and 100 characters')
    .trim(),

  body('subjectCode')
    .notEmpty()
    .withMessage('Subject code is required')
    .isLength({ min: 2, max: 6 })
    .withMessage('Subject code must be between 2 and 6 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Subject code must contain only uppercase letters and numbers')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .trim(),

  body('gradeLevels')
    .isArray({ min: 1 })
    .withMessage('Grade levels must be an array with at least one grade')
    .custom((value) => {
      const validGrades = value.every(grade => 
        Number.isInteger(grade) && grade >= 1 && grade <= 12
      );
      if (!validGrades) {
        throw new Error('All grade levels must be integers between 1 and 12');
      }
      return true;
    }),

  body('credits')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Credits must be an integer between 0 and 10'),

  body('weeklyHours')
    .optional()
    .isFloat({ min: 0, max: 20 })
    .withMessage('Weekly hours must be a number between 0 and 20')
    .custom((value) => {
      if (value % 0.5 !== 0) {
        throw new Error('Weekly hours must be in increments of 0.5');
      }
      return true;
    }),

  body('category')
    .optional()
    .isIn(['core', 'elective', 'extra_curricular', 'vocational', 'special'])
    .withMessage('Category must be one of: core, elective, extra_curricular, vocational, special'),

  body('department')
    .optional()
    .isIn([
      'mathematics', 'literature', 'english', 'science', 'physics', 'chemistry',
      'biology', 'history', 'geography', 'civic_education', 'physical_education',
      'arts', 'music', 'technology', 'informatics', 'foreign_language', 'other'
    ])
    .withMessage('Invalid department'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  // Custom validation middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

const validateSubjectUpdate = [
  body('subjectName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Subject name must be between 2 and 100 characters')
    .trim(),

  body('subjectCode')
    .optional()
    .isLength({ min: 2, max: 6 })
    .withMessage('Subject code must be between 2 and 6 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Subject code must contain only uppercase letters and numbers')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .trim(),

  body('gradeLevels')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Grade levels must be an array with at least one grade')
    .custom((value) => {
      const validGrades = value.every(grade => 
        Number.isInteger(grade) && grade >= 1 && grade <= 12
      );
      if (!validGrades) {
        throw new Error('All grade levels must be integers between 1 and 12');
      }
      return true;
    }),

  body('credits')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Credits must be an integer between 0 and 10'),

  body('weeklyHours')
    .optional()
    .isFloat({ min: 0, max: 20 })
    .withMessage('Weekly hours must be a number between 0 and 20')
    .custom((value) => {
      if (value % 0.5 !== 0) {
        throw new Error('Weekly hours must be in increments of 0.5');
      }
      return true;
    }),

  body('category')
    .optional()
    .isIn(['core', 'elective', 'extra_curricular', 'vocational', 'special'])
    .withMessage('Category must be one of: core, elective, extra_curricular, vocational, special'),

  body('department')
    .optional()
    .isIn([
      'mathematics', 'literature', 'english', 'science', 'physics', 'chemistry',
      'biology', 'history', 'geography', 'civic_education', 'physical_education',
      'arts', 'music', 'technology', 'informatics', 'foreign_language', 'other'
    ])
    .withMessage('Invalid department'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  // Custom validation middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateSubjectCreate,
  validateSubjectUpdate
}; 