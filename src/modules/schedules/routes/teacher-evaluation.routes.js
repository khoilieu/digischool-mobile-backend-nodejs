const express = require('express');
const router = express.Router();
const teacherEvaluationController = require('../controllers/teacher-evaluation.controller');
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

// Middleware để kiểm tra role teacher
const requireTeacherRole = (req, res, next) => {
  if (!req.user.role.includes('teacher') && !req.user.role.includes('homeroom_teacher') && !req.user.role.includes('admin') && !req.user.role.includes('manager')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only teachers can access this endpoint.'
    });
  }
  next();
};

// POST /api/teacher-evaluations/lessons/:lessonId/evaluate
// Tạo đánh giá mới cho tiết học
router.post('/lessons/:lessonId/evaluate',
  authMiddleware.protect,
  requireTeacherRole,
  [
    param('lessonId')
      .isMongoId()
      .withMessage('Lesson ID must be a valid MongoDB ObjectId'),
    
    body('curriculumLesson')
      .notEmpty()
      .withMessage('Curriculum lesson is required')
      .isLength({ max: 100 })
      .withMessage('Curriculum lesson must not exceed 100 characters'),
    
    body('content')
      .notEmpty()
      .withMessage('Content is required')
      .isLength({ max: 1000 })
      .withMessage('Content must not exceed 1000 characters'),
    
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    
    body('rating')
      .isIn(['A+', 'A', 'B+', 'B', 'C'])
      .withMessage('Rating must be one of: A+, A, B+, B, C'),
    
    body('comments')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Comments must not exceed 1000 characters'),
    
    body('evaluationDetails')
      .optional()
      .isObject()
      .withMessage('Evaluation details must be an object'),
    
    body('absentStudents')
      .optional()
      .isArray()
      .withMessage('Absent students must be an array'),
    
    body('absentStudents.*.student')
      .optional()
      .isMongoId()
      .withMessage('Student ID must be a valid MongoDB ObjectId'),
    
    body('absentStudents.*.isExcused')
      .optional()
      .isBoolean()
      .withMessage('Is excused must be a boolean'),
    
    body('absentStudents.*.reason')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Reason must not exceed 200 characters'),
    
    body('oralTests')
      .optional()
      .isArray()
      .withMessage('Oral tests must be an array'),
    
    body('oralTests.*.student')
      .optional()
      .isMongoId()
      .withMessage('Student ID must be a valid MongoDB ObjectId'),
    
    body('oralTests.*.score')
      .optional()
      .isFloat({ min: 0, max: 10 })
      .withMessage('Score must be a number between 0 and 10'),
    
    body('violations')
      .optional()
      .isArray()
      .withMessage('Violations must be an array'),
    
    body('violations.*.student')
      .optional()
      .isMongoId()
      .withMessage('Student ID must be a valid MongoDB ObjectId'),
    
    body('violations.*.description')
      .optional()
      .notEmpty()
      .withMessage('Violation description is required')
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters')
  ],
  validateRequest,
  teacherEvaluationController.createEvaluation
);

// PUT /api/teacher-evaluations/:evaluationId
// Cập nhật đánh giá tiết học
router.put('/:evaluationId',
  authMiddleware.protect,
  requireTeacherRole,
  [
    param('evaluationId')
      .isMongoId()
      .withMessage('Evaluation ID must be a valid MongoDB ObjectId'),
    
    body('curriculumLesson')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Curriculum lesson must not exceed 100 characters'),
    
    body('content')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Content must not exceed 1000 characters'),
    
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    
    body('rating')
      .optional()
      .isIn(['A+', 'A', 'B+', 'B', 'C'])
      .withMessage('Rating must be one of: A+, A, B+, B, C'),
    
    body('comments')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Comments must not exceed 1000 characters'),
    
    body('evaluationDetails')
      .optional()
      .isObject()
      .withMessage('Evaluation details must be an object'),
    
    body('absentStudents')
      .optional()
      .isArray()
      .withMessage('Absent students must be an array'),
    
    body('oralTests')
      .optional()
      .isArray()
      .withMessage('Oral tests must be an array'),
    
    body('violations')
      .optional()
      .isArray()
      .withMessage('Violations must be an array')
  ],
  validateRequest,
  teacherEvaluationController.updateEvaluation
);

// GET /api/teacher-evaluations
// Lấy danh sách đánh giá của giáo viên hiện tại
router.get('/',
  authMiddleware.protect,
  requireTeacherRole,
  [
    query('classId')
      .optional()
      .isMongoId()
      .withMessage('Class ID must be a valid MongoDB ObjectId'),
    
    query('subjectId')
      .optional()
      .isMongoId()
      .withMessage('Subject ID must be a valid MongoDB ObjectId'),
    
    query('status')
      .optional()
      .isIn(['draft', 'completed', 'submitted'])
      .withMessage('Status must be one of: draft, completed, submitted'),
    
    query('rating')
      .optional()
      .isIn(['A+', 'A', 'B+', 'B', 'C'])
      .withMessage('Rating must be one of: A+, A, B+, B, C'),
    
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
  teacherEvaluationController.getTeacherEvaluations
);

// GET /api/teacher-evaluations/:evaluationId
// Lấy chi tiết một đánh giá
router.get('/:evaluationId',
  authMiddleware.protect,
  requireTeacherRole,
  [
    param('evaluationId')
      .isMongoId()
      .withMessage('Evaluation ID must be a valid MongoDB ObjectId')
  ],
  validateRequest,
  teacherEvaluationController.getEvaluationDetail
);

// POST /api/teacher-evaluations/:evaluationId/complete
// Hoàn thành đánh giá
router.post('/:evaluationId/complete',
  authMiddleware.protect,
  requireTeacherRole,
  [
    param('evaluationId')
      .isMongoId()
      .withMessage('Evaluation ID must be a valid MongoDB ObjectId')
  ],
  validateRequest,
  teacherEvaluationController.completeEvaluation
);

// POST /api/teacher-evaluations/:evaluationId/submit
// Submit đánh giá
router.post('/:evaluationId/submit',
  authMiddleware.protect,
  requireTeacherRole,
  [
    param('evaluationId')
      .isMongoId()
      .withMessage('Evaluation ID must be a valid MongoDB ObjectId')
  ],
  validateRequest,
  teacherEvaluationController.submitEvaluation
);

// POST /api/teacher-evaluations/:evaluationId/absent-students
// Thêm học sinh vắng
router.post('/:evaluationId/absent-students',
  authMiddleware.protect,
  requireTeacherRole,
  [
    param('evaluationId')
      .isMongoId()
      .withMessage('Evaluation ID must be a valid MongoDB ObjectId'),
    
    body('studentId')
      .isMongoId()
      .withMessage('Student ID must be a valid MongoDB ObjectId'),
    
    body('isExcused')
      .optional()
      .isBoolean()
      .withMessage('Is excused must be a boolean'),
    
    body('reason')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Reason must not exceed 200 characters')
  ],
  validateRequest,
  teacherEvaluationController.addAbsentStudent
);

// POST /api/teacher-evaluations/:evaluationId/oral-tests
// Thêm kiểm tra miệng
router.post('/:evaluationId/oral-tests',
  authMiddleware.protect,
  requireTeacherRole,
  [
    param('evaluationId')
      .isMongoId()
      .withMessage('Evaluation ID must be a valid MongoDB ObjectId'),
    
    body('studentId')
      .isMongoId()
      .withMessage('Student ID must be a valid MongoDB ObjectId'),
    
    body('score')
      .isFloat({ min: 0, max: 10 })
      .withMessage('Score must be a number between 0 and 10'),
    
    body('question')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Question must not exceed 500 characters'),
    
    body('comment')
      .optional()
      .isLength({ max: 300 })
      .withMessage('Comment must not exceed 300 characters')
  ],
  validateRequest,
  teacherEvaluationController.addOralTest
);

// POST /api/teacher-evaluations/:evaluationId/violations
// Thêm vi phạm
router.post('/:evaluationId/violations',
  authMiddleware.protect,
  requireTeacherRole,
  [
    param('evaluationId')
      .isMongoId()
      .withMessage('Evaluation ID must be a valid MongoDB ObjectId'),
    
    body('studentId')
      .isMongoId()
      .withMessage('Student ID must be a valid MongoDB ObjectId'),
    
    body('description')
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    
    body('type')
      .optional()
      .isIn(['late', 'disruptive', 'unprepared', 'disrespectful', 'cheating', 'other'])
      .withMessage('Type must be one of: late, disruptive, unprepared, disrespectful, cheating, other'),
    
    body('severity')
      .optional()
      .isIn(['minor', 'moderate', 'serious'])
      .withMessage('Severity must be one of: minor, moderate, serious'),
    
    body('action')
      .optional()
      .isLength({ max: 300 })
      .withMessage('Action must not exceed 300 characters')
  ],
  validateRequest,
  teacherEvaluationController.addViolation
);

// GET /api/teacher-evaluations/stats
// Lấy thống kê đánh giá của giáo viên
router.get('/stats/summary',
  authMiddleware.protect,
  requireTeacherRole,
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
    
    query('classId')
      .optional()
      .isMongoId()
      .withMessage('Class ID must be a valid MongoDB ObjectId')
  ],
  validateRequest,
  teacherEvaluationController.getEvaluationStats
);

module.exports = router;