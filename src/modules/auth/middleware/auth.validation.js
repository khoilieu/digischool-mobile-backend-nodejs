const { body } = require('express-validator');
const { validationResult } = require('express-validator');

const validateAuth = {
  register: [
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

  login: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please enter a valid email'),
    
    body('password')
      .trim()
      .notEmpty()
      .withMessage('Password is required'),

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
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please enter a valid email'),

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

module.exports = validateAuth; 