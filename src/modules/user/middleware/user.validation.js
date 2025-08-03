const { body, param } = require('express-validator');
const { validationResult } = require('express-validator');
const { protect, authorize } = require('../../auth/middleware/auth.middleware');

const validateUser = {
  createUser: [
    protect,
    authorize('manager'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please enter a valid email'),
    
    body('password')
      .trim()
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),

    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required'),

    body('role')
      .isArray()
      .withMessage('Role must be an array')
      .notEmpty()
      .withMessage('Role is required'),

    body('role.*')
      .isIn(['student', 'teacher', 'homeroom_teacher', 'admin', 'manager'])
      .withMessage('Invalid role'),

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

  createStudent: [
    protect,
    authorize('manager'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),

    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please enter a valid email'),

    body('studentId')
      .trim()
      .notEmpty()
      .withMessage('Student ID is required')
      .matches(/^[A-Z0-9]+$/)
      .withMessage('Student ID must contain only uppercase letters and numbers')
      .isLength({ min: 4, max: 20 })
      .withMessage('Student ID must be between 4 and 20 characters'),

    body('className')
      .trim()
      .notEmpty()
      .withMessage('Class name is required')
      .isLength({ min: 1, max: 50 })
      .withMessage('Class name must be between 1 and 50 characters'),

    body('academicYear')
      .optional()
      .trim()
      .matches(/^\d{4}-\d{4}$/)
      .withMessage('Academic year must be in format YYYY-YYYY (e.g., 2024-2025)'),

    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Date of birth must be in ISO 8601 format (YYYY-MM-DD)')
      .custom((value) => {
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 5 || age > 25) {
          throw new Error('Student age must be between 5 and 25 years');
        }
        return true;
      }),

    body('gender')
      .optional()
      .trim()
      .isIn(['male', 'female', 'other'])
      .withMessage('Gender must be male, female, or other'),

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

  createTeacher: [
    protect,
    authorize('manager'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),

    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please enter a valid email'),

    body('subjectId')
      .notEmpty()
      .withMessage('Subject ID is required')
      .isMongoId()
      .withMessage('Subject ID must be a valid MongoDB ObjectId'),

    body('role')
      .optional()
      .trim()
      .isIn(['teacher', 'homeroom_teacher'])
      .withMessage('Role must be teacher or homeroom_teacher'),

    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Date of birth must be in ISO 8601 format (YYYY-MM-DD)')
      .custom((value) => {
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 22 || age > 70) {
          throw new Error('Teacher age must be between 22 and 70 years');
        }
        return true;
      }),

    body('gender')
      .optional()
      .trim()
      .isIn(['male', 'female', 'other'])
      .withMessage('Gender must be male, female, or other'),

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

  createUserWithOTP: [
    protect,
    authorize('manager'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please enter a valid email'),

    body('role')
      .trim()
      .notEmpty()
      .withMessage('Role is required')
      .isIn(['student', 'teacher'])
      .withMessage('Role must be student or teacher'),

    body('name')
      .if(body('role').equals('teacher'))
      .trim()
      .notEmpty()
      .withMessage('Name is required for teacher')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),

    body('subjectId')
      .if(body('role').equals('teacher'))
      .notEmpty()
      .withMessage('Subject ID is required for teacher')
      .isMongoId()
      .withMessage('Subject ID must be a valid MongoDB ObjectId'),

    body('dateOfBirth')
      .if(body('role').equals('teacher'))
      .optional()
      .isISO8601()
      .withMessage('Date of birth must be in ISO 8601 format (YYYY-MM-DD)')
      .custom((value) => {
        if (value) {
          const birthDate = new Date(value);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          if (age < 22 || age > 70) {
            throw new Error('Teacher age must be between 22 and 70 years');
          }
        }
        return true;
      }),

    body('gender')
      .if(body('role').equals('teacher'))
      .optional()
      .trim()
      .isIn(['male', 'female', 'other'])
      .withMessage('Gender must be male, female, or other'),

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

  updateUser: [
    param('id')
      .isMongoId()
      .withMessage('Invalid user ID'),

    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Please enter a valid email'),

    body('password')
      .optional()
      .trim()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),

    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty'),

    body('role')
      .optional()
      .isArray()
      .withMessage('Role must be an array'),

    body('role.*')
      .optional()
      .isIn(['student', 'teacher', 'homeroom_teacher', 'admin', 'manager'])
      .withMessage('Invalid role'),

    body('subject')
      .optional()
      .isMongoId()
      .withMessage('Subject must be a valid MongoDB ObjectId'),

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

  updateUserStatus: [
    param('id')
      .isMongoId()
      .withMessage('Invalid user ID'),

    body('active')
      .isBoolean()
      .withMessage('Active must be a boolean'),

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

  setPassword: [
    body('password')
      .trim()
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

    body('confirmPassword')
      .trim()
      .notEmpty()
      .withMessage('Confirm password is required')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),

    body('tempToken')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Token cannot be empty if provided'),

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

  createParent: [
    protect,
    authorize('manager'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),

    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Please enter a valid email'),

    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^[0-9+\-\s()]+$/)
      .withMessage('Phone number must contain only numbers, spaces, hyphens, and parentheses')
      .isLength({ min: 10, max: 15 })
      .withMessage('Phone number must be between 10 and 15 characters'),

    body('childrenIds')
      .isArray({ min: 1 })
      .withMessage('Children IDs must be a non-empty array')
      .custom((value) => {
        if (!value.every(id => /^[0-9a-fA-F]{24}$/.test(id))) {
          throw new Error('All children IDs must be valid MongoDB ObjectIds');
        }
        return true;
      }),

    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Date of birth must be in ISO 8601 format (YYYY-MM-DD)')
      .custom((value) => {
        if (value) {
          const birthDate = new Date(value);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          if (age < 18 || age > 80) {
            throw new Error('Parent age must be between 18 and 80 years');
          }
        }
        return true;
      }),

    body('gender')
      .optional()
      .trim()
      .isIn(['male', 'female', 'other'])
      .withMessage('Gender must be male, female, or other'),

    body('address')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Address must not exceed 500 characters'),

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

  // Validation cho API quản lý tài khoản
  getAccountsForManagement: [
    protect,
    authorize('admin', 'manager'),
    (req, res, next) => {
      const { role, gradeLevel } = req.query;
      
      // Validate role
      if (role && !['student', 'teacher'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Role phải là student hoặc teacher'
        });
      }

      // Validate gradeLevel
      if (gradeLevel && ![10, 11, 12].includes(parseInt(gradeLevel))) {
        return res.status(400).json({
          success: false,
          message: 'Khối học phải là 10, 11 hoặc 12'
        });
      }

      next();
    }
  ],

  getClassesByGrade: [
    protect,
    authorize('admin', 'manager'),
    (req, res, next) => {
      const { gradeLevel } = req.query;
      
      if (!gradeLevel) {
        return res.status(400).json({
          success: false,
          message: 'Khối học là bắt buộc'
        });
      }

      if (![10, 11, 12].includes(parseInt(gradeLevel))) {
        return res.status(400).json({
          success: false,
          message: 'Khối học phải là 10, 11 hoặc 12'
        });
      }

      next();
    }
  ],

  getAccountDetail: [
    protect,
    authorize('admin', 'manager'),
    param('id')
      .isMongoId()
      .withMessage('ID tài khoản không hợp lệ'),

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

  updatePersonalInfo: [
    protect,
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Tên phải có từ 2 đến 100 ký tự'),

    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Ngày sinh phải có định dạng YYYY-MM-DD')
      .custom((value) => {
        if (value) {
          const birthDate = new Date(value);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          if (age < 5 || age > 80) {
            throw new Error('Tuổi phải từ 5 đến 80');
          }
        }
        return true;
      }),

    body('gender')
      .optional()
      .trim()
      .isIn(['male', 'female', 'other'])
      .withMessage('Giới tính phải là male, female hoặc other'),

    body('phone')
      .optional()
      .trim()
      .matches(/^[0-9+\-\s()]+$/)
      .withMessage('Số điện thoại chỉ được chứa số, dấu cách, dấu gạch ngang và dấu ngoặc')
      .isLength({ min: 10, max: 15 })
      .withMessage('Số điện thoại phải có từ 10 đến 15 ký tự'),

    body('address')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Địa chỉ không được vượt quá 500 ký tự'),

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

module.exports = { validateUser }; 