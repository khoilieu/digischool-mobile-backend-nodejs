const { body, param, query, validationResult } = require('express-validator');

// Validation for creating teacher leave requests
const validateCreateTeacherLeaveRequest = [
  body('lessonIds')
    .isArray({ min: 1, max: 10 })
    .withMessage('Lesson IDs must be an array with 1-10 items'),
  
  body('lessonIds.*')
    .isMongoId()
    .withMessage('Each lesson ID must be a valid MongoDB ObjectId'),
  
  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10-500 characters')
    .trim(),
  
  body('emergencyContact.phone')
    .notEmpty()
    .withMessage('Emergency contact phone is required')
    .matches(/^[0-9+\-\s\(\)]{10,15}$/)
    .withMessage('Emergency contact phone must be valid (10-15 digits)'),
  
  body('emergencyContact.relationship')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Emergency contact relationship cannot exceed 100 characters')
    .trim()
];

// Validation for request ID parameter
const validateRequestId = [
  param('requestId')
    .isMongoId()
    .withMessage('Request ID must be a valid MongoDB ObjectId')
];

// Validation for approving teacher leave request
const validateApproveTeacherLeaveRequest = [
  ...validateRequestId,
  body('comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters')
    .trim()
];

// Validation for rejecting teacher leave request
const validateRejectTeacherLeaveRequest = [
  ...validateRequestId,
  body('comment')
    .notEmpty()
    .withMessage('Comment is required when rejecting a teacher leave request')
    .isLength({ min: 5, max: 500 })
    .withMessage('Comment must be between 5-500 characters')
    .trim()
];

// Validation for date range queries
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date')
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate) {
        const start = new Date(req.query.startDate);
        const end = new Date(endDate);
        const diffDays = (end - start) / (1000 * 60 * 60 * 24);
        
        if (diffDays < 0) {
          throw new Error('End date must be after start date');
        }
        
        if (diffDays > 30) {
          throw new Error('Date range cannot exceed 30 days');
        }
      }
      
      return true;
    })
];

// Validation for pagination
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1-100')
];

// Validation for status filter
const validateStatusFilter = [
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Status must be pending, approved, or rejected')
];

// Validation for getting teacher requests
const validateGetTeacherRequests = [
  ...validateDateRange,
  ...validatePagination,
  ...validateStatusFilter
];

// Validation for getting pending requests (manager only)
const validateGetPendingRequests = [
  ...validateDateRange,
  ...validatePagination
];

// Validation for available lessons query
const validateAvailableLessonsForTeacher = [
  query('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  
  query('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid ISO date')
    .custom((endDate, { req }) => {
      const start = new Date(req.query.startDate);
      const end = new Date(endDate);
      const now = new Date();
      const diffDays = (end - start) / (1000 * 60 * 60 * 24);
      
      if (start <= now) {
        throw new Error('Start date must be in the future');
      }
      
      if (diffDays < 0) {
        throw new Error('End date must be after start date');
      }
      
      if (diffDays > 30) {
        throw new Error('Date range cannot exceed 30 days');
      }
      
      return true;
    })
];

// Error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

module.exports = {
  validateCreateTeacherLeaveRequest,
  validateRequestId,
  validateApproveTeacherLeaveRequest,
  validateRejectTeacherLeaveRequest,
  validateGetTeacherRequests,
  validateGetPendingRequests,
  validateAvailableLessonsForTeacher,
  handleValidationErrors
}; 