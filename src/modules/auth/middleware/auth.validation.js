const { body } = require('express-validator');
const { validationResult } = require('express-validator');

const validateAuth = {
  register: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email không được để trống')
      .isEmail()
      .withMessage('Email không đúng định dạng'),
    
    body('password')
      .trim()
      .notEmpty()
      .withMessage('Mật khẩu không được để trống')
      .isLength({ min: 6 })
      .withMessage('Mật khẩu phải có ít nhất 6 ký tự'),

    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg,
          errors: errors.array()
        });
      }
      next();
    }
  ],

  login: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email không được để trống')
      .isEmail()
      .withMessage('Email không đúng định dạng'),
    
    body('password')
      .trim()
      .notEmpty()
      .withMessage('Mật khẩu không được để trống'),

    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg,
          errors: errors.array()
        });
      }
      next();
    }
  ],

  changePassword: [
    body('currentPassword')
      .trim()
      .notEmpty()
      .withMessage('Vui lòng nhập mật khẩu hiện tại'),

    body('newPassword')
      .trim()
      .notEmpty()
      .withMessage('Vui lòng nhập mật khẩu mới')
      .isLength({ min: 8, max: 20 })
      .withMessage('Mật khẩu phải có độ dài từ 8-20 ký tự')
      .matches(/[!@#$%^&*(),.?":{}|<>\[\]\\/\-_+=~`';]/)
      .withMessage('Mật khẩu phải có ít nhất 1 ký tự đặc biệt')
      .matches(/[0-9]/)
      .withMessage('Mật khẩu phải có ít nhất 1 số')
      .matches(/[A-Z]/)
      .withMessage('Mật khẩu phải có ít nhất 1 chữ cái viết hoa'),

    body('confirmPassword')
      .trim()
      .notEmpty()
      .withMessage('Vui lòng xác nhận mật khẩu mới')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Xác nhận mật khẩu không khớp');
        }
        return true;
      }),

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

  forgotPassword: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email không được để trống')
      .isEmail()
      .withMessage('Email không đúng định dạng'),

    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg,
          errors: errors.array()
        });
      }
      next();
    }
  ]
};

module.exports = validateAuth; 