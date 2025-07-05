const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

class SubstituteRequestValidation {

  // Validation for creating substitute request
  validateCreateRequest() {
    return [
      body('lessonId')
        .notEmpty()
        .withMessage('Lesson ID is required')
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid lesson ID format');
          }
          return true;
        }),

      body('candidateTeachers')
        .isArray({ min: 1 })
        .withMessage('At least one candidate teacher is required')
        .custom((value) => {
          if (!Array.isArray(value)) {
            throw new Error('Candidate teachers must be an array');
          }
          
          // Check if all IDs are valid ObjectIds
          for (const teacherId of value) {
            if (!mongoose.Types.ObjectId.isValid(teacherId)) {
              throw new Error('Invalid teacher ID format in candidate teachers');
            }
          }
          
          // Check for duplicates
          const uniqueIds = [...new Set(value)];
          if (uniqueIds.length !== value.length) {
            throw new Error('Duplicate teacher IDs in candidate teachers');
          }
          
          return true;
        }),

      body('reason')
        .notEmpty()
        .withMessage('Reason is required')
        .isLength({ min: 10, max: 1000 })
        .withMessage('Reason must be between 10 and 1000 characters')
        .trim()
    ];
  }

  // Validation for rejecting request
  validateRejectRequest() {
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

      body('reason')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Rejection reason must not exceed 500 characters')
        .trim()
    ];
  }

  // Validation for request ID parameter
  validateRequestId() {
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

  // Validation for lesson ID parameter
  validateLessonId() {
    return [
      param('lessonId')
        .notEmpty()
        .withMessage('Lesson ID is required')
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid lesson ID format');
          }
          return true;
        })
    ];
  }

  // Validation for query parameters
  validateGetRequests() {
    return [
      query('status')
        .optional()
        .isIn(['pending', 'approved', 'rejected', 'cancelled'])
        .withMessage('Invalid status value'),

      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
    ];
  }

  // Validation for teacher role
  validateTeacherRole() {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!req.user.role.includes('teacher')) {
        return res.status(403).json({
          success: false,
          message: 'Teacher role required'
        });
      }

      next();
    };
  }

  // Validation for manager/admin role
  validateManagerRole() {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!req.user.role.includes('manager') && !req.user.role.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: 'Manager or admin role required'
        });
      }

      next();
    };
  }
}

module.exports = new SubstituteRequestValidation(); 