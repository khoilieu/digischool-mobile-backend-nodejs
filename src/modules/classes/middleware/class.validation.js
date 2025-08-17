const { body, param, query } = require('express-validator');

// Validation cho tạo lớp học
const validateCreateClass = [
  body('className')
    .notEmpty()
    .withMessage('Class name is required')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Class name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_À-ỹ]+$/)
    .withMessage('Class name can only contain letters, numbers, spaces, hyphens, and underscores'),

  body('academicYear')
    .notEmpty()
    .withMessage('Academic year is required')
    .custom((value) => {
      // Chấp nhận cả ObjectId và string format
      if (require('mongoose').Types.ObjectId.isValid(value)) {
        return true; // ObjectId hợp lệ
      }
      
      // Kiểm tra string format
      if (!/^\d{4}-\d{4}$/.test(value)) {
        throw new Error('Academic year must be in format YYYY-YYYY (e.g., 2023-2024) or valid ObjectId');
      }
      
      const [startYear, endYear] = value.split('-').map(Number);
      if (endYear !== startYear + 1) {
        throw new Error('Academic year must be consecutive years (e.g., 2023-2024)');
      }
      const currentYear = new Date().getFullYear();
      if (startYear < currentYear - 5 || startYear > currentYear + 5) {
        throw new Error('Academic year must be within reasonable range');
      }
      return true;
    }),

  body('homeroomTeacherId')
    .notEmpty()
    .withMessage('Homeroom teacher ID is required')
    .isMongoId()
    .withMessage('Invalid homeroom teacher ID format')
];

// Validation cho cập nhật lớp học
const validateUpdateClass = [
  param('id')
    .isMongoId()
    .withMessage('Invalid class ID format'),

  body('className')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Class name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_À-ỹ]+$/)
    .withMessage('Class name can only contain letters, numbers, spaces, hyphens, and underscores'),

  body('academicYear')
    .optional()
    .custom((value) => {
      if (value) {
        // Chấp nhận cả ObjectId và string format
        if (require('mongoose').Types.ObjectId.isValid(value)) {
          return true; // ObjectId hợp lệ
        }
        
        // Kiểm tra string format
        if (!/^\d{4}-\d{4}$/.test(value)) {
          throw new Error('Academic year must be in format YYYY-YYYY (e.g., 2023-2024) or valid ObjectId');
        }
        
        const [startYear, endYear] = value.split('-').map(Number);
        if (endYear !== startYear + 1) {
          throw new Error('Academic year must be consecutive years (e.g., 2023-2024)');
        }
        const currentYear = new Date().getFullYear();
        if (startYear < currentYear - 5 || startYear > currentYear + 5) {
          throw new Error('Academic year must be within reasonable range');
        }
      }
      return true;
    }),

  body('homeroomTeacherId')
    .optional()
    .isMongoId()
    .withMessage('Invalid homeroom teacher ID format'),

  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean value')
];

// Validation cho lấy danh sách lớp học
const validateGetClasses = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('academicYear')
    .optional()
    .custom((value) => {
      if (value) {
        // Chấp nhận cả ObjectId và string format
        if (require('mongoose').Types.ObjectId.isValid(value)) {
          return true; // ObjectId hợp lệ
        }
        
        // Kiểm tra string format
        if (!/^\d{4}-\d{4}$/.test(value)) {
          throw new Error('Academic year must be in format YYYY-YYYY (e.g., 2023-2024) or valid ObjectId');
        }
      }
      return true;
    }),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),

  query('active')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Active filter must be "true" or "false"')
];

// Validation cho lấy chi tiết lớp học
const validateGetClassById = [
  param('id')
    .isMongoId()
    .withMessage('Invalid class ID format')
];

// Validation cho xóa lớp học
const validateDeleteClass = [
  param('id')
    .isMongoId()
    .withMessage('Invalid class ID format')
];

// Validation cho lấy danh sách giáo viên có thể làm chủ nhiệm
const validateGetAvailableTeachers = [
  query('academicYear')
    .notEmpty()
    .withMessage('Academic year is required')
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Academic year must be in format YYYY-YYYY (e.g., 2023-2024)')
];

module.exports = {
  validateCreateClass,
  validateUpdateClass,
  validateGetClasses,
  validateGetClassById,
  validateDeleteClass,
  validateGetAvailableTeachers
}; 