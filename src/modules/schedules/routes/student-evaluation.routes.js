const express = require('express');
const router = express.Router();
const studentEvaluationController = require('../controllers/student-evaluation.controller');
const authMiddleware = require('../../auth/middleware/auth.middleware');
const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');

// Middleware để validate input
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// Middleware để kiểm tra role student
const requireStudentRole = (req, res, next) => {
  if (!req.user.role.includes('student')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only students can access this endpoint.'
    });
  }
  next();
};

// POST /api/student-evaluations/lessons/:lessonId/evaluate
// Tạo đánh giá mới cho tiết học
router.post('/lessons/:lessonId/evaluate',
  authMiddleware.protect,
  requireStudentRole,
  [
    param('lessonId')
      .isMongoId()
      .withMessage('Lesson ID must be a valid MongoDB ObjectId'),
    
    body('teachingClarity')
      .isInt({ min: 1, max: 5 })
      .withMessage('Teaching clarity rating must be an integer between 1 and 5'),
    
    body('teachingSupport')
      .isInt({ min: 1, max: 5 })
      .withMessage('Teaching support rating must be an integer between 1 and 5'),
    
    body('teacherInteraction')
      .isInt({ min: 1, max: 5 })
      .withMessage('Teacher interaction rating must be an integer between 1 and 5'),
    
    body('completedWell')
      .isBoolean()
      .withMessage('Completed well must be a boolean value'),
    
    body('reason')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Reason must not exceed 200 characters'),
    
    body('comments')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Comments must not exceed 500 characters')
  ],
  validateRequest,
  studentEvaluationController.createEvaluation
);

// PUT /api/student-evaluations/:evaluationId
// Cập nhật đánh giá tiết học
router.put('/:evaluationId',
  authMiddleware.protect,
  requireStudentRole,
  [
    param('evaluationId')
      .isMongoId()
      .withMessage('Evaluation ID must be a valid MongoDB ObjectId'),
    
    body('teachingClarity')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Teaching clarity rating must be an integer between 1 and 5'),
    
    body('teachingSupport')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Teaching support rating must be an integer between 1 and 5'),
    
    body('teacherInteraction')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Teacher interaction rating must be an integer between 1 and 5'),
    
    body('completedWell')
      .optional()
      .isBoolean()
      .withMessage('Completed well must be a boolean value'),
    
    body('reason')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Reason must not exceed 200 characters'),
    
    body('comments')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Comments must not exceed 500 characters')
  ],
  validateRequest,
  studentEvaluationController.updateEvaluation
);

// GET /api/student-evaluations
// Lấy danh sách đánh giá của học sinh hiện tại
router.get('/',
  authMiddleware.protect,
  requireStudentRole,
  [
    query('classId')
      .optional()
      .isMongoId()
      .withMessage('Class ID must be a valid MongoDB ObjectId'),
    
    query('subjectId')
      .optional()
      .isMongoId()
      .withMessage('Subject ID must be a valid MongoDB ObjectId'),
    
    query('teacherId')
      .optional()
      .isMongoId()
      .withMessage('Teacher ID must be a valid MongoDB ObjectId'),
    
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be in ISO 8601 format'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be in ISO 8601 format'),
    
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  validateRequest,
  studentEvaluationController.getStudentEvaluations
);

// GET /api/student-evaluations/:evaluationId
// Lấy chi tiết một đánh giá
router.get('/:evaluationId',
  authMiddleware.protect,
  requireStudentRole,
  [
    param('evaluationId')
      .isMongoId()
      .withMessage('Evaluation ID must be a valid MongoDB ObjectId')
  ],
  validateRequest,
  studentEvaluationController.getEvaluationDetail
);

// GET /api/student-evaluations/lessons/:lessonId/can-evaluate
// Kiểm tra học sinh có thể đánh giá tiết học không
router.get('/lessons/:lessonId/can-evaluate',
  authMiddleware.protect,
  requireStudentRole,
  [
    param('lessonId')
      .isMongoId()
      .withMessage('Lesson ID must be a valid MongoDB ObjectId')
  ],
  validateRequest,
  studentEvaluationController.checkCanEvaluate
);

// GET /api/student-evaluations/lessons/evaluable
// Lấy danh sách tiết học có thể đánh giá
router.get('/lessons/evaluable',
  authMiddleware.protect,
  requireStudentRole,
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be in ISO 8601 format'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be in ISO 8601 format'),
    
    query('subjectId')
      .optional()
      .isMongoId()
      .withMessage('Subject ID must be a valid MongoDB ObjectId'),
    
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  validateRequest,
  studentEvaluationController.getEvaluableLessons
);

module.exports = router; 