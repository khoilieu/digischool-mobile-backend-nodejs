const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

class LessonRequestValidation {
  
  // Validation cho việc tạo yêu cầu đổi tiết/dạy bù
  static createLessonRequest() {
    return [
      body('originalLessonId')
        .notEmpty()
        .withMessage('Original lesson ID is required')
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid original lesson ID format');
          }
          return true;
        }),
      
      body('replacementLessonId')
        .notEmpty()
        .withMessage('Replacement lesson ID is required')
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid replacement lesson ID format');
          }
          return true;
        }),
      
      body('requestType')
        .notEmpty()
        .withMessage('Request type is required')
        .isIn(['swap', 'makeup'])
        .withMessage('Request type must be either swap or makeup'),
      
      body('reason')
        .notEmpty()
        .withMessage('Reason is required')
        .isLength({ min: 10, max: 500 })
        .withMessage('Reason must be between 10 and 500 characters')
        .trim(),
      
      body('absentReason')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Absent reason cannot exceed 500 characters')
        .trim()
    ];
  }
  
  // Validation cho việc approve/reject yêu cầu
  static processRequest() {
    return [
      param('requestId')
        .notEmpty()
        .withMessage('Request ID is required')
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid request ID format');
          }
          return true;
        }),
      
      body('comment')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Comment cannot exceed 500 characters')
        .trim()
    ];
  }
  
  // Validation cho query parameters của teacher lessons
  static validateTeacherLessonsQuery() {
    return [
      query('teacherId')
        .notEmpty()
        .withMessage('Teacher ID is required')
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid teacher ID format');
          }
          return true;
        }),
      
      query('academicYear')
        .notEmpty()
        .withMessage('Academic year is required')
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid academic year ID format');
          }
          return true;
        }),
      
      query('requestType')
        .optional()
        .isIn(['swap', 'makeup'])
        .withMessage('Request type must be either swap or makeup'),
      
      query('startOfWeek')
        .notEmpty()
        .withMessage('Start of week is required')
        .isISO8601()
        .withMessage('Start of week must be a valid date'),
      
      query('endOfWeek')
        .notEmpty()
        .withMessage('End of week is required')
        .isISO8601()
        .withMessage('End of week must be a valid date')
        .custom((value, { req }) => {
          const startDate = new Date(req.query.startOfWeek);
          const endDate = new Date(value);
          
          if (endDate <= startDate) {
            throw new Error('End of week must be after start of week');
          }
          
          return true;
        })
    ];
  }
  
  // Validation cho available lessons query
  static validateAvailableLessonsQuery() {
    return [
      query('classId')
        .notEmpty()
        .withMessage('Class ID is required')
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid class ID format');
          }
          return true;
        }),
      
      query('academicYear')
        .notEmpty()
        .withMessage('Academic year is required')
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid academic year ID format');
          }
          return true;
        }),
      
      query('subjectId')
        .notEmpty()
        .withMessage('Subject ID is required')
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid subject ID format');
          }
          return true;
        }),
      
      query('startOfWeek')
        .notEmpty()
        .withMessage('Start of week is required')
        .isISO8601()
        .withMessage('Start of week must be a valid date'),
      
      query('endOfWeek')
        .notEmpty()
        .withMessage('End of week is required')
        .isISO8601()
        .withMessage('End of week must be a valid date')
        .custom((value, { req }) => {
          const startDate = new Date(req.query.startOfWeek);
          const endDate = new Date(value);
          
          if (endDate <= startDate) {
            throw new Error('End of week must be after start of week');
          }
          
          return true;
        })
    ];
  }
  
  // Validation cho request ID parameter
  static validateRequestId() {
    return [
      param('requestId')
        .notEmpty()
        .withMessage('Request ID is required')
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid request ID format');
          }
          return true;
        })
    ];
  }
  
  // Validation cho teacher requests query
  static validateTeacherRequestsQuery() {
    return [
      query('teacherId')
        .optional()
        .custom((value) => {
          if (value && !mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid teacher ID format');
          }
          return true;
        }),
      
      query('status')
        .optional()
        .isIn(['pending', 'approved', 'rejected'])
        .withMessage('Status must be one of: pending, approved, rejected'),
      
      query('requestType')
        .optional()
        .isIn(['swap', 'makeup'])
        .withMessage('Request type must be either swap or makeup'),
      
      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid date'),
      
      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid date')
        .custom((value, { req }) => {
          if (value && req.query.startDate) {
            const startDate = new Date(req.query.startDate);
            const endDate = new Date(value);
            
            if (endDate <= startDate) {
              throw new Error('End date must be after start date');
            }
          }
          
          return true;
        })
    ];
  }
  
  // Validation cho pending requests query
  static validatePendingRequestsQuery() {
    return [
      query('academicYear')
        .optional()
        .custom((value) => {
          if (value && !mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid academic year ID format');
          }
          return true;
        }),
      
      query('classId')
        .optional()
        .custom((value) => {
          if (value && !mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid class ID format');
          }
          return true;
        }),
      
      query('requestType')
        .optional()
        .isIn(['swap', 'makeup'])
        .withMessage('Request type must be either swap or makeup')
    ];
  }
}

module.exports = LessonRequestValidation; 