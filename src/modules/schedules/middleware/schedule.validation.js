const { body, query, param, validationResult } = require('express-validator');

// Middleware để handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Validation cho khởi tạo thời khóa biểu cho tất cả lớp trong năm học
const validateInitializeSchedule = [
  body('academicYear')
    .notEmpty()
    .withMessage('Academic year is required')
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Academic year must be in format YYYY-YYYY (e.g., 2023-2024)')
    .custom((value) => {
      const [startYear, endYear] = value.split('-').map(Number);
      if (endYear - startYear !== 1) {
        throw new Error('Academic year must be consecutive years');
      }
      return true;
    }),
  
  body('gradeLevel')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value !== undefined && value !== null && value !== '') {
        if (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 12) {
          throw new Error('Grade level must be between 1 and 12');
        }
      }
      return true;
    }),
  
  body('semester')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value !== undefined && value !== null && value !== '') {
        if (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 2) {
          throw new Error('Semester must be 1 or 2');
        }
      }
      return true;
    }),
  
  handleValidationErrors
];

// Validation cho khởi tạo thời khóa biểu cho một lớp cụ thể
const validateInitializeClassSchedule = [
  body('classId')
    .notEmpty()
    .withMessage('Class ID is required')
    .isMongoId()
    .withMessage('Class ID must be a valid MongoDB ObjectId'),
  
  body('academicYear')
    .notEmpty()
    .withMessage('Academic year is required')
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Academic year must be in format YYYY-YYYY (e.g., 2023-2024)')
    .custom((value) => {
      const [startYear, endYear] = value.split('-').map(Number);
      if (endYear - startYear !== 1) {
        throw new Error('Academic year must be consecutive years');
      }
      return true;
    }),
  
  body('semester')
    .optional()
    .isInt({ min: 1, max: 2 })
    .withMessage('Semester must be 1 or 2'),
  
  handleValidationErrors
];

// Validation cho xem thời khóa biểu lớp
const validateGetClassSchedule = [
  query('className')
    .notEmpty()
    .withMessage('Class name is required')
    .isLength({ min: 2, max: 10 })
    .withMessage('Class name must be between 2-10 characters')
    .matches(/^[0-9]{1,2}[A-Z][0-9]*$/)
    .withMessage('Class name must be in format like 12A1, 11B2, etc.'),
  
  query('academicYear')
    .notEmpty()
    .withMessage('Academic year is required')
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Academic year must be in format YYYY-YYYY (e.g., 2023-2024)'),
  
  query('weekNumber')
    .optional()
    .isInt({ min: 1, max: 52 })
    .withMessage('Week number must be between 1 and 52'),
  
  query('startOfWeek')
    .optional()
    .isISO8601()
    .withMessage('Start of week must be a valid date (YYYY-MM-DD)'),
  
  query('endOfWeek')
    .optional()
    .isISO8601()
    .withMessage('End of week must be a valid date (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (value && req.query.startOfWeek) {
        const start = new Date(req.query.startOfWeek);
        const end = new Date(value);
        if (end <= start) {
          throw new Error('End of week must be after start of week');
        }
        // Kiểm tra không quá 7 ngày
        const diffDays = (end - start) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) {
          throw new Error('Date range cannot exceed 7 days');
        }
      }
      return true;
    }),
  
  // Validation logic: phải có weekNumber HOẶC (startOfWeek VÀ endOfWeek)
  query()
    .custom((value, { req }) => {
      const hasWeekNumber = req.query.weekNumber;
      const hasDateRange = req.query.startOfWeek && req.query.endOfWeek;
      
      if (!hasWeekNumber && !hasDateRange) {
        throw new Error('Either weekNumber or both startOfWeek and endOfWeek are required');
      }
      
      if (hasWeekNumber && hasDateRange) {
        throw new Error('Cannot use both weekNumber and date range parameters at the same time');
      }
      
      return true;
    }),
  
  handleValidationErrors
];

// Validation cho cập nhật trạng thái
const validateUpdateStatus = [
  param('id')
    .isMongoId()
    .withMessage('Invalid schedule ID'),
  
  body('status')
    .isIn(['draft', 'active', 'archived'])
    .withMessage('Status must be one of: draft, active, archived'),
  
  handleValidationErrors
];

// Validation cho tạo/cập nhật thời khóa biểu
const validateScheduleData = [
  body('class')
    .optional()
    .isMongoId()
    .withMessage('Invalid class ID'),
  
  body('academicYear')
    .optional()
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Academic year must be in format YYYY-YYYY'),
  
  body('semester')
    .optional()
    .isInt({ min: 1, max: 2 })
    .withMessage('Semester must be 1 or 2'),
  
  body('weekNumber')
    .optional()
    .isInt({ min: 1, max: 52 })
    .withMessage('Week number must be between 1 and 52'),
  
  body('totalPeriodsPerWeek')
    .optional()
    .isInt({ min: 30, max: 35 })
    .withMessage('Total periods per week must be between 30 and 35'),
  
  body('schedule')
    .optional()
    .isArray()
    .withMessage('Schedule must be an array'),
  
  body('schedule.*.dayOfWeek')
    .optional()
    .isInt({ min: 2, max: 7 })
    .withMessage('Day of week must be between 2 (Monday) and 7 (Saturday)'),
  
  body('schedule.*.dayName')
    .optional()
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
    .withMessage('Day name must be a valid weekday'),
  
  body('schedule.*.periods')
    .optional()
    .isArray()
    .withMessage('Periods must be an array'),
  
  body('schedule.*.periods.*.periodNumber')
    .optional()
    .isInt({ min: 1, max: 7 })
    .withMessage('Period number must be between 1 and 7'),
  
  body('schedule.*.periods.*.subject')
    .optional()
    .isMongoId()
    .withMessage('Invalid subject ID'),
  
  body('schedule.*.periods.*.teacher')
    .optional()
    .isMongoId()
    .withMessage('Invalid teacher ID'),
  
  body('schedule.*.periods.*.session')
    .optional()
    .isIn(['morning', 'afternoon'])
    .withMessage('Session must be morning or afternoon'),
  
  body('schedule.*.periods.*.timeStart')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time start must be in HH:MM format'),
  
  body('schedule.*.periods.*.timeEnd')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time end must be in HH:MM format'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  handleValidationErrors
];

// Validation cho query parameters chung
const validateCommonQuery = [
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
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Academic year must be in format YYYY-YYYY'),
  
  query('gradeLevel')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Grade level must be between 1 and 12'),
  
  query('status')
    .optional()
    .isIn(['draft', 'active', 'archived'])
    .withMessage('Status must be one of: draft, active, archived'),
  
  query('semester')
    .optional()
    .isInt({ min: 1, max: 2 })
    .withMessage('Semester must be 1 or 2'),
  
  query('className')
    .optional()
    .matches(/^[0-9]{1,2}[A-Z][0-9]*$/)
    .withMessage('Class name must be in format like 12A1, 11B2, etc.'),
  
  handleValidationErrors
];

// Validation cho MongoDB ObjectId parameters
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  
  handleValidationErrors
];

module.exports = {
  validateInitializeSchedule,
  validateInitializeClassSchedule,
  validateGetClassSchedule,
  validateUpdateStatus,
  validateScheduleData,
  validateCommonQuery,
  validateObjectId,
  handleValidationErrors
}; 